import logging
from celery import shared_task
from django.contrib.auth import get_user_model
from django.db import transaction
from laboratory.models import TestKitCounter, LabTestRequestPanel, TestPanelReagent, ReagentConsumptionLog

User = get_user_model()

logger = logging.getLogger(__name__)

@shared_task
def deduct_test_kit(lab_test_panel_id):
    """
    Deduct reagent tests when a lab test is billed.
    Finds all reagents required for the test panel and deducts the consumed tests.
    Logs warnings if reagents are low or out of stock.
    Creates consumption logs for reporting.
    """
    try:
        lab_test_panel = LabTestRequestPanel.objects.select_related(
            'test_panel', 
            'patient_sample__process__attendanceprocess__patient'
        ).get(id=lab_test_panel_id)
        
        if not lab_test_panel.is_billed:
            logger.warning(f"Lab test panel {lab_test_panel_id} is not billed yet")
            return
        
        # Get patient info for logging
        try:
            patient = lab_test_panel.patient_sample.process.attendanceprocess.patient
            patient_name = f"{patient.first_name} {patient.second_name}"
        except:
            patient_name = "Unknown"
        
        # Get all reagents required for this test panel
        reagent_links = TestPanelReagent.objects.filter(test_panel=lab_test_panel.test_panel)
        
        if not reagent_links.exists():
            logger.info(f"No reagents configured for test panel: {lab_test_panel.test_panel.name}")
            return
        
        warnings = []
        
        with transaction.atomic():
            for reagent_link in reagent_links:
                # Get or create counter for this reagent
                counter, created = TestKitCounter.objects.get_or_create(
                    reagent_item=reagent_link.reagent_item,
                    defaults={'available_tests': 0}
                )
                
                if created:
                    logger.warning(f"Created new TestKitCounter for {reagent_link.reagent_item.name} with 0 tests")
                
                # Store before state for logging
                tests_before = counter.available_tests
                
                # Check stock before deduction
                if counter.is_out_of_stock():
                    warnings.append(f"⚠️ OUT OF STOCK: {reagent_link.reagent_item.name} has no tests available!")
                    logger.error(f"Reagent {reagent_link.reagent_item.name} is out of stock but test was billed")
                elif counter.is_low_stock():
                    warnings.append(f"⚠️ LOW STOCK: {reagent_link.reagent_item.name} has only {counter.available_tests} tests remaining")
                
                # Deduct the tests
                tests_to_deduct = reagent_link.tests_consumed_per_run
                counter.available_tests -= tests_to_deduct
                counter.save()
                
                # Create consumption log
                ReagentConsumptionLog.objects.create(
                    reagent_item=reagent_link.reagent_item,
                    test_panel=lab_test_panel.test_panel,
                    lab_test_request_panel=lab_test_panel,
                    tests_consumed=tests_to_deduct,
                    available_tests_before=tests_before,
                    available_tests_after=counter.available_tests,
                    patient_name=patient_name,
                    performed_by=lab_test_panel.lab_test_request.requested_by if hasattr(lab_test_panel, 'lab_test_request') else None
                )
                
                logger.info(
                    f"Deducted {tests_to_deduct} test(s) from {reagent_link.reagent_item.name}. "
                    f"Remaining: {counter.available_tests}"
                )
        
        # Log all warnings
        if warnings:
            for warning in warnings:
                logger.warning(warning)
        
        logger.info(f"Successfully processed reagent deduction for lab test panel {lab_test_panel_id}")
        
    except LabTestRequestPanel.DoesNotExist:
        logger.error(f"LabTestRequestPanel with id {lab_test_panel_id} does not exist")
    except Exception as e:
        logger.error(f"Error deducting reagents for lab test panel {lab_test_panel_id}: {str(e)}")
        raise