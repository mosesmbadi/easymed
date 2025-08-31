import pytest
from unittest.mock import AsyncMock, patch
from asgiref.sync import sync_to_async
from django.db import transaction
from inventory.tasks import check_inventory_reorder_levels
from authperms.models import Group, Permission
from customuser.models import CustomUser

@pytest.mark.django_db
@patch("inventory.tasks.get_channel_layer")
def test_check_inventory_reorder_levels(mock_get_channel_layer, inventory):
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
    
    inventory.quantity_at_hand = 5
    inventory.re_order_level = 10
    inventory.save()

    # Call the synchronous function directly (not as async)
    check_inventory_reorder_levels()

    # The function uses async_to_sync internally, so we need to check the call was made
    mock_channel_layer.group_send.assert_called_once_with(
        "inventory_notifications",
        {
            "type": "send_notification",
            "message": f"Low stock alert for {inventory.item.name}: Only {inventory.quantity_at_hand} items left.",
        },
    )
