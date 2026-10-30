from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import patch

import pytest
from django.urls import reverse

from inventory.models import StockMovement, StockPolicy
from inventory.services import stock as stock_service


@pytest.mark.django_db
def test_low_quantity_filter(authenticated_client, opening_stock, item, department):
    item.category = "Drug"
    item.save()
    StockPolicy.objects.create(item=item, department=department, re_order_level=15)

    url = reverse('inventory-filter')
    response = authenticated_client.get(url, {'category': 'Drug', 'filter_type': 'low_quantity'})

    assert response.status_code == 200
    assert response.json()[0]['item_name'] == item.name


@pytest.mark.django_db
def test_near_expiry_filter(authenticated_client, item, department):
    item.category = "Drug"
    item.save()
    stock_service.receive(
        item=item, department=department, quantity=5, unit_cost=1,
        lot_number='SOON', expiry_date=date.today() + timedelta(days=30))

    url = reverse('inventory-filter')
    response = authenticated_client.get(url, {'category': 'Drug', 'filter_type': 'near_expiry'})

    assert response.status_code == 200
    assert len(response.json()) == 1


@pytest.mark.django_db
def test_expired_filter(authenticated_client, item, department):
    item.category = "Drug"
    item.save()
    stock_service.receive(
        item=item, department=department, quantity=5, unit_cost=1,
        lot_number='OLD', expiry_date=date.today() - timedelta(days=1))

    url = reverse('inventory-filter')
    response = authenticated_client.get(url, {'category': 'Drug', 'filter_type': 'expired'})

    assert response.status_code == 200
    assert len(response.json()) == 1


@pytest.mark.django_db
def test_inventory_list_reports_ledger_quantity(authenticated_client, opening_stock, item):
    response = authenticated_client.get('/inventory/inventories/')

    assert response.status_code == 200
    rows = response.json()
    row = rows['results'][0] if isinstance(rows, dict) else rows[0]
    assert row['quantity_at_hand'] == 10
    assert row['item_name'] == item.name


@pytest.mark.django_db
def test_manual_stock_entry_records_an_opening_balance(
    authenticated_admin_client, item, department
):
    """
    The old Add Inventory form created a quantity out of nothing. The same
    payload now produces an OPENING_BALANCE movement with a documented origin.
    """
    response = authenticated_admin_client.post('/inventory/inventories/', {
        'item': item.id,
        'department': department.id,
        'quantity_at_hand': 25,
        'lot_number': 'OPEN-1',
        'purchase_price': '4.00',
        'sale_price': '9.00',
        'expiry_date': '2030-01-01',
    }, format='json')

    assert response.status_code == 201, response.json()
    assert response.json()['quantity_at_hand'] == 25

    movement = StockMovement.objects.get(item=item)
    assert movement.movement_type == StockMovement.Type.OPENING_BALANCE
    assert movement.quantity == 25
    assert item.current_sale_price == Decimal('9.00')


@pytest.mark.django_db
def test_stock_cannot_be_written_by_updating_a_balance(
    authenticated_admin_client, opening_stock
):
    """Stock is the ledger's total; the balance endpoint is read-only."""
    from inventory.models import StockBalance

    balance = StockBalance.objects.get(item=opening_stock.item)
    response = authenticated_admin_client.patch(
        f'/inventory/inventories/{balance.id}/', {'quantity_at_hand': 999}, format='json')

    assert response.status_code == 405


@pytest.mark.django_db
def test_movement_can_be_reversed_over_the_api(authenticated_client, opening_stock):
    response = authenticated_client.post(
        f'/inventory/stock-movements/{opening_stock.id}/reverse/',
        {'reason': 'Keyed in error'}, format='json')

    assert response.status_code == 201
    assert response.json()['quantity'] == -10


@pytest.mark.django_db
def test_reversal_requires_a_reason(authenticated_client, opening_stock):
    response = authenticated_client.post(
        f'/inventory/stock-movements/{opening_stock.id}/reverse/', {}, format='json')

    assert response.status_code == 400


