"""
Signals kept here are catalogue housekeeping only.

Stock is deliberately NOT touched from a signal. Every movement is posted from
an explicit call to `inventory.services.stock`, because stock changes that ride
on another model's save are impossible to order, impossible to roll back
predictably, and were the source of the lost updates this module used to have.
"""

from django.db import transaction
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .models import RequisitionItem


@receiver(post_save, sender=RequisitionItem)
@receiver(post_delete, sender=RequisitionItem)
def refresh_requisition_status(sender, instance, **kwargs):
    """
    Keep the parent requisition's status in step with its lines.

    Generating a purchase order flips `ordered` on the lines it covers, which
    is what moves a requisition to partially/fully ordered. This is status
    bookkeeping over facts already committed, not a stock movement, so the
    caveat at the top of this module does not apply.
    """
    requisition = instance.requisition
    if requisition is None:
        return
    transaction.on_commit(requisition.refresh_status)
