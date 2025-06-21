import pytest
from unittest.mock import AsyncMock, patch
from asgiref.sync import sync_to_async
from django.db import transaction
from inventory.tasks import check_inventory_reorder_levels

@pytest.mark.asyncio
@pytest.mark.django_db
@patch("inventory.consumers.get_channel_layer")
async def test_check_inventory_reorder_levels(mock_get_channel_layer, inventory):
    """
    Test Celery task sending notifications via WebSocket channels.
    """
    mock_channel_layer = AsyncMock()
    mock_get_channel_layer.return_value = mock_channel_layer
    
    inventory.quantity_at_hand = 5
    inventory.re_order_level = 10
    
    await sync_to_async(inventory.save)()

    await check_inventory_reorder_levels()

    mock_channel_layer.group_send.assert_called_once_with(
        "inventory_notifications",
        {
            "type": "send_notification",
            "message": f"Low stock alert for {inventory.item.name}: Only {inventory.quantity_at_hand} items left.",
        },
    )
