"""
A walk-in lab visit: a patient who comes to the bench with a referral, or
just asks for a test, without seeing one of our doctors.

It produces exactly what a doctor's lab order produces -- an AttendanceProcess
carrying the invoice and the ProcessTestRequest, a LabTestRequest per profile,
a LabTestRequestPanel per test and an invoice line per test -- so billing,
sample collection, results and the report all work on it unchanged. The only
differences are that it starts on the 'lab' track and records who referred
the patient instead of which of our doctors ordered it.

Done in one transaction. The doctor's modal builds the same records one request
at a time from the browser, so a dropped connection can leave a request with
half its panels and no invoice lines; this cannot.
"""
from collections import OrderedDict

from django.db import transaction

from billing.models import InvoiceItem
from patient.models import AttendanceProcess, Patient

from .models import LabTestRequest, LabTestRequestPanel

WALK_IN_REASON = "Walk-in lab request"


@transaction.atomic
def create_walk_in_visit(*, panels, requested_by, patient=None, new_patient=None,
                         referring_doctor='', referring_facility='', note='',
                         payment_mode=None):
    """
    `panels` is a list of LabTestPanel, already validated to carry a billing
    item. Pass either an existing `patient` or `new_patient`, a dict of
    Patient fields. Returns the AttendanceProcess.
    """
    if patient is None:
        patient = Patient.objects.create(**new_patient)

    visit = AttendanceProcess(
        patient=patient,
        reason=WALK_IN_REASON,
        track='lab',
        created_by=requested_by,
    )
    visit.save()

    # One LabTestRequest per profile, as the doctor's modal does: the lab
    # queue, the result screens and the report all group by it.
    by_profile = OrderedDict()
    for panel in panels:
        by_profile.setdefault(panel.test_profile_id, []).append(panel)

    for profile_id, profile_panels in by_profile.items():
        request = LabTestRequest.objects.create(
            process=visit.process_test_req,
            test_profile_id=profile_id,
            note=note or None,
            requested_by=requested_by,
            referring_doctor=referring_doctor or None,
            referring_facility=referring_facility or None,
        )
        for panel in profile_panels:
            LabTestRequestPanel.objects.create(test_panel=panel, lab_test_request=request)
            InvoiceItem.objects.create(
                invoice=visit.invoice, item=panel.item, payment_mode=payment_mode)

    return visit
