from django.core.management.base import BaseCommand
from django.db import transaction

from company.models import InsuranceCompany
from inventory.models import InsuranceItemSalePrice, Item


class Command(BaseCommand):
    '''
    Seed a per-insurer price for every item that has a cash price, so billing
    never silently falls back to zero for an insured patient.

    usage: python manage.py populate_insurance_item_sale_prices
    '''
    help = 'Populate InsuranceItemSalePrice for all priced items and insurance companies if missing.'

    def handle(self, *args, **options):
        created_count = 0
        skipped_count = 0

        with transaction.atomic():
            insurance_companies = list(InsuranceCompany.objects.all())
            if not insurance_companies:
                self.stdout.write(self.style.WARNING('No insurance companies configured.'))
                return

            for item in Item.objects.all():
                sale_price = item.current_sale_price
                if not sale_price:
                    # Nothing to copy: the item has no cash price yet.
                    skipped_count += 1
                    continue

                for insurance_company in insurance_companies:
                    _, created = InsuranceItemSalePrice.objects.get_or_create(
                        item=item,
                        insurance_company=insurance_company,
                        defaults={'sale_price': sale_price},
                    )
                    created_count += int(created)

        self.stdout.write(self.style.SUCCESS(
            f'Created {created_count} InsuranceItemSalePrice records '
            f'({skipped_count} items skipped for having no cash price).'
        ))
