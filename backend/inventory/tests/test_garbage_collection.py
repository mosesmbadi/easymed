import pytest
from decimal import Decimal
from django.utils import timezone
from datetime import timedelta
from django.core.exceptions import ValidationError

from inventory.models import (
    Item,
    Inventory,
    InventoryArchive,
    Department,
    Supplier
)
from inventory.tasks import inventory_garbage_collection

@pytest.mark.django_db
def test_zero_quantity_items_are_archived(item, department):
    """Test that items with zero quantity are moved to archive"""

    zero_quantity_inventory = Inventory.objects.create(
        item=item,
        department=department,
        purchase_price=Decimal('100.00'),
        sale_price=Decimal('150.00'),
        quantity_at_hand=0,
        re_order_level=5,
        category_one='Resale',
        lot_number='LOT001',
        expiry_date=timezone.now().date() + timedelta(days=90)
    )
    
    inventory_garbage_collection()
        
    archived_item = InventoryArchive.objects.get(item=item)
    assert archived_item.purchase_price == zero_quantity_inventory.purchase_price
    assert archived_item.sale_price == zero_quantity_inventory.sale_price
    assert archived_item.quantity_at_hand == 0
    assert archived_item.lot_number == zero_quantity_inventory.lot_number
    assert archived_item.expiry_date == zero_quantity_inventory.expiry_date
    assert archived_item.category_one == zero_quantity_inventory.category_one


@pytest.mark.django_db
def test_zero_quantity_items_are_deleted(item, department):
    """Test that items are deleted from inventory after archiving"""

    Inventory.objects.create(
        item=item,
        department=department,
        purchase_price=Decimal('100.00'),
        sale_price=Decimal('150.00'),
        quantity_at_hand=0,
        re_order_level=5,
        category_one='Resale',
        lot_number='LOT001',
        expiry_date=timezone.now().date() + timedelta(days=90)
    )
    
    inventory_garbage_collection()
    
    assert not Inventory.objects.filter(item=item).exists()


@pytest.mark.django_db
def test_non_zero_quantity_items_are_preserved(item, department):
    """Test that items with non-zero quantity are not affected"""

    non_zero_inventory = Inventory.objects.create(
        item=item,
        department=department,
        purchase_price=Decimal('200.00'),
        sale_price=Decimal('250.00'),
        quantity_at_hand=10,
        re_order_level=5,
        category_one='Resale',
        lot_number='LOT002',
        expiry_date=timezone.now().date() + timedelta(days=90)
    )
    
    inventory_garbage_collection()
    
    inventory_item = Inventory.objects.get(item=item)
    assert inventory_item.quantity_at_hand == 10


@pytest.mark.django_db
def test_multiple_items_archived(item, department):
    """Test that multiple zero-quantity items are archived correctly"""
    # Create two zero-quantity inventory items
    Inventory.objects.create(
        item=item,
        department=department,
        purchase_price=Decimal('100.00'),
        sale_price=Decimal('150.00'),
        quantity_at_hand=0,
        re_order_level=5,
        category_one='Resale',
        lot_number='LOT001',
        expiry_date=timezone.now().date() + timedelta(days=90)
    )
    
    Inventory.objects.create(
        item=item,
        department=department,
        purchase_price=Decimal('200.00'),
        sale_price=Decimal('250.00'),
        quantity_at_hand=0,
        re_order_level=5,
        category_one='Resale',
        lot_number='LOT002',
        expiry_date=timezone.now().date() + timedelta(days=90)
    )
    
    inventory_garbage_collection()
    
    assert InventoryArchive.objects.count() == 2
    assert Inventory.objects.count() == 0  
