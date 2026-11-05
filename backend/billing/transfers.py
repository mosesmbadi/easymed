"""
Moving money between the facility's own accounts.

A transfer changes where the money is, not how much there is: it comes off one
sub-account's balance and onto another's. See AccountTransfer.
"""
from django.db import transaction
from django.utils import timezone

from .models import AccountTransfer, SubAccount


class TransferError(Exception):
    """The transfer can't be made; the message says why."""


@transaction.atomic
def make_transfer(*, from_account, to_account, amount, transfer_date=None, note='',
                  created_by=None, reversal_of=None):
    if from_account.pk == to_account.pk:
        raise TransferError("Choose a different account to transfer to.")
    if amount <= 0:
        raise TransferError("The amount to transfer must be more than zero.")

    today = timezone.localdate()
    transfer_date = transfer_date or today
    # Balances are not worked out by date, so a future transfer would move the
    # money today while claiming it had not moved yet.
    if transfer_date > today:
        raise TransferError("A transfer can't be dated in the future.")

    # Locked in id order so two opposite transfers at once can't deadlock.
    accounts = {account.pk: account for account in SubAccount.objects.select_for_update().filter(
        pk__in=[from_account.pk, to_account.pk]).order_by('pk')}
    source, destination = accounts[from_account.pk], accounts[to_account.pk]

    for account in (source, destination):
        if not account.active:
            raise TransferError(f"{account.name} is not active.")

    balance = source.balance
    if amount > balance:
        raise TransferError(
            f"{source.name} only has {balance}, so {amount} can't be transferred from it.")

    return AccountTransfer.objects.create(
        from_account=source, to_account=destination, amount=amount, transfer_date=transfer_date,
        note=note, created_by=created_by, reversal_of=reversal_of)


@transaction.atomic
def reverse_transfer(transfer, created_by=None):
    """Send a transfer's money back with a new transfer dated today, leaving the original on record."""
    transfer = AccountTransfer.objects.select_for_update().get(pk=transfer.pk)
    if transfer.reversal_of_id:
        raise TransferError("This is already a reversal. Make a new transfer instead.")
    if AccountTransfer.objects.filter(reversal_of=transfer).exists():
        raise TransferError(f"{transfer.reference} has already been reversed.")

    return make_transfer(
        from_account=transfer.to_account, to_account=transfer.from_account,
        amount=transfer.amount, note=f"Reversal of {transfer.reference}",
        created_by=created_by, reversal_of=transfer)
