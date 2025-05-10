# import os
import logging
from celery import shared_task
from django.db.models.signals import post_save
from django.conf import settings
from django.template.loader import get_template
from django.core.mail import EmailMultiAlternatives
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.core.mail import send_mail
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import F
from django.core.exceptions import ObjectDoesNotExist, ValidationError


from inventory.models import (
    Inventory, InventoryArchive
)
from billing.models import Invoice
from patient.models import AttendanceProcess
from authperms.models import Group
from celery import shared_task
from laboratory.models import TestKitCounter, TestKit, LabTestRequestPanel


logger = logging.getLogger(__name__)


# Helper function to get inventory safely
def get_inventory_or_error(item):
    inventory_item=  Inventory.objects.get(item=item)
    print("Inventory found:", inventory_item)
    try:
        return Inventory.objects.get(item=item)
        
    except Inventory.DoesNotExist:
        raise ValidationError(f"No inventory record found for item: {item.name}.")


def update_stock_quantity_if_stock_is_available(instance, deductions):
    """
    Deducts stock quantity from the Inventory model based on the billed quantity.
    Prioritizes inventory records with the nearest expiry date.
    """
    try:
        # Get inventory records for the item, ordered by expiry date (nearest first)
        inventory_records = Inventory.objects.filter(
            item=instance.item
        ).exclude(expiry_date__isnull=True).order_by('expiry_date')

        if not inventory_records.exists():
            raise ValidationError(f"No inventory record found for item: {instance.item.name}.")

        remaining_deduction = deductions

        with transaction.atomic():
            for inventory_record in inventory_records:
                if remaining_deduction <= 0:
                    break  # Stop when all deductions are fulfilled

                if inventory_record.quantity_at_hand >= remaining_deduction:
                    # Deduct the required quantity from this record
                    inventory_record.quantity_at_hand -= remaining_deduction
                    inventory_record.save()
                    logger.info(
                        "Stock updated successfully for item: %s, Lot: %s, Remaining: %d",
                        instance.item.name,
                        inventory_record.lot_number,
                        inventory_record.quantity_at_hand,
                    )
                    remaining_deduction = 0
                else:
                    # Use up the stock of the current record and continue with the remaining quantity
                    remaining_deduction -= inventory_record.quantity_at_hand
                    inventory_record.quantity_at_hand = 0
                    inventory_record.save()
                    logger.info(
                        "Stock exhausted for item: %s, Lot: %s",
                        instance.item.name,
                        inventory_record.lot_number,
                    )

            if remaining_deduction > 0:
                # If there is still stock to deduct, raise an error
                raise ValidationError(f"Not enough stock available for {instance.item.name}. Missing quantity: {remaining_deduction}.")

    except ValidationError as e:
        logger.error("Stock update failed: %s", e)
        raise
    except Exception as e:
        logger.exception("Unexpected error during stock update: %s", e)
        raise
    

@shared_task
def check_inventory_reorder_levels():
    """
    Periodically checks all inventory items for reorder levels and sends notifications if needed.
    """
    items = Inventory.objects.filter(quantity_at_hand__lte=F('re_order_level'))
    if not items.exists():
        logger.info("No items found below reorder levels.")
        return

    groups_with_notification_permission = Group.objects.filter(
        permissions__name='CAN_RECEIVE_INVENTORY_NOTIFICATIONS'
    )
    if not groups_with_notification_permission.exists():
        logger.info("No groups found with the required notification permission.")
        return

    User = get_user_model()
    users_to_notify = User.objects.filter(group__in=groups_with_notification_permission).distinct()
    if not users_to_notify.exists():
        logger.info("No users found in groups with notification permissions.")
        return
    user_emails = list(users_to_notify.values_list('email', flat=True))

    channel_layer = get_channel_layer()
    for item in items:
        message = f"Low stock alert for {item.item.name}: Only {item.quantity_at_hand} items left."
        try:
            async_to_sync(channel_layer.group_send)(
                "inventory_notifications",
                {
                    "type": "send_notification",
                    "message": message,
                }
            )
        except Exception as ws_error:
            raise Exception(
                f"Failed to send WebSocket notification for {item.item.name}: {ws_error}"
            )

        try:
            send_mail(
                subject="Inventory Notification",
                message=message,
                from_email=settings.EMAIL_HOST_USER, 
                recipient_list=user_emails,
            )
        except Exception as email_error:
            logger.error(f"Error sending email for {item.item.name}: {email_error}")


@shared_task(bind=True, max_retries=3)
def inventory_garbage_collection(self):
    """
    Periodically checks and archives inventory items with zero quantity.
    """

    try:
        zero_quantity_items = Inventory.objects.filter(quantity_at_hand=0)
        
        if not zero_quantity_items.exists():
            logger.info("No zero-quantity items found to archive")
            return
        
        archived_count = 0
        for item in zero_quantity_items:
            try:
                with transaction.atomic():
                    archive = InventoryArchive.objects.create(
                        item=item.item,
                        purchase_price=item.purchase_price,
                        sale_price=item.sale_price,
                        quantity_at_hand=item.quantity_at_hand,
                        re_order_level=item.re_order_level,
                        date_created=item.date_created,
                        category_one=item.category_one,
                        lot_number=item.lot_number,
                        expiry_date=item.expiry_date,
                    )
                    
                    logger.info(
                        "Created archive record for item: %s (ID: %s)",
                        item.item.name,
                        item.item.id
                    )
                    
                    item.delete()
                    archived_count += 1
                    logger.info(
                        "Deleted original inventory record for: %s",
                        item.item.name
                    )
                
            except Exception as e:
                logger.error(
                    "Error processing item %s: %s",
                    item.item.name,
                    str(e),
                    exc_info=True
                )
                continue
        
        logger.info("Successfully archived %d items", archived_count)
        return f"Archived {archived_count} items"
        
    except Exception as e:
        logger.error(
            "Error in inventory garbage collection: %s",
            str(e),
            exc_info=True
        )
        # Retry the task if it fails
        self.retry(exc=e, countdown=60 * 5)


@shared_task
def deduct_test_kit(lab_test_panel_id):
    lab_test_panel = LabTestRequestPanel.objects.get(id=lab_test_panel_id)
    
    if lab_test_panel.is_billed:
        test_kit = TestKit.objects.filter(item=lab_test_panel.test_panel.item).first()
        
        if test_kit:
            test_kit_counters = TestKitCounter.objects.filter(lab_test_kit=test_kit, counter__gt=0).order_by('id')

            for test_kit_counter in test_kit_counters:
                if test_kit_counter.counter > 0:
                    test_kit_counter.counter -= 1
                    test_kit_counter.save()
                    break

