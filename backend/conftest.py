import pytest
from datetime import date
from django.utils import timezone
from django.contrib.auth import get_user_model

from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from customuser.models import CustomUser, Doctor, DoctorProfile, PatientUser
from company.models import InsuranceCompany
from patient.models import Patient, AttendanceProcess, Referral
from laboratory.models import (
    LabTestRequest,
    PatientSample,  
    ProcessTestRequest, 
    Specimen,
    LabTestProfile
    )
from company.models import Company
from inventory.models import (
    Department,
    Supplier,
    Item,
    Requisition,
    RequisitionItem,
    PurchaseOrder,
    PurchaseOrderItem,
    IncomingItem,
    Inventory,
    SupplierInvoice,
    InsuranceItemSalePrice,
)

from inpatient.models import (
    Ward,
    Bed, 
    PatientAdmission,
    PatientDischarge
  )

User = get_user_model()

@pytest.fixture
def user():
    return User.objects.create_user(
        email="9jg4t@example.com",
        password="password",
        first_name="Test",
        last_name="User",
        role="patient",
        profession="Test Profession",
        phone="+1234567890"
        )

@pytest.fixture
def authenticated_client(client, django_user_model, user):    
    # Generate a token
    refresh = RefreshToken.for_user(user)
    client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {refresh.access_token}'
    return client

@pytest.fixture
def admin_user(db):
    try:
        admin_user = User.objects.filter(is_superuser=True).first()
        if not admin_user:
            admin_user = User.objects.create_user(
                password="test_admin_password",
                email="test_admin@example.com",
                role="SYS_ADMIN",  
            )
            admin_user.is_superuser = True
            admin_user.is_staff = True
            admin_user.save()
        return admin_user
    except Exception as e:
        print(f"Error creating admin user: {e}")
        return None

@pytest.fixture
def authenticated_admin_client(client, admin_user):
    if admin_user:
        refresh = RefreshToken.for_user(admin_user)
        client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {refresh.access_token}'
        return client


@pytest.fixture
def company(db):
    return Company.objects.create(
        name="Test Company",
        logo=None  # Update with a valid file or `None` to test missing logo behavior.
    )

@pytest.fixture
def patient(db):
    user = PatientUser.objects.create(
        email="patientuser@example.com",
        password="password123",
        first_name="Alice",
        last_name="Smith",
        role=CustomUser.PATIENT,
        date_of_birth=date(1990, 1, 1),
        phone="1234567890",
    )

    insurance_1 = InsuranceCompany.objects.create(name="Insurance A")
    insurance_2 = InsuranceCompany.objects.create(name="Insurance B")

    patient = Patient.objects.create(
        first_name=user.first_name,
        second_name=user.last_name,
        date_of_birth=user.date_of_birth,
        gender="F",
        user=user
    )

    patient.insurances.add(insurance_1, insurance_2)

    return patient

@pytest.fixture
def doctor(db):
    user = Doctor.objects.create(
        email="doctoruser@example.com",
        password="password123",
        first_name="John",
        last_name="Doe",
        role=CustomUser.DOCTOR,
        date_of_birth=date(1985, 5, 15),
        phone="0987654321",
    )

    doctor_profile = DoctorProfile.objects.create(user=user)
    return user

@pytest.fixture
def authenticated_doctor_client(doctor):
    client = APIClient()
    token = RefreshToken.for_user(doctor).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return client
    
@pytest.fixture
def nurse(db):
    user = User.objects.create_user(
        email="nurseuser@example.com",
        password="password123",
        first_name="Regular",
        last_name="Nurse",
        role=CustomUser.NURSE,
        is_staff=True
    )
    return user

@pytest.fixture
def authenticated_nurse_client(client, nurse):
    refresh = RefreshToken.for_user(nurse)
    client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {refresh.access_token}'
    return client

@pytest.fixture
def senior_nurse(db):
    user = User.objects.create_user(
        email="seniornurseuser@example.com",
        password="password123",
        first_name="Senior",
        last_name="Nurse",
        role=CustomUser.SENIOR_NURSE,
        is_staff=True
    )
    return user

@pytest.fixture
def authenticated_senior_nurse_client(client, senior_nurse):
    refresh = RefreshToken.for_user(senior_nurse)
    client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {refresh.access_token}'
    return client

@pytest.fixture
def department():
    return Department.objects.create(name="Test Department")

@pytest.fixture
def supplier():
    return Supplier.objects.create(official_name="Test Supplier", common_name="Test")

@pytest.fixture
def item():
    return Item.objects.create(
        name="Test Item",
        desc="Test Description",
        category="General",
        units_of_measure="Unit",
        vat_rate=16.0,
        item_code="ABC123",
        slow_moving_period=30
    )


@pytest.fixture
def insurance_company():
    return InsuranceCompany.objects.create(name="Test Insurance Company")

@pytest.fixture
def requisition(user, department):
    return Requisition.objects.create(
        requested_by=user,
        department=department,
    )

@pytest.fixture
def requisition_item(requisition, item):
    return RequisitionItem.objects.create(
        requisition=requisition,
        item=item,
        quantity_requested=10,
    )

