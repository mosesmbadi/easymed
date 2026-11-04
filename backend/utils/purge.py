"""
Deleting records that other records depend on.

A plain DELETE still refuses anything with history. That protection is what
keeps real patients' invoices and the stock ledger honest. But a clinic going
live also has to clear out demo patients and stock that never existed, and
leaving those behind is what makes stock values wrong. So an admin who has been
shown what will go can override the refusal with `?force=true`.

An override takes the dependent records with it, and puts right what they had
already done elsewhere: stock a removed sale took out goes back through the
ledger, holds on stock are released, and a receipt that also paid for other
things shrinks instead of overstating them.
"""
import logging
from collections import defaultdict

from django.contrib.admin.utils import NestedObjects
from django.db import router, transaction
from django.db.models import ProtectedError, RestrictedError, Sum
from rest_framework import status
from rest_framework.response import Response

from authperms.permissions import IsSystemsAdminUser

logger = logging.getLogger(__name__)


def deletion_impact(instance):
    """What deleting `instance` would touch, as [{'label', 'count'}], biggest first."""
    collector = NestedObjects(using=router.db_for_write(type(instance)))
    collector.collect([instance])

    counts = defaultdict(int)
    for model, objects in collector.model_objs.items():
        if model is not type(instance):
            counts[str(model._meta.verbose_name_plural)] += len(objects)
    for blocker in collector.protected:
        counts[str(blocker._meta.verbose_name_plural)] += 1
    return [{'label': label, 'count': count}
            for label, count in sorted(counts.items(), key=lambda row: -row[1])]


def purge_queryset(queryset):
    """
    Delete these rows and, first, everything that protects them.

    Goes through the queryset rather than Model.delete(): the stock ledger's
    append-only guard is on the instance, and is rightly in the way of anything
    except this.
    """
    while True:
        try:
            return queryset.delete()
        except (ProtectedError, RestrictedError) as exc:
            blockers = (exc.protected_objects if isinstance(exc, ProtectedError)
                        else exc.restricted_objects)
            by_model = defaultdict(set)
            for blocker in blockers:
                by_model[type(blocker)].add(blocker.pk)
            for model, pks in by_model.items():
                purge_queryset(model._base_manager.filter(pk__in=pks))


def _delete_row(instance):
    return purge_queryset(type(instance)._base_manager.filter(pk=instance.pk))


def _reverse_movements(source_type, source_ids, reason, user):
    """Contra entries, so the ledger still explains the stock it now shows."""
    from inventory.models import StockMovement
    from inventory.services import stock as stock_service

    movements = StockMovement.objects.filter(
        source_type=source_type, source_id__in=list(source_ids), reversals__isnull=True,
    ).exclude(movement_type=StockMovement.Type.REVERSAL)
    for movement in movements:
        stock_service.reverse(movement, reason=reason[:255], performed_by=user)


def _shrink_receipts(lines):
    """
    A receipt only covering these lines goes with them. One that also paid for
    other things, as an insurer's settlement does, drops by what these took.
    """
    from billing.models import PaymentAllocation, PaymentReceipt

    line_ids = list(lines.values_list('pk', flat=True))
    taken = PaymentAllocation.objects.filter(invoice_item__in=line_ids).values('receipt').annotate(
        total=Sum('amount_applied'))
    for row in taken:
        receipt = PaymentReceipt.objects.get(pk=row['receipt'])
        if receipt.allocations.exclude(invoice_item__in=line_ids).exists():
            receipt.total_amount = max(receipt.total_amount - row['total'], 0)
            receipt.save(update_fields=['total_amount'])
        else:
            receipt.delete()


def _undo_lines(lines, reason, user):
    from inventory.models import StockMovement

    _reverse_movements(StockMovement.Source.INVOICE_ITEM, lines.values_list('pk', flat=True), reason, user)
    _shrink_receipts(lines)


def _undo_lab_runs(request_panels, reason, user):
    from inventory.models import StockMovement

    _reverse_movements(StockMovement.Source.LAB_TEST, request_panels.values_list('pk', flat=True), reason, user)


