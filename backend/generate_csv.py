import os
import django
import csv
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'easymed.settings.development')
django.setup()

from inventory.models import Item, StockBalance, Department, Supplier # Import other models if needed
from inventory.services import stock as stock_service

def generate_item_csv():
    """Generates items.csv from the Item model."""
    filepath = '../../items.csv' # Path relative to backend/
    with open(filepath, 'w', newline='') as csvfile:
        fieldnames = [
            'id', 'item_code', 'name', 'desc', 'category', 'units_of_measure',
            'vat_rate', 'pack_name', 'units_per_pack', 'slow_moving_period',
            'buying_price', 'selling_price'
        ]
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)

        writer.writeheader()
        for item in Item.objects.all():
            pack = (
                item.unit_conversions.filter(is_purchase_default=True).first()
                or item.unit_conversions.first()
            )
            writer.writerow({
                'id': item.id,
                'item_code': item.item_code,
                'name': item.name,
                'desc': item.desc,
                'category': item.category,
                'units_of_measure': item.units_of_measure,
                'vat_rate': float(item.vat_rate), # Convert Decimal to float for CSV
                'pack_name': pack.name if pack else '',
                'units_per_pack': pack.factor_to_base if pack else '',
                'slow_moving_period': item.slow_moving_period,
                'buying_price': float(item.buying_price), # Property
                'selling_price': float(item.selling_price) # Property
            })
    print(f"Generated {filepath}")

def generate_inventory_csv():
    """Generates inventory.csv from the derived stock balances."""
    filepath = '../../inventory.csv' # Path relative to backend/
    with open(filepath, 'w', newline='') as csvfile:
        fieldnames = [
            'id', 'item_name', 'purchase_price', 'sale_price', 'quantity_at_hand',
            're_order_level', 'category_one', 'lot_number', 'expiry_date', 'department_name'
        ]
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)

        writer.writeheader()
        for balance in StockBalance.objects.select_related('item', 'lot', 'department').all():
            writer.writerow({
                'id': balance.id,
                'item_name': balance.item.name,
                'purchase_price': float(balance.unit_cost),
                'sale_price': float(balance.item.current_sale_price or 0),
                'quantity_at_hand': balance.quantity,
                're_order_level': stock_service.re_order_level_for(balance.item, balance.department),
                'category_one': balance.item.category_one,
                'lot_number': balance.lot.lot_number,
                'expiry_date': balance.lot.expiry_date.isoformat() if balance.lot.expiry_date else '',
                'department_name': balance.department.name
            })
    print(f"Generated {filepath}")

if __name__ == '__main__':
    generate_item_csv()
    generate_inventory_csv()
