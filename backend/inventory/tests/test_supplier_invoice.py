import pytest
from decimal import Decimal
from django.utils import timezone

from inventory.models import IncomingItem, ItemUnit, StockBalance, SupplierInvoice
from inventory.serializers import IncomingItemSerializer
from inventory.services import stock as stock_service


def _receive(supplier_invoice, item, supplier, purchase_order, department,
             purchase_price, quantity, lot_no):
    """Create a goods-received line and post it, the way the API does."""
    line = IncomingItem.objects.create(
        item=item,
        supplier=supplier,
        purchase_order=purchase_order,
        supplier_invoice=supplier_invoice,
        department=department,
        purchase_price=Decimal(purchase_price),
        sale_price=Decimal('150.00'),
        quantity=quantity,
        lot_no=lot_no,
        expiry_date=timezone.now().date(),
    )
    stock_service.receive_incoming_item(line)
    return line


@pytest.mark.django_db
def test_posting_a_receipt_updates_invoice_amount(
    supplier_invoice, item, supplier, purchase_order, department
):
    _receive(supplier_invoice, item, supplier, purchase_order, department, '100.00', 2, 'LOT001')

    supplier_invoice.refresh_from_db()
    assert supplier_invoice.amount == Decimal('200.00')


@pytest.mark.django_db
def test_multiple_receipts_sum_correctly(
    supplier_invoice, item, supplier, purchase_order, department
):
    _receive(supplier_invoice, item, supplier, purchase_order, department, '100.00', 2, 'LOT001')
    _receive(supplier_invoice, item, supplier, purchase_order, department, '50.00', 3, 'LOT002')

    supplier_invoice.refresh_from_db()
    assert supplier_invoice.amount == Decimal('350.00')


@pytest.mark.django_db
def test_posting_a_receipt_brings_stock_in(
    supplier_invoice, item, supplier, purchase_order, department
):
    line = _receive(
        supplier_invoice, item, supplier, purchase_order, department, '100.00', 2, 'LOT001')

    line.refresh_from_db()
    assert line.is_posted
    assert StockBalance.objects.get(item=item, department=department).quantity == 2


@pytest.mark.django_db
def test_posting_the_same_receipt_twice_does_not_double_stock(
    supplier_invoice, item, supplier, purchase_order, department
):
    line = _receive(
        supplier_invoice, item, supplier, purchase_order, department, '100.00', 2, 'LOT001')

    stock_service.receive_incoming_item(line)

    assert StockBalance.objects.get(item=item, department=department).quantity == 2


@pytest.mark.django_db
def test_packs_are_converted_to_base_units(
    supplier_invoice, item, supplier, purchase_order, department
):
    """Items ship in base units until a pack size says otherwise."""
    box_of_20 = ItemUnit.objects.create(item=item, name='Box', factor_to_base=20)

    line = IncomingItem.objects.create(
        item=item,
        supplier=supplier,
        purchase_order=purchase_order,
        supplier_invoice=supplier_invoice,
        department=department,
        purchase_price=Decimal('200.00'),   # per box
        quantity=3,                          # three boxes
        item_unit=box_of_20,
        lot_no='LOT-PACK',
        expiry_date=timezone.now().date(),
    )
    stock_service.receive_incoming_item(line)

    assert line.base_units == 60
    assert StockBalance.objects.get(item=item, department=department).quantity == 60
    # Cost is stored per base unit, not per pack.
    assert StockBalance.objects.get(item=item, department=department).unit_cost == Decimal('10.0000')


@pytest.mark.django_db
def test_a_posted_receipt_cannot_be_edited(
    supplier_invoice, item, supplier, purchase_order, department
):
    line = _receive(
        supplier_invoice, item, supplier, purchase_order, department, '100.00', 2, 'LOT001')

    serializer = IncomingItemSerializer(line, data={'quantity': 5}, partial=True)
    assert serializer.is_valid(), serializer.errors
    with pytest.raises(Exception):
        serializer.save()


@pytest.mark.django_db
def test_create_supplier_invoice(supplier, purchase_order):
    invoice = SupplierInvoice.objects.create(
        invoice_no="INV-2024-003",
        status="pending",
        supplier=supplier,
        purchase_order=purchase_order
    )
    assert invoice.invoice_no == "INV-2024-003"


