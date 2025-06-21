import logging
from celery import shared_task
from django.contrib.auth import get_user_model
from laboratory.models import TestKitCounter, TestKit, LabTestRequestPanel

User = get_user_model()

logger = logging.getLogger(__name__)

@shared_task
def deduct_test_kit(lab_test_panel_id):
    lab_test_panel = LabTestRequestPanel.objects.get(id=lab_test_panel_id)
    
    if lab_test_panel.is_billed:
        test_kit = TestKit.objects.filter(item=lab_test_panel.test_panel.item).first()
        
        if test_kit:
            test_kit_counters = TestKitCounter.objects.filter(lab_test_kit=test_kit, counter__gt=0).order_by('id')

            for test_kit_counter in test_kit_counters:
                if test_kit_counter.counter > 0:
                    test_kit_counter.counter -= 1
                    test_kit_counter.save()
                    break