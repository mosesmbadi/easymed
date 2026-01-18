"""
Management command to ensure all service items (Lab Tests, Appointments) have inventory records.
Service items don't have physical stock but need inventory records for pricing.

Usage:
    python manage.py ensure_service_inventory
    python manage.py ensure_service_inventory --update-prices
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from inventory.models import Item, Inventory, Department
from decimal import Decimal


class Command(BaseCommand):
    help = 'Ensure all service items have inventory records with proper pricing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--update-prices',
            action='store_true',
            help='Update existing inventory prices for service items',
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

        # Get or create a department for services
        dept, created = Department.objects.get_or_create(
            name='General',
            defaults={'name': 'General'}
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'Created General department'))

        # Service item categories that need inventory records
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
                    # Check if inventory exists
                    inv = Inventory.objects.filter(item=item).first()

                    if not inv:
                        # Create inventory record
                        Inventory.objects.create(
                            item=item,
                            department=dept,
                            purchase_price=Decimal('0.00'),  # Service items have no purchase cost
                            sale_price=default_price,
                            quantity_at_hand=9999,  # Services have unlimited quantity
                            category_one='Internal',
                            lot_number='SERVICE-001',
                            expiry_date='2030-12-31'
                        )
                        created_count += 1
                        self.stdout.write(
                            self.style.SUCCESS(
                                f'  ✓ Created inventory for: {item.name} - Price: {default_price}'
                            )
                        )
                    elif update_prices and inv.sale_price != default_price:
                        # Update existing inventory price
                        old_price = inv.sale_price
                        inv.sale_price = default_price
                        inv.save(update_fields=['sale_price'])
                        updated_count += 1
                        self.stdout.write(
                            self.style.WARNING(
                                f'  ⟳ Updated {item.name}: {old_price} -> {default_price}'
                            )
                        )
                    else:
                        skipped_count += 1

        # Summary
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS(f'✓ Created {created_count} new inventory records'))
        if update_prices:
            self.stdout.write(self.style.WARNING(f'⟳ Updated {updated_count} existing records'))
        self.stdout.write(f'- Skipped {skipped_count} existing records')
        self.stdout.write('='*60)

        if created_count > 0 or updated_count > 0:
            self.stdout.write(
                self.style.SUCCESS(
                    '\nService items now have proper pricing! '
                    'New invoice items will pick up these prices automatically.'
                )
            )
