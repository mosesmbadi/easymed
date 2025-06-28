import logging
from django.dispatch import receiver
from django.db import transaction
from django.db.models import Q
from django.db.models import F
from django.db.models.signals import post_save, post_delete
from django.db.models import Sum
from django.db import models
from django.utils import timezone


from .utils import update_purchase_order_status
from .models import (
    PurchaseOrderItem,
    IncomingItem,
    Inventory
)
from .tasks import (create_insurance_prices_for_inventory)

logger=logging.getLogger(__name__)

# There's a painful Race Condition when this is moved to celery
@receiver(post_save, sender=IncomingItem)
def update_inventory_after_incomingitem_creation(sender, instance, created, **kwargs):
    if created:
        try:
            with transaction.atomic():
                # Check if there is an existing inventory record for the same item and lot number
                # TODO: Add another check, expiry date, but could be redundant
                inventory = Inventory.objects.filter(
                    item=instance.item,
                    lot_number=instance.lot_no
                ).first()

                if inventory:
                    # Update the existing inventory record
                    inventory.quantity_at_hand += instance.quantity
                    inventory.purchase_price = instance.purchase_price
                    inventory.sale_price = instance.sale_price
                    inventory.expiry_date = instance.expiry_date
                    inventory.save()
                else:
                    # Create a new inventory record if lot number does not exist
                    Inventory.objects.create(
                        item=instance.item,
                        purchase_price=instance.purchase_price,
                        sale_price=instance.sale_price,
                        quantity_at_hand=instance.quantity,
                        category_one=instance.category_one,
                        lot_number=instance.lot_no,
                        expiry_date=instance.expiry_date,
                        department=instance.purchase_order.requisition.department
                    )
        except Exception as e:
            # Handle the exception appropriately (e.g., log the error)
            print(f"Error updating inventory for incoming item: {instance.id}, Error: {e}")


@receiver([post_save, post_delete], sender=IncomingItem)
def update_supplier_invoice_amount(sender, instance, **kwargs):
    """
    Update the SupplierInvoice amount whenever an IncomingItem is created, updated, or deleted.
    The amount is calculated as the sum of (purchase_price * quantity) for all related IncomingItems.
    """
    if instance.supplier_invoice:
        try:
            with transaction.atomic():
                supplier_invoice = instance.supplier_invoice

                # Calculate total amount from all related IncomingItems
                total_amount = IncomingItem.objects.filter(
                    supplier_invoice=supplier_invoice
                ).aggregate(
                    total=Sum(models.F('purchase_price') * models.F('quantity'))
                )['total'] or 0.00
                
                # Update the supplier invoice amount
                supplier_invoice.amount = total_amount
                supplier_invoice.save()
        except Exception as e:
            print(f"Error updating supplier invoice amount: {e}")


@receiver([post_save], sender=IncomingItem)
def update_purchase_order_item_quantity_received(sender, instance, **kwargs):
    with transaction.atomic():
        purchase_order_item = PurchaseOrderItem.objects.filter(purchase_order=instance.purchase_order,
                        requisition_item__item=instance.item).first()

        if purchase_order_item:
            if instance.quantity:
                purchase_order_item.quantity_received = instance.quantity
                purchase_order_item.save()

                update_purchase_order_status(purchase_order_item.purchase_order)


@receiver(post_delete, sender=IncomingItem)
def update_purchase_order_item_quantity_received_on_delete(sender, instance, **kwargs):
    with transaction.atomic():
        purchase_order_item = PurchaseOrderItem.objects.filter(
            purchase_order=instance.purchase_order,
            requisition_item__item=instance.item  
        ).first()

        if purchase_order_item:
            purchase_order_item.quantity_received = instance.quantity
            purchase_order_item.save()

            update_purchase_order_status(purchase_order_item.purchase_order)

@receiver(post_save, sender=Inventory)
def update_last_deducted_on(sender, instance, **kwargs):
        old_instance = Inventory.objects.get(pk=instance.pk)

        if instance.quantity_at_hand < old_instance.quantity_at_hand:
            instance.last_deducted_on = timezone.now()
            instance.save()
    

@receiver(post_save, sender=Inventory)
def create_default_insurance_prices(sender, instance, created, **kwargs):
    '''
    Creates a default insurance price for the item whenver an inventory record
    is created for that item. This will make blind errors/bugs less common for
    billing
    '''
    if created:
        create_insurance_prices_for_inventory.delay(instance.id)