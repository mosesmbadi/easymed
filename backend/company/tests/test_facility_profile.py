"""
The facility running the deployment: one profile, edited by its own admin,
with the modules it has set by the platform.
"""
import pytest
from django.core.exceptions import ValidationError
from rest_framework.test import APIClient

from company.models import SWITCHABLE_MODULES, Company, CompanyBranch


@pytest.fixture
def staff_client(db):
    from customuser.models import CustomUser

    user = CustomUser.objects.create_user(
        email='desk@example.com', password='x', first_name='Front', last_name='Desk')
    client = APIClient()
    client.force_authenticate(user)
    return client


@pytest.fixture
def admin_client(admin_user):
    client = APIClient()
    client.force_authenticate(admin_user)
    return client


@pytest.mark.django_db
def test_there_is_only_one_facility_profile():
    Company.objects.create(name='EaSyMed Diagnostics')

    with pytest.raises(ValidationError):
        Company.objects.create(name='Another Hospital')
    assert Company.objects.count() == 1


@pytest.mark.django_db
def test_a_preset_sets_the_modules():
    lab = Company.objects.create(name='Bench', facility_type=Company.FacilityType.STANDALONE_LAB)
    assert lab.enabled_modules == []
    assert set(lab.disabled_modules) == set(SWITCHABLE_MODULES)

    lab.facility_type = Company.FacilityType.HOSPITAL
    lab.save(update_fields=['facility_type'])
    lab.refresh_from_db()
    assert lab.enabled_modules == list(SWITCHABLE_MODULES)


@pytest.mark.django_db
def test_a_custom_facility_picks_its_own_modules():
    """A lab that also does imaging."""
    centre = Company.objects.create(
        name='Imaging & Lab', facility_type=Company.FacilityType.CUSTOM,
        enabled_modules=['radiology', 'nonsense'])

    assert centre.enabled_modules == ['radiology']
    assert centre.module_enabled('radiology')
    assert not centre.module_enabled('doctor')


@pytest.mark.django_db
def test_anyone_signed_in_reads_the_profile_and_its_admin_edits_it(admin_client, staff_client):
    Company.objects.create(name='EaSyMed Diagnostics', patient_id_prefix='ED-')

    assert staff_client.get('/company/profile/').data['name'] == 'EaSyMed Diagnostics'
    assert staff_client.patch('/company/profile/', {'name': 'X'}, format='json').status_code == 403

    response = admin_client.patch('/company/profile/', {'kra_pin': 'P051234567X'}, format='json')
    assert response.status_code == 200
    assert Company.current().kra_pin == 'P051234567X'


@pytest.mark.django_db
def test_the_first_save_sets_the_profile_up(admin_client):
    assert admin_client.get('/company/profile/').status_code == 404

    response = admin_client.put('/company/profile/', {'name': 'New Lab'}, format='json')

    assert response.status_code == 200
    assert Company.current().name == 'New Lab'


@pytest.mark.django_db
def test_a_branch_belongs_to_the_facility(admin_client):
    company = Company.objects.create(name='EaSyMed')

    response = admin_client.post('/company/company-branch/', {'name': 'Westlands'}, format='json')

    assert response.status_code == 201
    assert CompanyBranch.objects.get().company == company


@pytest.mark.django_db
def test_a_new_patient_takes_the_facility_prefix(db):
    from patient.models import Patient

    Company.objects.create(name='EaSyMed', patient_id_prefix='ED-')
    patient = Patient.objects.create(first_name='Juma', second_name='Ali')

    assert patient.unique_id == 'ED-1'
