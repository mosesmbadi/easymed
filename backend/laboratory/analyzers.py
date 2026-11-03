"""
Results from lab analyzers, as forwarded by the LIS server (hl7_astm_parser).

The LIS server only speaks the analyzers' protocols. It posts each message
here as it came: which machine sent it, the sample code, and the raw results
under the analyzer's own codes. Everything about where a result belongs is
decided here, against data the lab manages from the UI:

- The analyzer is recognised by the sender ID it puts in its messages.
- Its codes are translated through that analyzer's test mappings, which point
  at test panels rather than panel names. A code with no mapping falls back to
  a panel of the same name among the tests requested on the sample, and the
  match is saved as a mapping so it shows up, and can be corrected, in Lab
  Settings.
- The sample code finds the patient's requested tests.

Every message is stored before any of that is tried. A result that cannot be
placed -- no sample code, sample not registered yet, code not mapped, test not
requested -- waits in the Analyzer Inbox instead of being dropped, and is
retried when the cause is fixed: a mapping saved for its code, or the right
sample assigned to it.
"""
import logging

from django.db import transaction

from .models import (
    AnalyzerMessage, AnalyzerResult, AnalyzerTestMapping, LabEquipment,
    LabTestRequestPanel, PatientSample,
)

logger = logging.getLogger(__name__)

Status = AnalyzerResult.Status
RESULT_MAX_LENGTH = LabTestRequestPanel._meta.get_field('result').max_length


def _clip(value, field):
    """Analyzers pad and overrun; keep what fits rather than refuse the message."""
    max_length = AnalyzerResult._meta.get_field(field).max_length
    return str(value or '').strip()[:max_length]


def find_equipment(equipment_id=None, sender=''):
    if equipment_id:
        return LabEquipment.objects.filter(id=equipment_id).first()
    sender = (sender or '').strip()
    if sender:
        return LabEquipment.objects.filter(sender_id__iexact=sender, is_active=True).first()
    return None


@transaction.atomic
def receive_message(data):
    """Store an analyzer message and post every result that can be placed."""
    equipment = find_equipment(data.get('equipment'), data.get('sender'))
    message = AnalyzerMessage.objects.create(
        equipment=equipment,
        sender=(data.get('sender') or '').strip()[:100],
        sample_code=(data.get('sample_code') or '').strip()[:100],
        patient_name=(data.get('patient_name') or '').strip()[:255],
        raw_message=data.get('raw_message') or '',
    )
    for item in data.get('results', []):
        result = AnalyzerResult(
            message=message,
            analyzer_code=_clip(item.get('code'), 'analyzer_code'),
            value=_clip(item.get('value'), 'value'),
            unit=_clip(item.get('unit'), 'unit'),
            flag=_clip(item.get('flag'), 'flag'),
            reference_range=_clip(item.get('reference_range'), 'reference_range'),
        )
        apply_result(result)
    return message


def apply_result(result, user=None):
    """
    Try to post one result onto the test it belongs to, and record the outcome.

    Each attempt runs in its own savepoint: a result that fails to save is
    filed as invalid without taking the rest of the message with it.
    """
    try:
        with transaction.atomic():
            status, detail, run = _place(result)
    except Exception as exc:  # the panel's own save (interpretation, stock) failed
        logger.exception("Could not post analyzer result %s", result.analyzer_code)
        status, detail, run = Status.INVALID, f"Could not save the result: {exc}"[:255], None

    result.status = status
    result.detail = detail[:255]
    result.lab_test_request_panel = run
    if status == Status.POSTED and user is not None:
        result.resolved_by = user
    result.save()
    return result


def _mapping_for(result):
    equipment_id = result.message.equipment_id
    if not equipment_id:
        return None
    return (AnalyzerTestMapping.objects
            .filter(equipment_id=equipment_id, analyzer_code__iexact=result.analyzer_code)
            .select_related('test_panel')
            .first())


