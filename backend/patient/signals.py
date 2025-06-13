import logging
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.core.mail import send_mail
from django.conf import settings


from .models import (
    Prescription, PrescribedDrug,
    AttendanceProcess
)
from inventory.models import Inventory


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
def update_inventory(sender, instance, created, **kwargs):
    '''
    Signal to update Invetory when PrescribedDrug is_dispensed==True
    It retrieves the corresponding inventory item, checks if there is enough stock,
    subtracts the prescribed quantity from the inventory, and saves the updated inventory item.
    '''
    if created and instance.is_dispensed:
        try:
            inventory_item = Inventory.objects.get(item=instance.item)
            if inventory_item.quantity_in_stock >= instance.quantity:
                inventory_item.quantity_in_stock -= instance.quantity
                inventory_item.save()
            else:
                # Handle the case where there isn't enough inventory
                print(f"Not enough inventory for {instance.item.name}")
        except Inventory.DoesNotExist:
            # Handle the case where the item doesn't exist in the inventory
            print(f"Inventory record not found for {instance.item.name}")