import pytest

from inventory.models import RequisitionItem, Item, Supplier, Inventory
from inventory.serializers import RequisitionSerializer 

@pytest.fixture
def item2():
    return Item.objects.create(
        name="Test Item 2",
        desc="Test Description 2",
        category="General",
        units_of_measure="Unit",
        vat_rate=16.0,
        item_code="AyiC123",
    )

@pytest.fixture
def inventory2(item2, department):
    return Inventory.objects.create(
        item=item2,
        quantity_at_hand=10,
        purchase_price=10.0,
        sale_price=20.0,
        lot_number="LOT-001",
        expiry_date="2024-01-01",
        category_one="resale",
        department=department,
    )


@pytest.mark.django_db
def test_requisition_successful_creation(requisition, item, item2, inventory2, inventory, supplier, authenticated_client, department):
    requisition_item1 = RequisitionItem.objects.create(
        quantity_requested=10,
        item=item,
        preferred_supplier=supplier,
        requisition=requisition
    )

    requisition_item2 = RequisitionItem.objects.create(
        quantity_requested=30,
        item=item2,  
        preferred_supplier=supplier,
        requisition=requisition
    )

    requisition.refresh_from_db()
    response = authenticated_client.get(f'/inventory/requisition/{requisition.id}/')
    assert response.status_code == 200
    assert len(response.data['items']) == 2  # Check if two items are returned in the response

@pytest.mark.django_db
def test_requsition_item_with_mising_supplier(requisition, user, supplier, inventory, authenticated_client, department, item):
    """
    Test that if a RequisitionItem is created without a preferred supplier,
    the first supplier in the database is automatically assigned via the serializer.
    """
    default_supplier = Supplier.objects.first()
    requisition_data = {
        "requested_by": user.id,
        "department": department.id,
        "items":[
            {
                "quantity_requested": 10,
                "item": item.id,  
                "requisition": requisition.id  
                # No 'preferred_supplier' provided (should default to the first supplier)
            }
        ]
    }

    serializer = RequisitionSerializer(data=requisition_data)
    assert serializer.is_valid(), serializer.errors  

    requisition = serializer.save()

    requisition.refresh_from_db()

    response = authenticated_client.get(f'/inventory/requisition/{requisition.id}/')
    assert response.status_code == 200
    assert response.data['items'][0]['preferred_supplier'] == default_supplier.official_name


@pytest.mark.django_db
def test_creating_requisition_with_same_item_same_supplier(
    requisition, item, user, inventory, supplier, department, authenticated_client
):
    """
    Items with the same supplier and item should be combined into a single RequisitionItem.
    """
    supplier2 = Supplier.objects.create(
        official_name="Supplier 2", common_name="Supplier 2"
    )

    requisition_data = {
        "requested_by": user.id,
        "department": department.id,
        "items": [
            {
                "quantity_requested": 10,
                "item": item.id,
                "requisition": requisition.id,
            },
            {
                "quantity_requested": 10,
                "item": item.id,
                "requisition": requisition.id,
            },
            {
                "quantity_requested": 10,
                "item": item.id,
                "requisition": requisition.id,
                "preferred_supplier": supplier2.id,
            },
        ],
    }

    serializer = RequisitionSerializer(data=requisition_data)
    assert serializer.is_valid(), serializer.errors

    requisition = serializer.save()
    requisition.refresh_from_db()

    requisition_items = requisition.items.filter(requisition=requisition)

    response = authenticated_client.get(f'/inventory/requisition/{requisition.id}/')

    assert response.status_code == 200
    assert len(response.data['items']) == 2  # First two items should be combined

    total_amount_requested = sum(
        item.quantity_requested * (
            Inventory.objects.filter(item=item.item).first().purchase_price or 0
        )
        for item in requisition_items
    )

    assert total_amount_requested == 300.00