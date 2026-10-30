import logging
from datetime import timedelta

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone


from .models import (
    Prescription, PrescribedDrug,
    AttendanceProcess
)
from inventory.models import Department, StockMovement
from inventory.services import stock as stock_service
from inventory.services.stock import InsufficientStock, StockError


logger = logging.getLogger(__name__)


@receiver(pre_save, sender=AttendanceProcess)
def doctor_assigned_signal(sender, instance, **kwargs):
    print("doctor_assigned_signal Signal fired")
    
    if instance.pk:
        old_instance = AttendanceProcess.objects.get(pk=instance.pk)
        print(f"Old doctor: {old_instance.doctor}, New doctor: {instance.doctor}")
        
        if old_instance.doctor != instance.doctor and instance.doctor:
            print("Doctor assigned or changed. Triggering notification.")
            appointment_assign_notification(instance.id)


from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
# TODO: Move such 'helper functions' to their own files
# there's another race issue when this is moved to celery
def appointment_assign_notification(attendance_process_id):
    print(f'Sending assign notifications for attendance process: {attendance_process_id}')
    try:
        # Fetch the attendance process
        attendance_process = AttendanceProcess.objects.get(id=attendance_process_id)
        # doctor_name = attendance_process.doctor.first_name
        message = f"Dr. {'doctor_name'}, you have been assigned an appointment with track number {attendance_process.track_number}."
        
        # Send notification using Django Channels
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "doctor_notifications",
            {
                'type': 'send_notification',
                'message': message,
            }
        )
    except AttendanceProcess.DoesNotExist:
        logger.error(f"Attendance process with ID {attendance_process_id} not found.")
        pass




@receiver(post_save, sender=PrescribedDrug)
def reserve_stock_for_prescription(sender, instance, created, **kwargs):
    '''
    Hold stock for a newly prescribed drug so it cannot be promised twice
    between prescribing and dispensing.

    The stock itself leaves when the drug is billed
    (billing.services.post_stock_for_invoice_item) -- prescribing is a promise,
    not a movement. The previous version of this handler tried to decrement a
    field called `quantity_in_stock`, which has never existed on Inventory.
    '''
    if not created or instance.is_dispensed:
        return

    item = instance.item
    if not item.is_stock_tracked:
        return

    department = (
        Department.objects.filter(name__iexact='Pharmacy', is_stock_location=True).first()
    )
    try:
        department = department or stock_service.default_department()
        stock_service.reserve(
            item=item,
            department=department,
            quantity=instance.quantity,
            expires_at=timezone.now() + timedelta(hours=24),
            reason=f"Prescribed drug #{instance.pk}",
            source_type=StockMovement.Source.INVOICE_ITEM,
            source_id=instance.pk,
        )
    except InsufficientStock as exc:
        # Prescribing is allowed to outrun stock; the pharmacy needs to see the
        # request. Billing is where the hard stop lives.
        logger.warning("Could not reserve stock for prescribed drug %s: %s", instance.pk, exc)
    except StockError as exc:
        logger.error("Stock error reserving for prescribed drug %s: %s", instance.pk, exc)