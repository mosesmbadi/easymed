import pytest
from unittest.mock import AsyncMock, patch
from asgiref.sync import sync_to_async
from django.db import transaction
from inventory.models import StockPolicy
from inventory.tasks import check_inventory_reorder_levels
from authperms.models import Group, Permission
from customuser.models import CustomUser

@pytest.mark.django_db
@patch("inventory.tasks.get_channel_layer")
def test_check_inventory_reorder_levels(mock_get_channel_layer, stock_balance):
    """
    Test Celery task sending notifications via WebSocket channels.
    """
    mock_channel_layer = AsyncMock()
    mock_get_channel_layer.return_value = mock_channel_layer
    
    # Create the required permission (using the custom Permission model)
    permission = Permission.objects.create(
        name='CAN_RECEIVE_INVENTORY_NOTIFICATIONS'
    )
    
    # Create a group with the permission
    group = Group.objects.create(name='Test Inventory Group')
    group.permissions.add(permission)
    
    # Create a user and add to the group
    user = CustomUser.objects.create_user(
        email='testuser@example.com',
        password='testpass',
        first_name='Test',
        last_name='User',
        role='patient'
    )
    user.group = group
    user.save()
    
    # Re-order level is a property of the item at a location, not of a lot.
    StockPolicy.objects.create(
        item=stock_balance.item,
        department=stock_balance.department,
        re_order_level=20,
    )

    # Call the synchronous function directly (not as async)
    check_inventory_reorder_levels()

    # The function uses async_to_sync internally, so we need to check the call was made
    mock_channel_layer.group_send.assert_called_once_with(
        "inventory_notifications",
        {
            "type": "send_notification",
            "message": (
                f"Low stock alert for {stock_balance.item.name} "
                f"at {stock_balance.department.name}: "
                f"{stock_balance.quantity} left (re-order level 20)."
            ),
        },
    )
