"""
What the lab tells people: that results are ready, and that a sample sent in
can't be run.

Results go to whoever will act on them. A walk-in nobody here is treating
gets an SMS (and WhatsApp, if set up) saying their results are ready -- never
the results themselves, which stay off phones. A facility that sent a sample
in, or referred a walk-in, is emailed the report. A patient of our own
doctors hears from the doctor, so is not messaged.
"""
from company.models import Company, InsuranceCompany
from laboratory.models import LabTestRequest, LabTestRequestPanel, PatientSample
from patient.models import AttendanceProcess

from .models import OutboundMessage
from .services import queue


def results_complete(process_id):
    """Every test that is being run on this visit has an approved result."""
    runs = (LabTestRequestPanel.objects
            .filter(lab_test_request__process_id=process_id, is_billed=True)
            .exclude(patient_sample__rejected=True))
    return runs.exists() and not runs.filter(result_approved=False).exists()


def _lab_name():
    company = Company.current()
    return company.name if company else 'the laboratory'


def _referring_account(requests):
    for request in requests:
        if request.consignment_id:
            return request.consignment.facility
    names = {r.referring_facility for r in requests if r.referring_facility}
    if names:
        return InsuranceCompany.objects.filter(
            account_type=InsuranceCompany.AccountType.FACILITY, name__in=names).first()
    return None


def _their_reference(requests):
    return next((r.external_reference for r in requests if r.external_reference), '')


def notify_results_ready(process_id):
    if not results_complete(process_id):
        return
    visit = (AttendanceProcess.objects.select_related('patient')
             .filter(process_test_req_id=process_id).first())
    if visit is None:
        return
    patient = visit.patient
    requests = list(LabTestRequest.objects.select_related('consignment__facility')
                    .filter(process_id=process_id))
    sent_in = any(r.consignment_id for r in requests)
    lab = _lab_name()

    if not sent_in and visit.doctor_id is None and patient.phone:
        text = (f"Hello {patient.first_name}, your lab results at {lab} are ready. "
                f"Ref {visit.track_number}.")
        for channel in (OutboundMessage.Channel.SMS, OutboundMessage.Channel.WHATSAPP):
            queue(channel=channel, recipient=patient.phone, body=text, patient=patient,
                  dedupe_key=f"results-ready:{process_id}:{channel}")

    account = _referring_account(requests)
    if account and account.email:
        reference = _their_reference(requests)
        name = patient.display_name
        queue(
            channel=OutboundMessage.Channel.EMAIL, recipient=account.email, patient=patient,
            lab_results_id=process_id,
            subject=f"Lab results: {name}" + (f" ({reference})" if reference else ""),
            body=(f"Dear {account.contact_person or account.name},\n\n"
                  f"The results for {name}"
                  + (f", your reference {reference}," if reference else "")
                  + f" are attached.\n\n{lab}"),
            dedupe_key=f"results-ready:{process_id}:facility-email")


def notify_sample_rejected(visit_id):
    visit = AttendanceProcess.objects.select_related('patient').filter(pk=visit_id).first()
    if visit is None:
        return
    samples = list(PatientSample.objects.select_related('specimen')
                   .filter(process_id=visit.process_test_req_id, rejected=True))
    requests = list(LabTestRequest.objects.select_related('consignment__facility')
                    .filter(process_id=visit.process_test_req_id))
    account = _referring_account(requests)
    if not samples or account is None:
        return
    patient = visit.patient
    name = patient.display_name
    reference = _their_reference(requests)
    theirs = f" (your ref {reference})" if reference else ""
    lab = _lab_name()
    lines = []
    for sample in samples:
        line = f"- {sample.specimen.name}: {sample.get_condition_display() or 'rejected'}"
        if sample.rejection_reason:
            line += f" -- {sample.rejection_reason}"
        lines.append(line)
    if account.email:
        queue(channel=OutboundMessage.Channel.EMAIL, recipient=account.email, patient=patient,
              subject=f"Sample rejected: {name}",
              body=(f"The sample for {name}{theirs} could not be tested and was not charged:\n"
                    + "\n".join(lines) + f"\n\nPlease redraw and resend.\n{lab}"),
              dedupe_key=f"sample-rejected:{visit_id}:email")
    if account.phone:
        reason = samples[0].rejection_reason or samples[0].get_condition_display()
        queue(channel=OutboundMessage.Channel.SMS, recipient=account.phone, patient=patient,
              body=f"{lab}: sample for {name}{theirs} rejected, {reason}. Please redraw.",
              dedupe_key=f"sample-rejected:{visit_id}:sms")