@pytest.mark.django_db
def test_a_blank_expiry_date_means_no_expiry(item, department, supplier):
    """
    Most goods have no expiry, and a form that leaves the field empty sends "".
    Rejecting that failed the whole receipt on a date format, so nothing
    reached stock.
    """
    serializer = IncomingItemSerializer(data={
        'item': item.id,
        'department': department.id,
        'supplier': supplier.id,
        'quantity': 10,
        'purchase_price': '5.00',
        'lot_no': '',
        'expiry_date': '',
    })

    assert serializer.is_valid(), serializer.errors
    incoming = serializer.save()

    assert incoming.expiry_date is None
    assert incoming.is_posted
    assert stock_service.on_hand_quantity(item, department) == 10


@pytest.mark.django_db
def test_a_malformed_expiry_date_is_still_refused(item, department, supplier):
    serializer = IncomingItemSerializer(data={
        'item': item.id,
        'department': department.id,
        'supplier': supplier.id,
        'quantity': 10,
        'purchase_price': '5.00',
        'expiry_date': '31/12/2027',
    })

    assert not serializer.is_valid()
    assert 'expiry_date' in serializer.errors


@pytest.mark.django_db
def test_a_goods_receipt_is_all_or_nothing(item, department, supplier, purchase_order):
    """
    The invoice, the GRN and every line go in together.

    These used to be three requests from the browser; a failure on the last
    left an invoice and a GRN behind claiming goods that never reached stock.
    """
    from inventory.models import GoodsReceiptNote, Item
    from inventory.serializers import GoodsReceiptSerializer

    service = Item.objects.create(
        name="Consultation", desc="Service", category="Lab Test",
        units_of_measure="test", item_code="SVC-GR-1")

    serializer = GoodsReceiptSerializer(data={
        'purchase_order': purchase_order.id,
        'invoice_no': 'INV-ATOMIC',
        'supplier': supplier.id,
        'lines': [
            {'item': item.id, 'department': department.id, 'quantity': 10,
             'purchase_price': '5.00'},
            {'item': service.id, 'department': department.id, 'quantity': 5,
             'purchase_price': '1.00'},
        ],
    })

    assert not serializer.is_valid()
    assert 'lines' in serializer.errors

    assert not SupplierInvoice.objects.filter(invoice_no='INV-ATOMIC').exists()
    assert GoodsReceiptNote.objects.count() == 0
    assert IncomingItem.objects.count() == 0
    assert stock_service.on_hand_quantity(item, department) == 0


@pytest.mark.django_db
def test_a_goods_receipt_posts_every_line_and_prices_the_invoice(
    item, department, supplier, purchase_order
):
    from inventory.models import GoodsReceiptNote
    from inventory.serializers import GoodsReceiptSerializer

    serializer = GoodsReceiptSerializer(data={
        'purchase_order': purchase_order.id,
        'invoice_no': 'INV-OK',
        'supplier': supplier.id,
        'note': 'Delivered in full',
        'lines': [
            {'item': item.id, 'department': department.id, 'quantity': 10,
             'purchase_price': '5.00', 'expiry_date': ''},
        ],
    })
    assert serializer.is_valid(), serializer.errors
    receipt = serializer.save()

    invoice = receipt['supplier_invoice']
    assert invoice.invoice_no == 'INV-OK'
    # Worth what arrived, not what was typed into the form.
    assert invoice.amount == Decimal('50.00')
    assert receipt['goods_receipt_note'].grn_number
    assert len(receipt['lines']) == 1
    assert receipt['lines'][0].is_posted
    assert stock_service.on_hand_quantity(item, department) == 10


@pytest.mark.django_db
def test_a_goods_receipt_refuses_a_duplicate_invoice_number(
    item, department, supplier, purchase_order
):
    from inventory.serializers import GoodsReceiptSerializer

    SupplierInvoice.objects.create(
        invoice_no='INV-DUP', supplier=supplier, purchase_order=purchase_order)

    serializer = GoodsReceiptSerializer(data={
        'purchase_order': purchase_order.id,
        'invoice_no': 'INV-DUP',
        'supplier': supplier.id,
        'lines': [{'item': item.id, 'department': department.id, 'quantity': 1,
                   'purchase_price': '5.00'}],
    })

    assert not serializer.is_valid()
    assert 'invoice_no' in serializer.errors
