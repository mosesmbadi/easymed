import logging

from celery import shared_task
from django.contrib.auth import get_user_model
from django.db import transaction

from inventory.models import StockMovement
from inventory.services import stock as stock_service
from inventory.services.stock import StockError
from laboratory.models import (
    LabTestRequestPanel,
    PatientSample,
    PatientSampleConsumable,
    ReagentConsumptionLog,
    TestPanelReagent,
)
from laboratory.utils import lab_department, reagent_threshold

User = get_user_model()

logger = logging.getLogger(__name__)


@shared_task
def deduct_test_kit(lab_test_panel_id):
    """
    Consume reagent stock when a lab test has been run.

    For each reagent linked to the test panel via TestPanelReagent, post a
    CONSUMPTION movement (FEFO across lots) and write an audit log entry.

    The trigger is a result being recorded, not the invoice being paid: a test
    consumes its reagent on the bench, and billing can happen well before the
    sample is even drawn. Affording the test and running it are different
    events, and only the second one moves stock.

    Idempotent per (panel, reagent): the panel's post_save fires on every save
    once a result exists, and without this the same test would consume reagents
    again each time somebody touched the row.
    """
    try:
        lab_test_panel = LabTestRequestPanel.objects.select_related(
            'test_panel',
            'patient_sample__process__attendanceprocess__patient',
        ).get(id=lab_test_panel_id)

        if not lab_test_panel.result:
            logger.warning("Lab test panel %s has no result yet", lab_test_panel_id)
            return

        try:
            patient = lab_test_panel.patient_sample.process.attendanceprocess.patient
            patient_name = f"{patient.first_name} {patient.second_name}"
        except Exception:
            patient_name = "Unknown"

        reagent_links = TestPanelReagent.objects.filter(
            test_panel=lab_test_panel.test_panel).select_related('reagent_item')

        if not reagent_links.exists():
            logger.info("No reagents configured for test panel: %s", lab_test_panel.test_panel.name)
            return

        department = lab_department()
        warnings = []

        with transaction.atomic():
            for link in reagent_links:
                reagent = link.reagent_item
                units = link.units_consumed_per_run
                idempotency_key = f"lab-panel:{lab_test_panel.id}:reagent:{reagent.id}"

                if StockMovement.objects.filter(
                    idempotency_key__startswith=f"{idempotency_key}:"
                ).exists():
                    logger.info(
                        "Reagent %s already consumed for panel %s; skipping",
                        reagent.name, lab_test_panel.id)
                    continue

                stock_before = stock_service.on_hand_quantity(reagent, department)

                try:
                    movements = stock_service.issue(
                        item=reagent,
                        department=department,
                        quantity=units,
                        movement_type=StockMovement.Type.CONSUMPTION,
                        performed_by=getattr(lab_test_panel, 'lab_test_request', None)
                        and lab_test_panel.lab_test_request.requested_by,
                        reason=f"Ran {lab_test_panel.test_panel.name}",
                        source_type=StockMovement.Source.LAB_TEST,
                        source_id=lab_test_panel.id,
                        allow_partial=True,
                        idempotency_key=idempotency_key,
                    )
                except StockError as exc:
                    logger.error("Could not consume %s for panel %s: %s",
                                 reagent.name, lab_test_panel.id, exc)
                    warnings.append(str(exc))
                    continue

                deducted = sum(-m.quantity for m in movements)
                stock_after = stock_service.on_hand_quantity(reagent, department)

                if deducted < units:
                    warnings.append(
                        f"INSUFFICIENT STOCK: {reagent.name} - "
                        f"needed {units}, only {deducted} available"
                    )
                    logger.error(
                        "Reagent %s had insufficient stock (%s/%s) but the test was run",
                        reagent.name, deducted, units)

                threshold = reagent_threshold(reagent, department)
                if 0 < stock_after <= threshold:
                    warnings.append(f"LOW STOCK: {reagent.name} - {stock_after} units remaining")

                ReagentConsumptionLog.objects.create(
                    reagent_item=reagent,
                    test_panel=lab_test_panel.test_panel,
                    lab_test_request_panel=lab_test_panel,
                    tests_consumed=units,
                    available_tests_before=stock_before,
                    available_tests_after=stock_after,
                    stock_movement_reference=movements[0].reference if movements else None,
                    patient_name=patient_name,
                    performed_by=(
                        lab_test_panel.lab_test_request.requested_by
                        if hasattr(lab_test_panel, 'lab_test_request') else None
                    ),
                )

                logger.info(
                    "Consumed %s unit(s) of %s for panel %s. Remaining: %s",
                    deducted, reagent.name, lab_test_panel.id, stock_after)

        for warning in warnings:
            logger.warning(warning)

        logger.info("Processed reagent consumption for lab test panel %s", lab_test_panel_id)

    except LabTestRequestPanel.DoesNotExist:
        logger.error("Lab test panel %s does not exist", lab_test_panel_id)


