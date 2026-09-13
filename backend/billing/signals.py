import logging

from django.db.models.signals import post_save, pre_save, post_delete
from django.dispatch import receiver
from django.core.exceptions import ValidationError
from django.db.models import Sum

from .services import check_stock_available, post_stock_for_invoice_item
from .utils import update_service_billed_status
from inventory.services.stock import InsufficientStock, StockError
from .models import InvoiceItem, InvoicePayment

logger = logging.getLogger(__name__)


@receiver(post_save, sender=InvoiceItem)
def update_invoice_on_item_save(sender, instance, created, **kwargs):
    """
    Update the total_cash and invoice_amount fields in the Invoice model
    when an InvoiceItem is created or updated.
    """
    if instance.invoice:
        invoice = instance.invoice

        # Recalculate total invoice amount
        invoice.invoice_amount = invoice.invoice_items.aggregate(
            total_amount=Sum('actual_total')
        )['total_amount'] or 0

        # Recalculate total_cash (sum of items with payment mode "Cash")
        invoice.total_cash = invoice.invoice_items.filter(
            payment_mode__payment_category='cash'
        ).aggregate(
            total_cash=Sum('actual_total')
        )['total_cash'] or 0

        invoice.save()


@receiver(post_delete, sender=InvoiceItem)
def update_invoice_on_item_delete(sender, instance, **kwargs):
    """
    Update the total_cash and invoice_amount fields in the Invoice model
    when an InvoiceItem is deleted.
    """
    if instance.invoice:
        invoice = instance.invoice

        # Recalculate totals after deletion
        invoice.invoice_amount = invoice.invoice_items.aggregate(
            total_amount=Sum('actual_total')
        )['total_amount'] or 0

        invoice.total_cash = invoice.invoice_items.filter(
            payment_mode__payment_category='cash'
        ).aggregate(
            total_cash=Sum('actual_total')
        )['total_cash'] or 0

        invoice.save()



@receiver(post_save, sender=InvoiceItem)
def update_is_billed_status(sender, instance, **kwargs):
    '''
    When an InvoiceItem is saved, and the status field is changed to billed,
    we check if it's a Drug or a Lab Test. If it is, we update the is_billed
    field of the related PrescribedDrug or LabTestRequestPanel
    '''
    # TODO: Also update Consulation
    # Check if the item is a Drug or Lab Test to update billed status accordingly
    if instance.item.category in ['Drug', 'Lab Test']:
        update_service_billed_status(instance)     



def _is_becoming_billed(instance):
    """True when this save flips the line from not-billed to billed."""
    if instance.status != 'billed':
        return False
    if not instance.pk:
        return True
    previous = InvoiceItem.objects.filter(pk=instance.pk).values_list('status', flat=True).first()
    return previous is not None and previous != 'billed'


@receiver(pre_save, sender=InvoiceItem)
def check_quantity_before_billing(sender, instance, **kwargs):
    '''
    Reject the save when there is not enough stock to bill the line.

    This handler only CHECKS. Stock is issued after the line is safely saved,
    by post_stock_after_billing below -- so a validation failure downstream can
    no longer leave stock already deducted.
    '''
    if not _is_becoming_billed(instance):
        return

    instance._became_billed = True

    ok, message = check_stock_available(instance)
    if not ok:
        raise ValidationError(message)


@receiver(post_save, sender=InvoiceItem)
def post_stock_after_billing(sender, instance, created, **kwargs):
    '''
    Issue the stock the line consumes, once the line itself is committed.

    Idempotent on the invoice item id, so a re-save or a duplicated signal
    cannot dispense the same drug twice.
    '''
    if not getattr(instance, '_became_billed', False):
        return
    instance._became_billed = False

    try:
        post_stock_for_invoice_item(instance)
    except InsufficientStock as exc:
        # The pre_save check passed but stock went in the meantime. Fail the
        # transaction rather than billing something we cannot hand over.
        raise ValidationError(str(exc))
    except StockError as exc:
        logger.exception("Could not post stock for invoice item %s: %s", instance.pk, exc)
        raise ValidationError(str(exc))


# `calculate_actual_total` used to live here, as a pre_save that recomputed
# `actual_total` as item_amount - co_pay. It ran AFTER InvoiceItem.save() had
# already set the field, using the opposite convention, against an item_amount
# that held only the insurer portion -- so every insurance line was billed at
# the insurer price less the co-pay and the hospital under-charged insurers by
# exactly what the patient had already contributed. Pricing now has a single
# writer, `InvoiceItem.get_pricing_for_item`, and nothing here touches money.


# update Invoice.cash_paid when InvoicePayment is saved
@receiver(post_save, sender=InvoicePayment)
def update_invoice_cash_paid(sender, instance, created, **kwargs):
    if created:
        instance.invoice.cash_paid += instance.payment_amount
        instance.invoice.save()