@transaction.atomic
def purge_patient(patient, user=None):
    from billing.models import Invoice, InvoiceItem
    from inventory.models import StockMovement, StockReservation
    from inventory.services import stock as stock_service
    from laboratory.models import LabTestRequestPanel, PatientSample, ProcessTestRequest
    from patient.models import AttendanceProcess, PrescribedDrug, Prescription, Triage

    reason = f"Patient {patient.pk} removed by an admin"
    visits = AttendanceProcess.objects.filter(patient=patient)
    process_ids = list(visits.values_list('process_test_req_id', flat=True))
    triage_ids = list(visits.values_list('triage_id', flat=True))
    prescription_ids = list(visits.values_list('prescription_id', flat=True))

    invoices = Invoice.objects.filter(patient=patient)
    _undo_lines(InvoiceItem.objects.filter(invoice__in=invoices), reason, user)
    _undo_lab_runs(LabTestRequestPanel.objects.filter(lab_test_request__process__in=process_ids), reason, user)
    _reverse_movements(
        StockMovement.Source.SAMPLE_COLLECTION,
        PatientSample.objects.filter(process__in=process_ids).values_list('pk', flat=True),
        reason, user)

    # Holds on stock point at the prescription by id, so nothing cascades to them.
    prescribed = PrescribedDrug.objects.filter(prescription__in=prescription_ids).values_list('pk', flat=True)
    for reservation in StockReservation.objects.filter(
            source_type=StockMovement.Source.INVOICE_ITEM, source_id__in=list(prescribed),
            status=StockReservation.Status.ACTIVE):
        stock_service.release_reservation(reservation)

    # A visit points up at these, so deleting the visit would leave them behind.
    purge_queryset(invoices)
    purge_queryset(ProcessTestRequest.objects.filter(pk__in=process_ids))
    purge_queryset(Triage.objects.filter(pk__in=triage_ids))
    purge_queryset(Prescription.objects.filter(pk__in=prescription_ids))
    _delete_row(patient)


@transaction.atomic
def purge_item(item, user=None):
    from billing.models import InvoiceItem
    from laboratory.models import LabTestRequestPanel

    reason = f"Item {item.name} removed by an admin"
    _undo_lines(InvoiceItem.objects.filter(item=item), reason, user)
    _undo_lab_runs(LabTestRequestPanel.objects.filter(test_panel__item=item), reason, user)
    _delete_row(item)


@transaction.atomic
def purge_lab_panel(panel, user=None):
    """A panel's billing item exists only for it, and takes it along."""
    if panel.item_id:
        purge_item(panel.item, user)
    else:
        _delete_row(panel)


@transaction.atomic
def purge_lab_profile(profile, user=None):
    from laboratory.models import LabTestPanel

    for sub_profile in profile.sub_profiles.all():
        purge_lab_profile(sub_profile, user)
    for panel in LabTestPanel.objects.filter(test_profile=profile):
        purge_lab_panel(panel, user)
    item = profile.item if profile.item_id else None
    _delete_row(profile)
    if item:
        purge_item(item, user)


@transaction.atomic
def purge_stock_row(balance, user=None):
    """One line of the inventory grid: a lot at a location, with its ledger history."""
    from inventory.models import StockBalance, StockMovement, StockReservation

    lot = balance.lot
    StockReservation.objects.filter(
        lot=lot, department=balance.department, status=StockReservation.Status.ACTIVE,
    ).update(status=StockReservation.Status.RELEASED)
    purge_queryset(StockMovement.objects.filter(lot=lot, department=balance.department))
    _delete_row(balance)
    if not StockBalance.objects.filter(lot=lot).exists():
        _delete_row(lot)


class ForceDeleteMixin:
    """
    Admin-only deletes for a viewset that defines `purge(instance, user)`.

    DELETE refuses with a 409 listing what is in the way, which is what the
    screen shows the admin. DELETE ?force=true then removes it all.
    """

    def get_permissions(self):
        if self.action == 'destroy':
            return [IsSystemsAdminUser()]
        return super().get_permissions()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        description = f"{type(instance).__name__} #{instance.pk} ({instance})"

        if str(request.query_params.get('force', '')).lower() in ('1', 'true'):
            with transaction.atomic():
                self.purge(instance, request.user)
            logger.warning("%s force-deleted by %s", description, request.user)
            return Response(status=status.HTTP_204_NO_CONTENT)

        try:
            with transaction.atomic():
                self.perform_destroy(instance)
        except (ProtectedError, RestrictedError):
            return Response({
                'error_message': "This can't be deleted because other records depend on it.",
                'dependents': deletion_impact(instance),
                'can_force': True,
            }, status=status.HTTP_409_CONFLICT)
        return Response(status=status.HTTP_204_NO_CONTENT)
