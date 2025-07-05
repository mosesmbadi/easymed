from django.core.management.base import BaseCommand
from inventory.models import Item, Inventory, InsuranceItemSalePrice
from company.models import InsuranceCompany
from django.db import transaction

class Command(BaseCommand):
    '''
    This is only helpful if you already have the items and Inventory records, and don't 
    want to deal with silent bugs in billing. i.e if you generate dummy data, you most
    certainly have the items and inventory records and will need this command

    usage: python manage.py populate_insurance_item_sale_prices
    '''
    help = 'Populate InsuranceItemSalePrice for all items and insurance companies if missing.'

    def handle(self, *args, **options):
        created_count = 0
        with transaction.atomic():
            insurance_companies = InsuranceCompany.objects.all()
            for item in Item.objects.all():
                # Get the sale price from the first active inventory for this item
                inventory = item.active_inventory_items.first()
                if not inventory:
                    continue  # Skip items with no inventory
                sale_price = inventory.sale_price
                for insurance_company in insurance_companies:
                    exists = InsuranceItemSalePrice.objects.filter(
                        item=item, insurance_company=insurance_company
                    ).exists()
                    if not exists:
                        InsuranceItemSalePrice.objects.create(
                            item=item,
                            insurance_company=insurance_company,
                            sale_price=sale_price,
                        )
                        created_count += 1
        self.stdout.write(self.style.SUCCESS(f'Created {created_count} InsuranceItemSalePrice records.'))
