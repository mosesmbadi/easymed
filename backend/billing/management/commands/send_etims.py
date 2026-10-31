"""
Send settled invoices to KRA eTIMS now: those that failed, those left pending
because no Celery broker was up, and -- with --backfill -- invoices settled
before eTIMS was configured.
"""
from django.core.management.base import BaseCommand

from billing.etims import submit
from billing.models import EtimsSubmission, Invoice
from integrations import etims


class Command(BaseCommand):
    help = "Send unsent settled invoices to KRA eTIMS."

    def add_arguments(self, parser):
        parser.add_argument('--backfill', action='store_true',
                            help="Also queue settled invoices that were never queued.")

    def handle(self, *args, backfill=False, **options):
        if not etims.is_configured():
            self.stdout.write(self.style.WARNING(
                "eTIMS is not configured: set ETIMS_ENABLED, ETIMS_BASE_URL, ETIMS_CMC_KEY "
                "and a KRA PIN."))
            return
        if backfill:
            for invoice in Invoice.objects.filter(status='paid', etims__isnull=True):
                EtimsSubmission.objects.get_or_create(invoice=invoice)
        sent = failed = 0
        for submission in EtimsSubmission.objects.exclude(status=EtimsSubmission.Status.SENT):
            if submit(submission):
                sent += 1
            else:
                failed += 1
        self.stdout.write(self.style.SUCCESS(f"Sent {sent} to eTIMS; {failed} still failing."))
