
from rest_framework.exceptions import ValidationError
from rest_framework import serializers
from .models import RequisitionItem, Supplier

def validate_requisition_item_uniqueness(requisition_id, item, preferred_supplier,
                                         quantity_requested, item_unit=None):
    """
    Ensure requisition item uniqueness or flag quantity update if it exists.

    The ordering unit is part of what makes a line unique: six boxes and four
    loose units of the same item are two separate lines, because adding them
    together would produce ten of nothing.
    """
    existing_item = RequisitionItem.objects.filter(
        requisition_id=requisition_id,
        item=item,
        preferred_supplier=preferred_supplier,
        item_unit=item_unit,
    ).first()

    if existing_item:
        return {
            "exists": True,
            "previous_quantity": existing_item.quantity_requested,
            "new_quantity": existing_item.quantity_requested + quantity_requested,
            "existing_item": existing_item,
        }
    return {"exists": False}

def assign_default_supplier(attrs):
    """
    Assign a default supplier if none is provided.
    """
    if not attrs.get('preferred_supplier'):
        default_supplier = Supplier.objects.first()
        if not default_supplier:
            raise ValidationError("No supplier is available. Please add a supplier first.")
        print(f"Assigning default supplier: {default_supplier.official_name}")
        attrs['preferred_supplier'] = default_supplier


def greater_than_zero(field_name):
    def validator(value):
        if value is None:
            return value

        try:
            value = int(value)
        except (ValueError, TypeError):
            raise serializers.ValidationError("Invalid quantity. Please enter a number.") #Changed Here!

        if value <= 0:
            raise serializers.ValidationError(f"{field_name} must be greater than 0.") #Changed Here!
        return value
    return validator