def _place(result):
    """Returns (status, detail, lab test request panel posted to)."""
    message = result.message
    if message.equipment_id is None and message.sender:
        # The analyzer may have been given its sender ID since this arrived.
        equipment = find_equipment(sender=message.sender)
        if equipment:
            message.equipment = equipment
            message.save(update_fields=['equipment'])
    mapping = _mapping_for(result)

    # Checked before the sample: a code nobody imports should not sit in the
    # inbox just because the sample code was missing too.
    if mapping and mapping.test_panel is None:
        return Status.IGNORED, "Set not to import for this analyzer", None

    sample_code = message.sample_code.strip()
    if not sample_code:
        return Status.NO_SAMPLE, "The analyzer sent no sample code. Assign the sample.", None

    sample = PatientSample.objects.filter(patient_sample_code__iexact=sample_code).first()
    if sample is None:
        return Status.SAMPLE_NOT_FOUND, f"No sample {sample_code} in EasyMed", None

    runs = list(LabTestRequestPanel.objects
                .filter(patient_sample=sample)
                .select_related('test_panel')
                .order_by('id'))

    if mapping:
        panel = mapping.test_panel
        matches = [run for run in runs if run.test_panel_id == panel.id]
        if not matches:
            return Status.NOT_REQUESTED, f"{panel.name} was not requested on {sample.patient_sample_code}", None
    else:
        code = result.analyzer_code.lower()
        matches = [run for run in runs if (run.test_panel.name or '').strip().lower() == code]
        if not matches:
            if not message.equipment_id:
                sender = f" ({message.sender})" if message.sender else ""
                return (Status.UNMAPPED,
                        f"Analyzer not recognised{sender}. Set its sender ID in Lab Settings, then map the code.",
                        None)
            return Status.UNMAPPED, "No test panel mapped to this code", None
        if len({run.test_panel_id for run in matches}) > 1:
            return Status.UNMAPPED, "Several requested panels have this name. Map the code.", None
        panel = matches[0].test_panel
        if message.equipment_id:
            # Make the name match explicit, so it is visible in Lab Settings
            # and keeps working if the panel is renamed.
            AnalyzerTestMapping.objects.get_or_create(
                equipment_id=message.equipment_id, analyzer_code=result.analyzer_code,
                defaults={'test_panel': panel})

    if not result.value:
        return Status.INVALID, "The analyzer sent no value", None
    if len(result.value) > RESULT_MAX_LENGTH:
        return Status.INVALID, f"Value is longer than {RESULT_MAX_LENGTH} characters", None

    pending = [run for run in matches if not run.result_approved]
    if not pending:
        return (Status.ALREADY_APPROVED,
                f"{panel.name} on {sample.patient_sample_code} is already approved; not overwritten", None)

    run = pending[0]
    previous = run.result
    run.result = result.value
    run.save()

    detail = f"Posted to {panel.name}"
    if previous and previous != result.value:
        detail += f" (replaced {previous})"
    return Status.POSTED, detail, run


def retry(results, user=None):
    """Retry results that are still open; closed ones are left alone."""
    retried = []
    for result in results:
        if result.is_open:
            retried.append(apply_result(result, user))
    return retried


def open_results():
    return AnalyzerResult.objects.exclude(status__in=AnalyzerResult.CLOSED_STATUSES)


def retry_for_mapping(mapping, user=None):
    """A mapping was saved: retry the results that were waiting on its code."""
    waiting = (open_results()
               .filter(message__equipment_id=mapping.equipment_id,
                       analyzer_code__iexact=mapping.analyzer_code)
               .select_related('message'))
    return retry(waiting, user)


@transaction.atomic
def assign_sample(message, sample_code, user=None):
    """Point a message at the right sample and retry its open results."""
    message.sample_code = sample_code.strip()
    message.save(update_fields=['sample_code'])
    return retry(message.results.select_related('message'), user)


def ignore(result, user=None):
    result.status = Status.IGNORED
    result.detail = "Ignored by user"
    result.resolved_by = user
    result.save(update_fields=['status', 'detail', 'resolved_by', 'updated_at'])
    return result
