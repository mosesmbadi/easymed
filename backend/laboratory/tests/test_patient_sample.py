import pytest
from laboratory.models import LabTestRequestPanel, LabTestRequest, PatientSample, LabTestProfile
from django.db import transaction
from django.utils import timezone

@pytest.mark.django_db
def test_generate_sample_code_first_sample(patient_sample):
    """Test generating code when it's the first sample."""
    PatientSample.objects.all().delete() # Ensure no previous samples

    new_sample = PatientSample.objects.create(
        lab_test_request=patient_sample.lab_test_request,
        specimen=patient_sample.specimen,
        process=patient_sample.process,
        is_sample_collected=True
    )
    current_year = timezone.now().year
    assert new_sample.patient_sample_code == f"DDLR00001-{current_year}"


@pytest.mark.django_db
def test_generate_sample_code_new_year_reset(patient_sample):
    """Test generating code when the year changes and the number resets."""
    current_year = timezone.now().year
    PatientSample.objects.create(
        lab_test_request=patient_sample.lab_test_request,
        specimen=patient_sample.specimen,
        process=patient_sample.process,
        is_sample_collected=True,
        patient_sample_code=f"DDLR99999-{current_year - 1}"  
    )

    new_sample = PatientSample.objects.create(
        lab_test_request=patient_sample.lab_test_request,
        specimen=patient_sample.specimen,
        process=patient_sample.process,
        is_sample_collected=True
    )

    assert new_sample.patient_sample_code == f"DDLR00001-{current_year}"  
