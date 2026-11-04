"""
An admin clearing out demo records: a plain delete refuses and says what is in
the way, the override removes it all, and stock and receipts stay truthful.
"""
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from billing.models import Invoice, InvoiceItem, PaymentAllocation, PaymentMode, PaymentReceipt
from company.models import InsuranceCompany
from inventory.models import Department, Item, StockBalance, StockLot, StockMovement
from inventory.services import stock as stock_service
from laboratory.models import LabTestPanel, LabTestProfile, LabTestRequest, LabTestRequestPanel, Specimen
from patient.models import AttendanceProcess, Patient

User = get_user_model()


def client_for(role, email, **extra):
    user = User.objects.create_user(
        email=email, password='x', first_name='A', last_name='B', role=role, is_staff=True, **extra)
    client = APIClient()
    client.force_authenticate(user)
    return client


@pytest.fixture(autouse=True)
def stock_location(db):
    return Department.objects.get_or_create(name='Main', defaults={'is_stock_location': True})[0]


@pytest.fixture
def admin_api(db):
    return client_for('sysadmin', 'admin@x.test')


@pytest.fixture
def cashier_api(db):
    return client_for('receptionist', 'cashier@x.test')


@pytest.fixture
def cash_mode(db):
    return PaymentMode.objects.create(payment_mode='Cash', payment_category='cash', is_default=True)


@pytest.fixture
def pharmacy(db):
    return Department.objects.create(name='Pharmacy', is_stock_location=True)


@pytest.fixture
def drug(pharmacy):
    item = Item.objects.create(
        name='Paracetamol', desc='Painkiller', category='Drug',
        units_of_measure='tablets', item_code='DRG-1')
    stock_service.set_sale_price(item, Decimal('100.00'))
    stock_service.receive(item=item, department=pharmacy, quantity=50, unit_cost=40, lot_number='L1')
    return item


@pytest.fixture
def panel(db):
    item = Item.objects.create(
        name='Urea', desc='Urea', category='Lab Test', units_of_measure='test', item_code='LAB-U')
    return LabTestPanel.objects.create(
        name='Urea', item=item, test_profile=LabTestProfile.objects.create(name='Renal'),
        specimen=Specimen.objects.create(name='Blood'))


def visit_with_sale(patient, item):
    visit = AttendanceProcess.objects.create(
        patient=patient, reason='Demo', created_by=User.objects.filter(is_staff=True).first())
    line = InvoiceItem.objects.create(invoice=visit.invoice, item=item)
    line.status = 'billed'
    line.save()
    return visit, line


def test_a_plain_delete_refuses_and_lists_what_is_in_the_way(admin_api, cash_mode, patient, drug):
    visit_with_sale(patient, drug)

    response = admin_api.delete(f'/patients/patients/{patient.id}/')

    assert response.status_code == 409
    assert response.data['can_force'] is True
    assert any(row['label'] == 'invoices' for row in response.data['dependents'])
    assert Patient.objects.filter(pk=patient.pk).exists()


def test_a_patient_with_nothing_on_file_just_deletes(admin_api, patient):
    assert admin_api.delete(f'/patients/patients/{patient.id}/').status_code == 204
    assert not Patient.objects.filter(pk=patient.pk).exists()


def test_only_an_admin_can_delete(cashier_api, patient, drug, cash_mode):
    assert cashier_api.delete(f'/patients/patients/{patient.id}/?force=true').status_code == 403
    assert cashier_api.delete(f'/inventory/items/{drug.id}/?force=true').status_code == 403
    assert Patient.objects.filter(pk=patient.pk).exists()
    assert Item.objects.filter(pk=drug.pk).exists()


def test_forcing_a_patient_removes_their_records_and_returns_their_stock(
        admin_api, cash_mode, patient, drug, pharmacy, panel):
    visit, line = visit_with_sale(patient, drug)
    receipt = PaymentReceipt.objects.create(patient=patient, total_amount=100, reference_number='R')
    PaymentAllocation.objects.create(receipt=receipt, invoice_item=line, amount_applied=100)
    request = LabTestRequest.objects.create(process=visit.process_test_req, test_profile=panel.test_profile)
    LabTestRequestPanel.objects.create(test_panel=panel, lab_test_request=request)
    assert StockBalance.objects.get(item=drug, department=pharmacy).quantity == 49

    response = admin_api.delete(f'/patients/patients/{patient.id}/?force=true')

    assert response.status_code == 204
    assert not Patient.objects.filter(pk=patient.pk).exists()
    assert not Invoice.objects.filter(pk=visit.invoice_id).exists()
    assert not AttendanceProcess.objects.filter(pk=visit.pk).exists()
    assert not PaymentReceipt.objects.filter(pk=receipt.pk).exists()
    assert not LabTestRequest.objects.filter(pk=request.pk).exists()
    assert StockBalance.objects.get(item=drug, department=pharmacy).quantity == 50
    assert StockMovement.objects.filter(
        movement_type=StockMovement.Type.REVERSAL, item=drug).exists()


