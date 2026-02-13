import random
import string
from django.db.models import Max, Sum
from .models import Item, PurchaseOrder, PurchaseOrderItem


def generate_unique_item_code():
    """
    Generates a unique item code in the format 'AAA-00000' or 'LAB-00000' etc.
    If a collision occurs, it tries again with a new random code.
    """
    
    while True:
        # Generate a random 3-letter prefix
        prefix = ''.join(random.choices(string.ascii_uppercase, k=3))
        
        # Find the maximum existing numerical suffix for the given prefix
        # This approach ensures uniqueness and sequential numbering within a prefix
        last_item = Item.objects.filter(item_code__startswith=f'{prefix}-').aggregate(Max('item_code'))
        
        if last_item['item_code__max']:
            try:
                last_number = int(last_item['item_code__max'].split('-')[1])
                new_number = last_number + 1
            except (ValueError, IndexError):
                # Fallback if parsing fails or prefix exists with non-numeric suffix
                new_number = 1
        else:
            new_number = 1

        # Format the new item code
        new_item_code = f'{prefix}-{new_number:05d}'

        # Check for absolute uniqueness (in case of rare collisions or non-standard existing codes)
        if not Item.objects.filter(item_code=new_item_code).exists():
            return new_item_code


def update_purchase_order_status(purchase_order):
    """
    Updates the status of a PurchaseOrder based on the received quantities of its items.
    """
    total_ordered = purchase_order.po_items.aggregate(Sum('quantity_ordered'))['quantity_ordered__sum'] or 0
    total_received = purchase_order.po_items.aggregate(Sum('quantity_received'))['quantity_received__sum'] or 0

    if total_received == 0:
        new_status = PurchaseOrder.Status.PENDING
    elif total_received >= total_ordered:
        new_status = PurchaseOrder.Status.COMPLETED
    else:
        new_status = PurchaseOrder.Status.PARTIAL
    
    if purchase_order.status != new_status:
        purchase_order.status = new_status
        purchase_order.save(update_fields=['status'])
