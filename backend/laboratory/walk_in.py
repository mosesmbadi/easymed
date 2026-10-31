"""
A walk-in lab visit: a patient who comes to the bench with a referral, or
just asks for a test, without seeing one of our doctors.

It produces exactly what a doctor's lab order produces -- an AttendanceProcess
carrying the invoice and the ProcessTestRequest, a LabTestRequest per profile,
a LabTestRequestPanel per test and an invoice line per test -- so billing,
sample collection, results and the report all work on it unchanged. The only
differences are that it starts on the 'lab' track and records who referred
the patient instead of which of our doctors ordered it. Samples sent in by
another facility (laboratory.referrals) are built the same way.

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


def bills_on_account(payment_mode):
    """True when lines on this payment mode are sold on raising (see InsuranceCompany)."""
    return bool(payment_mode and payment_mode.insurance_id
                and payment_mode.insurance.bills_on_account)


@transaction.atomic
def create_lab_visit(*, panels, requested_by, patient, reason=WALK_IN_REASON,
                     referring_doctor='', referring_facility='', note='',
                     payment_mode=None, bill=True, consignment=None, external_reference=''):
    """
    A lab-only visit for `patient`: a LabTestRequest per profile, a
    LabTestRequestPanel per test, and an invoice line per test unless `bill`
    is False (a sample turned away at reception is not charged for).

    Lines on a corporate or referring-facility account are billed as they are
    raised, so the tests go straight onto the Phlebotomy list; anything else
    waits for the cashier. Billing checks the reagents are there, and raises
    django's ValidationError if not -- which rolls the whole visit back.
    """
    visit = AttendanceProcess(
        patient=patient,
        reason=reason,
        track='lab',
        created_by=requested_by,
    )
    visit.save()

    on_account = bills_on_account(payment_mode)

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
            consignment=consignment,
            external_reference=external_reference or '',
        )
        for panel in profile_panels:
            LabTestRequestPanel.objects.create(test_panel=panel, lab_test_request=request)
            if bill:
                InvoiceItem.objects.create(
                    invoice=visit.invoice, item=panel.item, payment_mode=payment_mode,
                    status='billed' if on_account else 'pending')

    return visit


def create_walk_in_visit(*, panels, requested_by, patient=None, new_patient=None,
                         referring_doctor='', referring_facility='', note='',
                         payment_mode=None):
    """
    `panels` is a list of LabTestPanel, already validated to carry a billing
    item. Pass either an existing `patient` or `new_patient`, a dict of
    Patient fields. Returns the AttendanceProcess.
    """
    with transaction.atomic():
        if patient is None:
            patient = Patient.objects.create(**new_patient)
        return create_lab_visit(
            panels=panels, requested_by=requested_by, patient=patient,
            referring_doctor=referring_doctor, referring_facility=referring_facility,
            note=note, payment_mode=payment_mode)
