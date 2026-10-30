"""
Recompute every stock balance from the ledger and report the drift.

Because StockMovement is the source of truth, this is always safe to run. Any
drift it reports means something wrote stock outside
`inventory.services.stock` -- that is a bug worth chasing, not a number worth
quietly fixing.

Usage:
    python manage.py rebuild_stock_balances --check   # report only, exit 1 on drift
    python manage.py rebuild_stock_balances           # report and repair
"""

from django.core.management.base import BaseCommand

from inventory.models import Department, Item, StockLot
from inventory.services import stock as stock_service


class Command(BaseCommand):
    help = 'Rebuild StockBalance rows from the StockMovement ledger'

    def add_arguments(self, parser):
        parser.add_argument(
            '--check',
            action='store_true',
            help='Report drift without correcting it; exits 1 when drift is found',
        )

    def handle(self, *args, **options):
        check_only = options['check']
        drift = stock_service.rebuild_balances(dry_run=check_only)

        if not drift:
            self.stdout.write(self.style.SUCCESS(
                'Stock balances agree with the ledger. No drift.'))
            return

        items = Item.objects.in_bulk({row['item_id'] for row in drift})
        lots = StockLot.objects.in_bulk({row['lot_id'] for row in drift})
        departments = Department.objects.in_bulk({row['department_id'] for row in drift})

        self.stdout.write(self.style.ERROR(f'Drift found on {len(drift)} balance rows:'))
        for row in drift:
            item = items.get(row['item_id'])
            lot = lots.get(row['lot_id'])
            department = departments.get(row['department_id'])
            self.stdout.write(
                f"  {item.name if item else row['item_id']} "
                f"@ {department.name if department else row['department_id']} "
                f"[{lot.lot_number or 'no-lot' if lot else row['lot_id']}]: "
                f"cached={row['cached']} ledger={row['ledger']}"
            )

        if check_only:
            self.stderr.write(self.style.ERROR(
                'Run without --check to repair, then find what wrote stock outside the service layer.'))
            raise SystemExit(1)

        self.stdout.write(self.style.SUCCESS(f'Repaired {len(drift)} balance rows from the ledger.'))
