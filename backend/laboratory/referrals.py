"""
Samples another facility sends in: a clinic draws the blood, fills in a
request form and sends the tubes in a cool box. Nobody walks up to the
counter, nobody pays at the till.

Each patient in the box becomes a lab visit of their own (laboratory.walk_in),
billed to the sending facility's account -- so the tests go straight to the
bench, and the facility settles monthly against its statement. A sample that
arrives unusable is recorded, turned away and not charged for; the facility
is told so it can redraw.
"""
from django.db import transaction
from django.utils import timezone

from billing.models import PaymentMode
from patient.models import Patient

from .models import PatientSample, SampleConsignment
from .walk_in import create_lab_visit

REFERRED_REASON = "Referred sample"


def find_or_register(facility, entry):
    """
    The patient for one line of the request form: picked by id, found by the
    facility's own number for them, or registered.
    """
    if entry.get('patient'):
        return entry['patient']
    reference = (entry.get('external_reference') or '').strip()
    if reference:
        known = Patient.objects.filter(referred_from=facility, external_id=reference).first()
        if known:
            return known
    details = dict(entry['new_patient'])
    return Patient.objects.create(referred_from=facility, external_id=reference, **details)


@transaction.atomic
def receive_consignment(*, facility, received_by, entries, received_at=None,
                        courier='', note='', request_form=None):
    """
    Book in a consignment. `entries` are dicts: `patient` or `new_patient`,
    `panels`, and optionally `external_reference`, `referring_doctor`,
    `collected_at`, `collected_by`, `condition` and `rejection_reason`.
    Returns the SampleConsignment.

    All or nothing: if a test can't be billed (no reagent), nothing is kept,
    so the box can be booked in again once the reagent is received.
    """
    received_at = received_at or timezone.now()
    consignment = SampleConsignment.objects.create(
        facility=facility, received_by=received_by, received_at=received_at,
        courier=courier or '', note=note or '', request_form=request_form)
    payment_mode = PaymentMode.objects.filter(insurance=facility).first()

    for entry in entries:
        rejected = bool(entry.get('rejection_reason'))
        patient = find_or_register(facility, entry)
        visit = create_lab_visit(
            panels=entry['panels'],
            requested_by=received_by,
            patient=patient,
            reason=REFERRED_REASON,
            referring_doctor=entry.get('referring_doctor', ''),
            referring_facility=facility.name,
            payment_mode=payment_mode,
            bill=not rejected,
            consignment=consignment,
            external_reference=entry.get('external_reference', ''),
        )
        # The draw happened at the clinic: the samples arrive collected, with
        # no draw kit of ours spent on them.
        PatientSample.objects.filter(process=visit.process_test_req).update(
            is_sample_collected=True,
            collected_externally=True,
            collected_on=entry.get('collected_at') or received_at,
            collected_by=entry.get('collected_by', ''),
            received_on=received_at,
            condition=entry.get('condition') or PatientSample.Condition.ACCEPTABLE,
            rejected=rejected,
            rejection_reason=entry.get('rejection_reason', ''),
        )
        if rejected:
            transaction.on_commit(_notify_rejection(visit.id))
    return consignment


def _notify_rejection(visit_id):
    def send():
        from notifications.lab import notify_sample_rejected

        notify_sample_rejected(visit_id)
    return send