@pytest.fixture
def purchase_order(user, requisition):
    return PurchaseOrder.objects.create(
        ordered_by=user,
        requisition=requisition,
    )

@pytest.fixture
def purchase_order_item(purchase_order, requisition_item, supplier):
    return PurchaseOrderItem.objects.create(
        purchase_order=purchase_order,
        requisition_item=requisition_item
    )

@pytest.fixture
def supplier_invoice(db, supplier, purchase_order):
    return SupplierInvoice.objects.create(
        invoice_no="INV-2024-002",
        status="pending",
        supplier=supplier,
        purchase_order=purchase_order
    )

@pytest.fixture
def incoming_item(item, supplier, purchase_order, supplier_invoice):
    return IncomingItem.objects.create(
        item=item,
        supplier=supplier,
        supplier_invoice=supplier_invoice,
        purchase_order=purchase_order,
        quantity=10,
        sale_price=20.0,
        category_one="resale",
    )

@pytest.fixture
def inventory(item, department):
    return Inventory.objects.create(
        item=item,
        quantity_at_hand=10,
        last_deducted_at=None,
        purchase_price=10.0,
        sale_price=20.0,
        lot_number="LOT-001",
        expiry_date="2024-01-01",
        category_one="resale",
        department=department,
        date_created=timezone.now()
    )

@pytest.fixture
def inventory_insurance_saleprice(inventory, insurance_company):
    return InsuranceItemSalePrice.objects.create(
        inventory_item=inventory,
        insurance_company=insurance_company,
        sale_price=20.0,
    )


# Laboratory fixtures
@pytest.fixture
def process_test_request():
    return ProcessTestRequest.objects.create(
        reference="Test Reference",
    )

@pytest.fixture
def lab_test_profile(process_test_request):
    return LabTestProfile.objects.create(
        name="Test Profile",
    )

@pytest.fixture
def lab_test_request(process_test_request, user,lab_test_profile):
    return LabTestRequest.objects.create(
        process=process_test_request,
        test_profile=lab_test_profile,
        note = "Test Note",
        requested_by = user,
        requested_on = date.today(),
        has_result = True,
        created_on = date.today(),
    )

@pytest.fixture
def specimen():
    return Specimen.objects.create(
        name = "Specimen Name",
    )

@pytest.fixture
def patient_sample(lab_test_request, process_test_request, specimen):
    return PatientSample.objects.create(
        lab_test_request=lab_test_request,
        specimen=specimen,
        process = process_test_request,
        is_sample_collected=True
    )

@pytest.fixture
def ward():
    return Ward.objects.create(
        name='Ward A',
        ward_type='general',
        gender='female',
        capacity=10
    )

@pytest.fixture
def bed(ward):
    return Bed.objects.create(
        ward=ward,
        bed_number='A1',
        status='available'
    )

@pytest.fixture
def occupied_bed(ward):
    bed = Bed.objects.create(
        ward=ward,
        bed_number='A2',
        status='occupied'
    )
    return bed

@pytest.fixture
def patient_admission(doctor, patient, ward, bed):
    # Create an attendance process first
    attendance_process = AttendanceProcess.objects.create(
        patient=patient,
        doctor=doctor,
        reason="Medical admission for treatment",
        created_by=doctor
    )
    
    admission = PatientAdmission.objects.create(
        attendance_process=attendance_process,
        patient=patient,
        ward=ward,
        bed=bed,
        reason_for_admission='Fever',
        admitted_by=doctor
    )
    bed.status = 'occupied'
    bed.save()
    return admission

@pytest.fixture
def referral(doctor):
    return Referral.objects.create(
        service="cardiologist",
        note="Urgent cardiac evaluation required.",
        email="contact@cityhospital.com",
        referred_by=doctor
    )


@pytest.fixture
def patient_discharge_normal(patient_admission, doctor):
    original_bed = patient_admission.bed
    
    discharge = PatientDischarge.objects.create(
        admission=patient_admission,
        discharged_by=doctor,
        discharge_types='normal',
        discharge_notes='Patient recovered successfully',
        referral=None,
    )
    original_bed.status = 'available'
    original_bed.save()
    patient_admission.bed = None
    patient_admission.save()
    return discharge


def patient_discharge_referral(patient_admission, doctor, referral):
    discharge = PatientDischarge.objects.create(
        admission=patient_admission,
        discharged_by=doctor,
        discharge_types='referral',
        discharge_notes='Transfer for cardiology care.',
        referral=referral,
    )
    patient_admission.bed.status = 'available'
    patient_admission.bed.save()
    patient_admission.bed = None
    patient_admission.save()
    return discharge

@pytest.fixture
def patient_discharge_deceased(patient_admission, doctor):
    discharge = PatientDischarge.objects.create(
        admission=patient_admission,
        discharged_by=doctor,
        discharge_types='deceased',
        discharge_notes='Patient passed away.',
        referral=None,
    )
    patient_admission.bed.status = 'available'
    patient_admission.bed.save()
    patient_admission.bed = None
    patient_admission.save()
    return discharge