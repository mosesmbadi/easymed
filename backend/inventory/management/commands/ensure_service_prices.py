"""
Give every service item (lab tests, appointments) a cash price.

Services are billable but hold no stock, so they no longer need the fake
"9999 units in stock" inventory rows the old `ensure_service_inventory`
command created just to make billing find a price. Price lives in ItemPrice;
stock does not exist for these items at all.

Usage:
    python manage.py ensure_service_prices
    python manage.py ensure_service_prices --update-prices
"""

from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from inventory.models import Item
from inventory.services import stock as stock_service


class Command(BaseCommand):
    help = 'Ensure all service items have a cash price on the price list'

    def add_arguments(self, parser):
        parser.add_argument(
            '--update-prices',
            action='store_true',
            help='Overwrite existing prices with the defaults below',
        )
        parser.add_argument(
            '--lab-test-price',
            type=float,
            default=500.00,
            help='Default price for lab tests (default: 500.00)',
        )
        parser.add_argument(
            '--appointment-price',
            type=float,
            default=1000.00,
            help='Default price for appointments (default: 1000.00)',
        )

    def handle(self, *args, **options):
        update_prices = options['update_prices']
        lab_test_price = Decimal(str(options['lab_test_price']))
        appointment_price = Decimal(str(options['appointment_price']))

        service_config = {
            'Lab Test': lab_test_price,
            'General Appointment': appointment_price,
            'Specialized Appointment': appointment_price,
        }

        created_count = 0
        updated_count = 0
        skipped_count = 0

        with transaction.atomic():
            for category, default_price in service_config.items():
                items = Item.objects.filter(category=category)
                self.stdout.write(f'\nProcessing {items.count()} {category} items...')

                for item in items:
                    # Belt and braces: a service must never be stock tracked.
                    if item.is_stock_tracked:
                        Item.objects.filter(pk=item.pk).update(is_stock_tracked=False)

                    current = item.current_sale_price

                    if not current:
                        stock_service.set_sale_price(item, default_price)
                        created_count += 1
                        self.stdout.write(self.style.SUCCESS(
                            f'  + Priced {item.name} at {default_price}'))
                    elif update_prices and current != default_price:
                        stock_service.set_sale_price(item, default_price)
                        updated_count += 1
                        self.stdout.write(self.style.WARNING(
                            f'  ~ Repriced {item.name}: {current} -> {default_price}'))
                    else:
                        skipped_count += 1

        self.stdout.write('\n' + '=' * 60)
        self.stdout.write(self.style.SUCCESS(f'Priced {created_count} service items'))
        if update_prices:
            self.stdout.write(self.style.WARNING(f'Repriced {updated_count} service items'))
        self.stdout.write(f'Skipped {skipped_count} already-priced items')
        self.stdout.write('=' * 60)
