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


def raise_profile_charge(request, payment_mode=None, status='pending'):
    """
    The invoice line for a priced profile, raised once per request for it.

    Panels that are never sold alone carry no price of their own, so the money
    for a URINALYSIS REPORT sits on the profile. Its panels still get their
    zero-value lines, which is what releases them to Phlebotomy once billed.
    """
    profile = request.test_profile
    if not profile or not profile.item_id or not profile.sale_price:
        return None
    visit = AttendanceProcess.objects.filter(process_test_req=request.process_id).first()
    if not visit or not visit.invoice_id:
        return None
    return InvoiceItem.objects.create(
        invoice=visit.invoice, item=profile.item, payment_mode=payment_mode, status=status)


def bills_on_account(payment_mode):
    """True when lines on this payment mode are sold on raising (see InsuranceCompany)."""
    return bool(payment_mode and payment_mode.insurance_id
                and payment_mode.insurance.bills_on_account)


@transaction.atomic
def create_lab_visit(*, panels, requested_by, patient, reason=WALK_IN_REASON,
                     referring_doctor='', referring_facility='', note='',
                     payment_mode=None, bill=True, consignment=None, external_reference='',
                     requested_profiles=None):
    """
    A lab-only visit for `patient`: a LabTestRequest per profile, a
    LabTestRequestPanel per test, and an invoice line per test unless `bill`
    is False (a sample turned away at reception is not charged for).

    `requested_profiles` are the profiles picked at the counter. A panel goes
    on the request for the one that contains it, so a main profile stays one
    request however many sub profiles its panels sit in, and its price is
    charged once.

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
    requested_ids = {profile.pk for profile in requested_profiles or []}
    by_profile = OrderedDict()
    for panel in panels:
        requested = next(
            (profile.pk for profile in reversed(panel.test_profile.lineage())
             if profile.pk in requested_ids),
            panel.test_profile_id)
        by_profile.setdefault(requested, []).append(panel)

    for profile_id, profile_panels in by_profile.items():
        request = LabTestRequest(
            process=visit.process_test_req,
            test_profile_id=profile_id,
            note=note or None,
            requested_by=requested_by,
            referring_doctor=referring_doctor or None,
            referring_facility=referring_facility or None,
            consignment=consignment,
            external_reference=external_reference or '',
        )
        # Charged below instead, with the account and status of this visit.
        request.skip_profile_charge = True
        request.save()
        if bill:
            raise_profile_charge(
                request, payment_mode=payment_mode, status='billed' if on_account else 'pending')
        for panel in profile_panels:
            LabTestRequestPanel.objects.create(test_panel=panel, lab_test_request=request)
            if bill:
                InvoiceItem.objects.create(
                    invoice=visit.invoice, item=panel.item, payment_mode=payment_mode,
                    status='billed' if on_account else 'pending')

    return visit


def create_walk_in_visit(*, panels, requested_by, patient=None, new_patient=None,
                         referring_doctor='', referring_facility='', note='',
                         payment_mode=None, requested_profiles=None):
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
            note=note, payment_mode=payment_mode, requested_profiles=requested_profiles)
