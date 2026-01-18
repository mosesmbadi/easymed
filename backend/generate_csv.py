import os
import django
import csv
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'easymed.settings.development')
django.setup()

from inventory.models import Item, Inventory, Department, Supplier # Import other models if needed

def generate_item_csv():
    """Generates items.csv from the Item model."""
    filepath = '../../items.csv' # Path relative to backend/
    with open(filepath, 'w', newline='') as csvfile:
        fieldnames = [
            'id', 'item_code', 'name', 'desc', 'category', 'units_of_measure',
            'vat_rate', 'packed', 'subpacked', 'slow_moving_period',
            'buying_price', 'selling_price'
        ]
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)

        writer.writeheader()
        for item in Item.objects.all():
            writer.writerow({
                'id': item.id,
                'item_code': item.item_code,
                'name': item.name,
                'desc': item.desc,
                'category': item.category,
                'units_of_measure': item.units_of_measure,
                'vat_rate': float(item.vat_rate), # Convert Decimal to float for CSV
                'packed': item.packed,
                'subpacked': item.subpacked,
                'slow_moving_period': item.slow_moving_period,
                'buying_price': float(item.buying_price), # Property
                'selling_price': float(item.selling_price) # Property
            })
    print(f"Generated {filepath}")

def generate_inventory_csv():
    """Generates inventory.csv from the Inventory model."""
    filepath = '../../inventory.csv' # Path relative to backend/
    with open(filepath, 'w', newline='') as csvfile:
        fieldnames = [
            'id', 'item_name', 'purchase_price', 'sale_price', 'quantity_at_hand',
            're_order_level', 'category_one', 'lot_number', 'expiry_date', 'department_name'
        ]
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)

        writer.writeheader()
        for inventory_item in Inventory.objects.select_related('item', 'department').all():
            writer.writerow({
                'id': inventory_item.id,
                'item_name': inventory_item.item.name,
                'purchase_price': float(inventory_item.purchase_price),
                'sale_price': float(inventory_item.sale_price),
                'quantity_at_hand': inventory_item.quantity_at_hand,
                're_order_level': inventory_item.re_order_level,
                'category_one': inventory_item.category_one,
                'lot_number': inventory_item.lot_number,
                'expiry_date': inventory_item.expiry_date.isoformat() if inventory_item.expiry_date else '',
                'department_name': inventory_item.department.name
            })
    print(f"Generated {filepath}")

if __name__ == '__main__':
    generate_item_csv()
    generate_inventory_csv()
