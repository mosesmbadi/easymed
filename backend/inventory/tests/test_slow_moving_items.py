import pytest
from datetime import datetime, timedelta
from django.utils import timezone
from rest_framework import status
from billing.models import Invoice, InvoiceItem
from inventory.models import Inventory


@pytest.mark.django_db
def test_slow_moving_items_no_deductions(authenticated_client, inventory):
    """Test that items with no last_deducted_at are not included."""
    inventory.last_deducted_at = None
    inventory.save()
    
    response = authenticated_client.get("/inventory/inventories/slow-moving-items/")
    
    assert response.status_code == 200
    assert len(response.json()) == 0  # No items should be returned

@pytest.mark.django_db
def test_slow_moving_items_not_exceeding_period(authenticated_client, inventory):
    """Test that items with last_deducted_at within the slow_moving_period are not included."""
    inventory.last_deducted_at = timezone.now() - timedelta(days=inventory.item.slow_moving_period - 1)
    inventory.save()
    
    response = authenticated_client.get("/inventory/inventories/slow-moving-items/")
    
    assert response.status_code == 200
    assert len(response.json()) == 0  # Should not be in slow-moving list

@pytest.mark.django_db
def test_slow_moving_items_exceeding_period(authenticated_client, inventory):
    """Test that items with last_deducted_at older than the slow_moving_period are included."""
    inventory.last_deducted_at = timezone.now() - timedelta(days=inventory.item.slow_moving_period + 1)
    inventory.save()
    
    response = authenticated_client.get("/inventory/inventories/slow-moving-items/")
    
    assert response.status_code == 200
    assert len(response.json()) == 1  # Should be included in the response
    
    data = response.json()[0]
    assert data["item_id"] == inventory.item.id
    assert data["days_without_transactions"] > inventory.item.slow_moving_period


@pytest.mark.django_db
def test_slow_moving_items_exact_boundary(authenticated_client, inventory):
    """Test that items with last_deducted_at exactly at the slow_moving_period are included."""
    inventory.last_deducted_at = timezone.now() - timedelta(days=inventory.item.slow_moving_period)
    inventory.save()
    
    response = authenticated_client.get("/inventory/inventories/slow-moving-items/")
    
    assert response.status_code == 200
    assert len(response.json()) == 1


