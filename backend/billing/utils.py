import logging

from inventory.services import stock as stock_service
from laboratory.models import LabTestRequest, LabTestRequestPanel
from patient.models import AttendanceProcess, PrescribedDrug

from .services import check_stock_available, dispensing_department

logger = logging.getLogger(__name__)


def update_service_billed_status(instance):
    '''
    When an InvoiceItem is saved, and the status field is changed to billed,
    we check if it's a Drug or a Lab Test. If it is, we update the is_billed
    field of the related PrescribedDrug or LabTestRequestPanel
    '''
    # TODO: Also update Consultation
    if instance.status == 'billed' and instance.item.category == 'Drug':
        try:
            prescription = instance.invoice.attendanceprocess.prescription
            prescribed_drug = PrescribedDrug.objects.filter(
                prescription=prescription,
                item=instance.item,
            ).first()

            if prescribed_drug:
                prescribed_drug.is_billed = True
                prescribed_drug.save()
        except AttendanceProcess.DoesNotExist:
            # The InvoiceItem is not associated with an AttendanceProcess
            pass

    if instance.status == 'billed' and instance.item.category == 'Lab Test':
        try:
            process_test_request = instance.invoice.attendanceprocess.process_test_req
            lab_test_panel = LabTestRequestPanel.objects.filter(
                test_panel__item=instance.item,
                lab_test_request__process=process_test_request,
            ).first()

            if lab_test_panel:
                lab_test_panel.is_billed = True
                lab_test_panel.save()
        except AttendanceProcess.DoesNotExist:
            # The invoice was raised on its own rather than for a visit, so
            # there is no lab request behind it to mark billed.
            pass


def get_available_stock(instance):
    '''
    Stock that can actually be promised for this invoice line: unexpired
    quantity at the dispensing location, minus anything already reserved.

    The old version summed every lot of the item everywhere, expired ones
    included, which is how expired drugs stayed sellable.
    '''
    item = instance.item
    if not item.is_stock_tracked:
        return 0
    return stock_service.available_quantity(item, dispensing_department(instance))


def check_quantity_availability(instance):
    '''
    Answer whether there is enough stock, and nothing else.

    Deducting stock is a separate, explicit step
    (`billing.services.post_stock_for_invoice_item`) so a failed save can never
    leave stock already gone.
    '''
    ok, message = check_stock_available(instance)
    if not ok:
        logger.info("Stock check failed for invoice item %s: %s", instance.pk, message)
    return ok