@pytest.mark.django_db
def test_transfer_endpoint_moves_stock(authenticated_admin_client, opening_stock, item, department):
    from inventory.models import Department

    lab = Department.objects.create(name='Lab')
    response = authenticated_admin_client.post('/inventory/stock-transfers/', {
        'item': item.id,
        'from_department': department.id,
        'to_department': lab.id,
        'quantity': 4,
    }, format='json')

    assert response.status_code == 201
    assert stock_service.on_hand_quantity(item, department) == 6
    assert stock_service.on_hand_quantity(item, lab) == 4


@pytest.mark.django_db
def test_transfer_rejects_an_oversell(authenticated_admin_client, opening_stock, item, department):
    from inventory.models import Department

    lab = Department.objects.create(name='Lab')
    response = authenticated_admin_client.post('/inventory/stock-transfers/', {
        'item': item.id,
        'from_department': department.id,
        'to_department': lab.id,
        'quantity': 999,
    }, format='json')

    assert response.status_code == 409


@pytest.mark.django_db
@patch('inventory.views.HTML')
def test_download_supplier_invoice_pdf_template_rendering(
    mock_html, authenticated_client, supplier, supplier_invoice, incoming_item, company
):
    """
    Test that the template is rendered with the correct context.
    """
    mock_html.return_value.write_pdf.return_value = b'%PDF-1.4'

    url = reverse('download_supplier_invoice_pdf', kwargs={'supplier_id': supplier.id})
    response = authenticated_client.get(url)

    assert mock_html.called
    context = mock_html.call_args[1]['string']
    assert str(supplier_invoice.invoice_no) in context
    assert str(incoming_item.item.name) in context


# ---------------------------------------------------------------------------
# Who may bring stock in
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_receiving_stock_is_refused_to_an_ordinary_user(
    authenticated_client, item, department
):
    """Stock coming inwards mints inventory, so it is not open to everyone."""
    response = authenticated_client.post('/inventory/inventories/', {
        'item': item.id,
        'department': department.id,
        'quantity_at_hand': 10,
        'lot_number': 'GATE-1',
    }, content_type='application/json')

    assert response.status_code == 403


@pytest.mark.django_db
def test_department_head_may_receive_into_their_own_department(
    client, user, item, department
):
    """The head of a department is trusted with that department's stock."""
    from rest_framework_simplejwt.tokens import RefreshToken

    department.head = user
    department.save(update_fields=['head'])
    client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {RefreshToken.for_user(user).access_token}'

    response = client.post('/inventory/inventories/', {
        'item': item.id,
        'department': department.id,
        'quantity_at_hand': 10,
        'lot_number': 'GATE-2',
    }, content_type='application/json')

    assert response.status_code == 201


@pytest.mark.django_db
def test_department_head_may_not_receive_into_another_department(
    client, user, item, department
):
    """...and only that department's."""
    from rest_framework_simplejwt.tokens import RefreshToken

    from inventory.models import Department

    other = Department.objects.create(name='Somewhere Else')
    department.head = user
    department.save(update_fields=['head'])
    client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {RefreshToken.for_user(user).access_token}'

    response = client.post('/inventory/inventories/', {
        'item': item.id,
        'department': other.id,
        'quantity_at_hand': 10,
        'lot_number': 'GATE-3',
    }, content_type='application/json')

    assert response.status_code == 403


@pytest.mark.django_db
def test_individually_granted_user_may_receive_stock(client, user, item, department):
    """The manual grant is the third route in, for staff who are neither."""
    from rest_framework_simplejwt.tokens import RefreshToken

    user.can_manage_inventory = True
    user.save(update_fields=['can_manage_inventory'])
    client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {RefreshToken.for_user(user).access_token}'

    response = client.post('/inventory/inventories/', {
        'item': item.id,
        'department': department.id,
        'quantity_at_hand': 10,
        'lot_number': 'GATE-4',
    }, content_type='application/json')

    assert response.status_code == 201


@pytest.mark.django_db
def test_reading_stock_stays_open(authenticated_client, opening_stock):
    """A nurse must be able to see whether there are syringes."""
    assert authenticated_client.get('/inventory/inventories/').status_code == 200