def test_a_shared_insurer_receipt_shrinks_rather_than_vanishes(
        admin_api, cash_mode, patient, drug):
    insurer = InsuranceCompany.objects.create(name='AAR')
    _, doomed = visit_with_sale(patient, drug)
    other_patient = Patient.objects.create(first_name='Other', second_name='Person', gender='F')
    _, kept = visit_with_sale(other_patient, drug)
    receipt = PaymentReceipt.objects.create(insurance=insurer, total_amount=200, reference_number='R')
    PaymentAllocation.objects.create(receipt=receipt, invoice_item=doomed, amount_applied=100)
    PaymentAllocation.objects.create(receipt=receipt, invoice_item=kept, amount_applied=100)

    assert admin_api.delete(f'/patients/patients/{patient.id}/?force=true').status_code == 204

    receipt.refresh_from_db()
    assert receipt.total_amount == Decimal('100.00')
    assert receipt.allocations.count() == 1


def test_a_plain_item_delete_refuses_when_it_has_stock(admin_api, drug):
    response = admin_api.delete(f'/inventory/items/{drug.id}/')

    assert response.status_code == 409
    assert Item.objects.filter(pk=drug.pk).exists()


def test_a_plain_item_delete_does_not_swallow_invoice_lines(admin_api, cash_mode, patient, panel):
    """Invoice lines used to cascade away with a service item, silently."""
    _, line = visit_with_sale(patient, panel.item)

    assert admin_api.delete(f'/inventory/items/{panel.item_id}/').status_code == 409
    assert InvoiceItem.objects.filter(pk=line.pk).exists()


def test_forcing_an_item_clears_its_stock_ledger_and_lines(admin_api, cash_mode, patient, drug):
    visit, line = visit_with_sale(patient, drug)

    assert admin_api.delete(f'/inventory/items/{drug.id}/?force=true').status_code == 204

    assert not Item.objects.filter(pk=drug.pk).exists()
    assert not StockMovement.objects.filter(item_id=drug.pk).exists()
    assert not StockLot.objects.filter(item_id=drug.pk).exists()
    assert not InvoiceItem.objects.filter(pk=line.pk).exists()
    visit.invoice.refresh_from_db()
    assert visit.invoice.invoice_amount == 0


def test_a_stock_row_needs_the_override_and_then_goes(admin_api, drug, pharmacy):
    balance = StockBalance.objects.get(item=drug, department=pharmacy)

    refused = admin_api.delete(f'/inventory/stock-balances/{balance.id}/')
    assert refused.status_code == 409
    assert refused.data['can_force'] is True

    assert admin_api.delete(f'/inventory/stock-balances/{balance.id}/?force=true').status_code == 204
    assert not StockBalance.objects.filter(item=drug).exists()
    assert not StockMovement.objects.filter(item=drug).exists()
    assert not StockLot.objects.filter(item=drug).exists()
    assert Item.objects.filter(pk=drug.pk).exists()


def test_an_unused_panel_deletes_with_its_billing_item(admin_api, panel):
    item_id = panel.item_id

    assert admin_api.delete(f'/lab/lab-test-panel/{panel.id}/').status_code == 204

    assert not LabTestPanel.objects.filter(pk=panel.pk).exists()
    assert not Item.objects.filter(pk=item_id).exists()


def test_a_panel_with_results_refuses_then_can_be_forced(admin_api, cash_mode, patient, panel):
    """This used to blow up as a server error, on an on_delete that could never work."""
    visit, line = visit_with_sale(patient, panel.item)
    request = LabTestRequest.objects.create(process=visit.process_test_req, test_profile=panel.test_profile)
    run = LabTestRequestPanel.objects.create(test_panel=panel, lab_test_request=request, result='5')

    assert admin_api.delete(f'/lab/lab-test-panel/{panel.id}/').status_code == 409
    assert LabTestPanel.objects.filter(pk=panel.pk).exists()

    assert admin_api.delete(f'/lab/lab-test-panel/{panel.id}/?force=true').status_code == 204
    assert not LabTestPanel.objects.filter(pk=panel.pk).exists()
    assert not LabTestRequestPanel.objects.filter(pk=run.pk).exists()
    assert not InvoiceItem.objects.filter(pk=line.pk).exists()


def test_a_profile_with_sub_profiles_refuses_then_can_be_forced(admin_api, panel):
    main = LabTestProfile.objects.create(name='Main')
    sub = panel.test_profile
    sub.parent = main
    sub.save()

    assert admin_api.delete(f'/lab/lab-test-profile/{main.id}/').status_code == 409

    assert admin_api.delete(f'/lab/lab-test-profile/{main.id}/?force=true').status_code == 204
    assert not LabTestProfile.objects.filter(pk__in=[main.pk, sub.pk]).exists()
    assert not LabTestPanel.objects.filter(pk=panel.pk).exists()
