# import os
import logging
from asgiref.sync import async_to_sync
from celery import shared_task
from channels.layers import get_channel_layer
from datetime import timedelta
from collections import defaultdict
from django.conf import settings
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import F
from django.core.exceptions import ValidationError

User = get_user_model()

from .helpers import ( 
 get_active_prescriptions,
 get_due_doses,
 )

from authperms.models import Group
from celery import shared_task
from inpatient.models import PatientAdmission
from inventory.models import (
    Inventory, InventoryArchive
)
from laboratory.models import TestKitCounter, TestKit, LabTestRequestPanel


logger = logging.getLogger(__name__)


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
        inventory_records = Inventory.objects.filter(
            item=instance.item
        ).exclude(expiry_date__isnull=True).order_by('expiry_date')

        if not inventory_records.exists():
            raise ValidationError(f"No inventory record found for item: {instance.item.name}.")

        remaining_deduction = deductions

        with transaction.atomic():
            for inventory_record in inventory_records:
                if remaining_deduction <= 0:
                    break 

                if inventory_record.quantity_at_hand >= remaining_deduction:
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
                    remaining_deduction -= inventory_record.quantity_at_hand
                    inventory_record.quantity_at_hand = 0
                    inventory_record.save()
                    logger.info(
                        "Stock exhausted for item: %s, Lot: %s",
                        instance.item.name,
                        inventory_record.lot_number,
                    )

            if remaining_deduction > 0:
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


@shared_task(bind=True, max_retries=3)
def check_medication_notifications(self):
    """
    Periodically checks for prescriptions with doses due in the next hour and sends notifications.
    """
    try:
        now = timezone.now()
        one_hour_later = now + timedelta(hours=1)
        ward_messages = defaultdict(list)

        prescriptions = get_active_prescriptions(one_hour_later)
        if not prescriptions.exists():
            logger.info("No prescriptions due in the next hour.")
            return

        admissions = {
        a.patient_id: a
        for a in PatientAdmission.objects.filter(discharge__isnull=True)
        }

        for prescription in prescriptions:
            patient = prescription.attendanceprocess.patient
            admission = admissions.get(patient.id)
            if not admission:
                continue

            for drug in prescription.prescribeddrug_set.filter(is_dispensed=False):
                due_times = get_due_doses(drug, now, one_hour_later)
                for dose_time in due_times:
                    unit = drug.item.units_of_measure
                    dosage_display = (
                        f"{drug.dosage} {unit}" if unit != 'unit'
                        else f"{drug.dosage} {'tablets' if drug.item.category == 'Drug' else 'units'}"
                    )
                    entry = (
                        f"Patient {admission.admission_id} in bed {admission.bed.bed_number}, "
                        f"needs {dosage_display} of {drug.item.name} "
                        f"at {dose_time.strftime('%Y-%m-%d %H:%M')}."
                    )
                    ward_messages[admission.ward].append(entry)

        for ward, med_list in ward_messages.items():
            message = (
                "The following medications are due within the next hour:\n\n"
                + "\n".join(med_list)
                + "\n\nPlease collect them from the pharmacy."
            )
            send_ward_websocket_task.delay(ward.id, message)

    except Exception as e:
        logger.error(f"Error in check_medication_notifications: {e}", exc_info=True)
        self.retry(exc=e, countdown=60)



@shared_task(bind=True, max_retries=3)
def send_ward_websocket_task(self, ward_id, message):
    """
    Sends a WebSocket notification to all nurses in a ward's group.
    """
    try:
        from channels.layers import get_channel_layer
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"ward_{ward_id}_notifications",
            {
                'type': 'send_notification',
                'message': message
            }
        )
        logger.info(f"Sent WebSocket notification to ward {ward_id}.")
    except Exception as e:
        logger.error(f"Failed to send WebSocket for ward {ward_id}: {e}", exc_info=True)
        self.retry(exc=e, countdown=60)
