import logging

from asgiref.sync import async_to_sync
from celery import shared_task
from channels.layers import get_channel_layer
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail

from authperms.models import Group

from .models import InsuranceItemSalePrice, Item, StockMovement
from .services import stock as stock_service

User = get_user_model()

logger = logging.getLogger(__name__)


@shared_task
def check_inventory_reorder_levels():
    """
    Notify stock controllers about items at or below their re-order level.

    Re-order is evaluated per item per location by the service layer, not per
    lot -- a per-lot re-order level says nothing useful about whether you need
    to buy more.
    """
    rows = stock_service.items_below_reorder_level()
    if not rows:
        logger.info("No items found below reorder levels.")
        return 0

    groups_with_notification_permission = Group.objects.filter(
        permissions__name='CAN_RECEIVE_INVENTORY_NOTIFICATIONS'
    )
    if not groups_with_notification_permission.exists():
        logger.info("No groups found with the required notification permission.")
        return 0

    users_to_notify = User.objects.filter(group__in=groups_with_notification_permission).distinct()
    user_emails = list(users_to_notify.values_list('email', flat=True))
    if not user_emails:
        logger.info("No users found in groups with notification permissions.")
        return 0

    channel_layer = get_channel_layer()
    for row in rows:
        location = row['department'].name if row['department'] else 'unknown location'
        message = (
            f"Low stock alert for {row['item'].name} at {location}: "
            f"{row['quantity']} left (re-order level {row['re_order_level']})."
        )
        try:
            async_to_sync(channel_layer.group_send)(
                "inventory_notifications",
                {"type": "send_notification", "message": message},
            )
        except Exception as ws_error:
            # A websocket outage must not stop the email going out.
            logger.error("Failed to send WebSocket notification for %s: %s", row['item'].name, ws_error)

        try:
            send_mail(
                subject="Inventory Notification",
                message=message,
                from_email=settings.EMAIL_HOST_USER,
                recipient_list=user_emails,
            )
        except Exception as email_error:
            logger.error("Error sending email for %s: %s", row['item'].name, email_error)

    return len(rows)


@shared_task
def write_off_expired_stock():
    """
    Write expired lots down to zero with an EXPIRY_WRITE_OFF movement so the
    loss is visible and valued, instead of quietly deleting the row.

    This replaces the old `inventory_garbage_collection`, which deleted any lot
    that reached zero and so destroyed its history.
    """
    movements = stock_service.write_off_expired()
    logger.info("Wrote off %d expired stock balances", len(movements))
    return len(movements)


@shared_task
def expire_stale_reservations():
    """Release reservations nobody ever fulfilled so the stock frees up."""
    count = stock_service.expire_stale_reservations()
    if count:
        logger.info("Expired %d stale stock reservations", count)
    return count


@shared_task
def reconcile_stock_balances():
    """
    Compare the cached balances against the ledger and repair any drift.

    Drift should always be zero. If it is not, something wrote stock outside
    the service layer and that is worth an alert.
    """
    drift = stock_service.rebuild_balances()
    if drift:
        logger.error("Stock balance drift detected and corrected on %d rows: %s", len(drift), drift)
    return len(drift)


@shared_task
def create_insurance_prices_for_item(item_id):
    """
    Seed a default insurance price per company for a newly priced item, so
    billing does not silently fall back to zero.
    """
    from company.models import InsuranceCompany

    item = Item.objects.filter(id=item_id).first()
    if item is None:
        return 0

    created = 0
    for company in InsuranceCompany.objects.all():
        _, was_created = InsuranceItemSalePrice.objects.get_or_create(
            item=item,
            insurance_company=company,
            defaults={'sale_price': item.current_sale_price or 0, 'co_pay': 0.00},
        )
        created += int(was_created)
    return created


@shared_task
def post_incoming_item(incoming_item_id, user_id=None):
    """
    Post a goods-received line to the ledger out of band.

    Safe to retry: `receive_incoming_item` is idempotent on the line's id, so a
    duplicate delivery of this task cannot double the stock. That is what the
    old post_save receipt signal could not promise.
    """
    from .models import IncomingItem

    incoming_item = IncomingItem.objects.filter(id=incoming_item_id).select_related('item').first()
    if incoming_item is None:
        logger.warning("IncomingItem %s no longer exists", incoming_item_id)
        return None

    performed_by = User.objects.filter(id=user_id).first() if user_id else None
    movement = stock_service.receive_incoming_item(incoming_item, performed_by=performed_by)
    return movement.id if movement else None


@shared_task
def issue_stock_for_source(item_id, department_id, quantity, source_type, source_id, reason=''):
    """
    Generic out-of-band issue used by other apps that do not want to block a
    request on stock posting. Idempotent per source document.
    """
    from .models import Department

    item = Item.objects.filter(id=item_id).first()
    department = Department.objects.filter(id=department_id).first()
    if item is None or department is None:
        logger.warning("issue_stock_for_source: unknown item %s or department %s", item_id, department_id)
        return 0

    movements = stock_service.issue(
        item=item,
        department=department,
        quantity=quantity,
        movement_type=StockMovement.Type.CONSUMPTION,
        source_type=source_type,
        source_id=source_id,
        reason=reason,
        idempotency_key=f"{source_type}:{source_id}:{item_id}",
    )
    return len(movements)