@shared_task
def deduct_specimen_consumables(patient_sample_id):
    """
    Consume the syringe, tube and gloves a draw uses, when the draw happens.

    Collection is the event that spends them, not billing: three panels off one
    blood sample share one syringe, and a retest off an archived sample spends
    nothing because nobody draws anything. Tying the deduction to the sample
    rather than to the invoice line is what makes both of those true without a
    special case anywhere.

    Idempotent per (sample, item) on the ledger's own key, so the post_save
    that fires on every subsequent touch of a collected sample is harmless.

    Reagents are not deducted here -- they belong to the panel, and are
    consumed when it is billed. See deduct_test_kit.
    """
    try:
        sample = PatientSample.objects.select_related('specimen').get(id=patient_sample_id)
    except PatientSample.DoesNotExist:
        logger.error("Patient sample %s does not exist", patient_sample_id)
        return 0

    if not sample.is_sample_collected:
        logger.warning("Sample %s has not been collected yet", patient_sample_id)
        return 0

    links = list(sample.specimen.consumables.select_related('item'))
    if not links:
        logger.info("No consumables configured for specimen %s", sample.specimen.name)
        return 0

    department = lab_department()
    collected = 0

    with transaction.atomic():
        for link in links:
            item = link.item
            needed = link.quantity_per_collection
            idempotency_key = f"sample-collection:{sample.id}:consumable:{item.id}"

            if PatientSampleConsumable.objects.filter(
                    patient_sample=sample, item=item).exists():
                logger.info(
                    "%s already recorded against sample %s; skipping",
                    item.name, sample.patient_sample_code)
                continue

            try:
                movements = stock_service.issue(
                    item=item,
                    department=department,
                    quantity=needed,
                    movement_type=StockMovement.Type.CONSUMPTION,
                    performed_by=None,
                    reason=f"Collected {sample.specimen.name} ({sample.patient_sample_code})",
                    source_type=StockMovement.Source.SAMPLE_COLLECTION,
                    source_id=sample.id,
                    source_reference=sample.patient_sample_code,
                    allow_partial=True,
                    idempotency_key=idempotency_key,
                )
            except StockError as exc:
                # The draw has already happened by the time this runs -- the
                # tech is holding the tube. Record the shortfall rather than
                # refusing a sample that physically exists.
                logger.error(
                    "Could not consume %s for sample %s: %s",
                    item.name, sample.patient_sample_code, exc)
                movements = []

            issued = sum(-m.quantity for m in movements)
            if issued < needed:
                logger.warning(
                    "INSUFFICIENT STOCK: %s for sample %s - needed %s, issued %s",
                    item.name, sample.patient_sample_code, needed, issued)

            PatientSampleConsumable.objects.create(
                patient_sample=sample,
                item=item,
                quantity=issued,
                quantity_required=needed,
                stock_movement_reference=movements[0].reference if movements else None,
            )
            collected += 1

    logger.info(
        "Recorded %s consumable(s) for sample %s", collected, sample.patient_sample_code)
    return collected
