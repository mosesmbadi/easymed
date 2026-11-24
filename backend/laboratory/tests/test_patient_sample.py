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
    # Clear all existing samples to start fresh
    PatientSample.objects.all().delete()
    
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


@pytest.mark.django_db
def test_result_entry_lists_only_samples_still_waiting_for_results(
        authenticated_admin_client, user):
    from inventory.models import Item
    from laboratory.models import LabTestPanel, ProcessTestRequest, Specimen

    profile = LabTestProfile.objects.create(name='Haemogram')

    def sample_with_tests(results, collected=True):
        process = ProcessTestRequest.objects.create(reference='R')
        specimen = Specimen.objects.create(name=f'Blood {process.id}')
        request = LabTestRequest(process=process, test_profile=profile, requested_by=user)
        request.skip_profile_charge = True
        request.save()
        for i, result in enumerate(results):
            LabTestRequestPanel.objects.create(
                lab_test_request=request, result=result,
                test_panel=LabTestPanel.objects.create(
                    name=f'Test {process.id}-{i}', test_profile=profile, specimen=specimen,
                    item=Item.objects.create(
                        name=f'Test {process.id}-{i}', desc='Test', category='Lab Test',
                        units_of_measure='test', item_code=f'LAB-{process.id}-{i}')))
        sample = PatientSample.objects.get(process=process)
        PatientSample.objects.filter(pk=sample.pk).update(is_sample_collected=collected)
        return sample

    waiting = sample_with_tests([None])
    half_done = sample_with_tests(['5.0', ''])
    done = sample_with_tests(['5.0', '6.1'])
    not_collected = sample_with_tests([None], collected=False)

    pending = authenticated_admin_client.get(
        '/lab/patient-samples/', {'results_pending': 'true'}).json()
    every = authenticated_admin_client.get('/lab/patient-samples/').json()

    assert {s['id'] for s in pending} == {waiting.id, half_done.id}
    assert {waiting.id, half_done.id, done.id, not_collected.id} <= {s['id'] for s in every}
