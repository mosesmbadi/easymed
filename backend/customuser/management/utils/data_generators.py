import random
from faker import Faker

from inventory.models import Item, Department, Supplier
from customuser.models import CustomUser
from company.models import Company, CompanyBranch, InsuranceCompany
from authperms.models import Permission, Group
from patient.models import Patient

from laboratory.models import LabTestProfile, Specimen, LabTestPanel


fake = Faker()

DEPARTMENTS = [
    "General", "Surgery", "Radiology", "Laboratory", "Pharmacy", "Dental", "Orthopedics", "Ophthalmology",
    "Cardiology", "Neurology", "Psychiatry", "Gynecology", "Pediatrics", "Dermatology", "ENT", "Urology",
]

MEDICAL_ITEM_NAMES = [
    "Paracetamol Tablet", "Surgical Gloves", "Blood Pressure Monitor",
    "Stethoscope", "Insulin Pen", "Antiseptic Solution", "Gauze Roll", "Thermometer",
    "Amoxicillin Capsule", "Saline Drip", "Face Mask", "ECG Machine", "Defibrillator",
    "Scalpel", "Surgical Mask", "Bandage", "Wheelchair", "Crutches"
]

# Map medical items to appropriate categories
ITEM_CATEGORY_MAP = {
    "Paracetamol Tablet": "Drug",
    "Surgical Gloves": "SurgicalEquipment",
    "Blood Pressure Monitor": "SurgicalEquipment",
    "Stethoscope": "SurgicalEquipment",
    "Insulin Pen": "Drug",
    "Antiseptic Solution": "Drug",
    "Gauze Roll": "SurgicalEquipment",
    "Thermometer": "SurgicalEquipment",
    "Amoxicillin Capsule": "Drug",
    "Saline Drip": "Drug",
    "Face Mask": "SurgicalEquipment",
    "ECG Machine": "SurgicalEquipment",
    "Defibrillator": "SurgicalEquipment",
    "Scalpel": "SurgicalEquipment",
    "Surgical Mask": "SurgicalEquipment",
    "Bandage": "SurgicalEquipment",
    "Wheelchair": "Furniture",
    "Crutches": "Furniture",
}

MEDICAL_DESCRIPTIONS = [
    "Used for pain relief and fever reduction.",
    "Sterile gloves for surgical procedures.",
    "Disposable syringe for injections.",
    "Used for intravenous access.",
    "Device to measure blood pressure.",
    "Instrument to listen to heart and lungs.",
    "Device for insulin injection.",
    "Solution for cleaning wounds.",
    "Sterile gauze for wound dressing.",
    "Device to measure body temperature.",
    "Antibiotic for bacterial infections.",
    "IV fluid for hydration.",
    "Protective mask for infection control.",
    "Device to record heart activity.",
    "Device to restore normal heartbeat.",
    "Sharp blade for surgical procedures.",
    "Protective mask for surgery.",
    "Elastic bandage for support.",
    "Mobility aid for patients.",
    "Aid for walking support."
]

DASHBOARD_PERMISSIONS = [
    "CAN_ACCESS_DOCTOR_DASHBOARD",
    "CAN_ACCESS_GENERAL_DASHBOARD",
    "CAN_ACCESS_ADMIN_DASHBOARD",
    "CAN_ACCESS_RECEPTION_DASHBOARD",
    "CAN_ACCESS_NURSING_DASHBOARD",
    "CAN_ACCESS_LABORATORY_DASHBOARD",
    "CAN_ACCESS_PATIENTS_DASHBOARD",
    "CAN_ACCESS_AI_ASSISTANT_DASHBOARD",
    "CAN_ACCESS_ANNOUNCEMENT_DASHBOARD",
    "CAN_ACCESS_PHARMACY_DASHBOARD",
    "CAN_ACCESS_INVENTORY_DASHBOARD",
    "CAN_ACCESS_BILLING_DASHBOARD",
    "CAN_RECEIVE_INVENTORY_NOTIFICATIONS",
]

GROUPS_ORDER = [
    "SYS_ADMIN",
    "PATIENT",
    "DOCTOR",
    "PHARMACIST",
    "RECEPTIONIST",
    "LAB_TECH",
    "NURSE",
]


# Map groups to permissions (customize as needed)
GROUP_PERMISSIONS = {
    "SYS_ADMIN": DASHBOARD_PERMISSIONS,
    "PATIENT": ["CAN_ACCESS_PATIENTS_DASHBOARD"],
    "DOCTOR": ["CAN_ACCESS_DOCTOR_DASHBOARD"],
    "PHARMACIST": ["CAN_ACCESS_PHARMACY_DASHBOARD"],
    "RECEPTIONIST": ["CAN_ACCESS_RECEPTION_DASHBOARD"],
    "LAB_TECH": ["CAN_ACCESS_LABORATORY_DASHBOARD", "CAN_RECEIVE_INVENTORY_NOTIFICATIONS"],
    "NURSE": ["CAN_ACCESS_NURSING_DASHBOARD"],
}


def create_dummy_users(count=10, role=CustomUser.PATIENT):
    users = []
    for _ in range(count):
        email = fake.unique.email()[:254]  # EmailField default max_length is 254
        user = CustomUser.objects.create_user(
            email=email,
            password="password123",
            first_name=fake.first_name()[:30],
            last_name=fake.last_name()[:30],
            date_of_birth=fake.date_of_birth(minimum_age=18, maximum_age=90),
            role=role,
        )
        users.append(user)
    return users

def create_dummy_companies(count=5):
    companies = []
    for _ in range(count):
        company = Company.objects.create(
            name=fake.company()[:250],
            address1=fake.address()[:250],
            address2=fake.address()[:250],
            phone1= "0712345678",
            phone2="0712345678",
            email1=fake.company_email()[:254],
            email2=fake.company_email()[:254],
            # logo can be left blank or set to a default if needed
        )
        companies.append(company)
    return companies

def create_dummy_company_branches(company, count=3):
    branches = []
    for _ in range(count):
        branch = CompanyBranch.objects.create(
            name=(fake.company_suffix() + " Branch")[:250],
            company=company,
            address=fake.address()[:250],
            phone=fake.phone_number()[:250],
            email=fake.company_email()[:254],
            # logo can be left blank or set to a default if needed
        )
        branches.append(branch)
    return branches

def create_dummy_insurance_companies(count=3):
    insurance_companies = []
    for _ in range(count):
        insurance = InsuranceCompany.objects.create(
            name=(fake.company() + " Insurance")[:20]
        )
        insurance_companies.append(insurance)
    return insurance_companies



def create_dummy_items(count=50):
    items = []
    # Exclude appointment categories from random assignment - these should be created separately
    categories = [c[0] for c in Item.CATEGORY_CHOICES if c[0] not in ['General Appointment', 'Specialized Appointment']]
    units = [u[0] for u in Item.UNIT_CHOICES]
    for _ in range(count):
        name = random.choice(MEDICAL_ITEM_NAMES)
        desc = random.choice(MEDICAL_DESCRIPTIONS)
        # Use mapped category if available, otherwise pick random from valid categories
        category = ITEM_CATEGORY_MAP.get(name, random.choice(categories))
        units_of_measure = random.choice(units)
        item = Item.objects.create(
            item_code=fake.unique.bothify(text='???-#####')[:255],
            name=name[:255],
            desc=desc[:255],
            category=category,
            units_of_measure=units_of_measure,
            vat_rate=16.0,
            packed=str(random.randint(1, 10))[:255],
            subpacked=str(random.randint(1, 100))[:255],
            slow_moving_period=random.choice([30, 60, 90, 180]),
        )
        items.append(item)
    return items


def create_appointment_items():
    """
    Create appointment-specific items with proper categories.
    General Appointment has one item, Specialized Appointments have specific specialty items.
    """
    appointment_items = []
    
    # General Appointment - single item
    general_appointment = Item.objects.create(
        item_code='GEN-00001',
        name='General Appointment',
        desc='Standard general consultation appointment',
        category='General Appointment',
        units_of_measure='unit',
        vat_rate=0.0,  # Appointments typically don't have VAT
        packed='1',
        subpacked='1',
        slow_moving_period=30,
    )
    appointment_items.append(general_appointment)
    
    # Specialized Appointments - specific specialties
    specialized_appointments = [
        {
            'code': 'SPEC-00001',
            'name': 'Dentist Appointment',
            'desc': 'Specialized dental consultation and treatment'
        },
        {
            'code': 'SPEC-00002',
            'name': 'Optician Appointment',
            'desc': 'Eye examination and optical consultation'
        },
        {
            'code': 'SPEC-00003',
            'name': 'Gynecologist Appointment',
            'desc': 'Gynecological consultation and examination'
        },
        {
            'code': 'SPEC-00004',
            'name': 'Pediatrician Appointment',
            'desc': 'Pediatric consultation for children'
        },
    ]
    
    for appt in specialized_appointments:
        item = Item.objects.create(
            item_code=appt['code'],
            name=appt['name'],
            desc=appt['desc'],
            category='Specialized Appointment',
            units_of_measure='unit',
            vat_rate=0.0,  # Appointments typically don't have VAT
            packed='1',
            subpacked='1',
            slow_moving_period=30,
        )
        appointment_items.append(item)
    
    return appointment_items



def create_dummy_permissions(count=20):
    permissions = []
    for _ in range(count):
        name = fake.unique.job()[:255]  # Use job names as dummy permission names
        perm = Permission.objects.create(name=name)
        permissions.append(perm)
    return permissions


def create_dummy_groups(count=10, permissions_per_group=5):
    groups = []
    all_permissions = list(Permission.objects.all())
    for _ in range(count):
        name = fake.unique.company()[:150]
        group = Group.objects.create(name=name)
        perms = random.sample(all_permissions, min(permissions_per_group, len(all_permissions)))
        group.permissions.set(perms)
        groups.append(group)
    return groups


def create_permissions_and_groups():
    perm_objs = {}
    for perm_name in DASHBOARD_PERMISSIONS:
        perm, _ = Permission.objects.get_or_create(name=perm_name)
        perm_objs[perm_name] = perm

    group_objs = []
    for group_name in GROUPS_ORDER:
        group, _ = Group.objects.get_or_create(name=group_name)
        perms = [perm_objs[p] for p in GROUP_PERMISSIONS.get(group_name, []) if p in perm_objs]
        group.permissions.set(perms)
        group_objs.append(group)
    return group_objs


def create_dummy_patients(count=20, insurances=None, users=None):
    """
    Generate dummy Patient records.
    Optionally pass a list of InsuranceCompany and CustomUser objects to assign.
    """
    patients = []
    fake_gender = lambda: random.choice(['M', 'F', 'O'])
    insurances = insurances or list(InsuranceCompany.objects.all())
    users = users or list(CustomUser.objects.filter(role=CustomUser.PATIENT))
    used_emails = set(Patient.objects.values_list('email', flat=True))

    for _ in range(count):
        email = fake.unique.email()[:254]
        # Ensure unique email
        while email in used_emails:
            email = fake.unique.email()[:254]
        used_emails.add(email)

        patient = Patient.objects.create(
            first_name=fake.first_name()[:40],
            second_name=fake.last_name()[:40],
            email=email,
            phone=fake.phone_number()[:30],
            date_of_birth=fake.date_of_birth(minimum_age=18, maximum_age=90),
            gender=fake_gender(),
            user=users.pop() if users else None,
        )
        # Assign random insurances (0-2 per patient)
        if insurances:
            patient.insurances.set(random.sample(insurances, k=random.randint(0, min(2, len(insurances)))))
        patients.append(patient)
    return patients


def create_dummy_departments():
    departments = []
    for name in DEPARTMENTS:
        department, _ = Department.objects.get_or_create(name=name)
        departments.append(department)
    return departments


def create_demo_lab_profiles_and_panels():
    # Common specimens
    specimen_names = ["Blood", "Urine", "Stool", "Sputum", "CSF", "Saliva", "Swab", "Serum", "Plasma"]
    specimens = {}
    for name in specimen_names:
        specimens[name], _ = Specimen.objects.get_or_create(name=name)

    # Example test profiles and their panels
    profiles_and_panels = {
        "Complete Blood Count (CBC)": [
            {"name": "Hemoglobin", "specimen": "Blood", "unit": "g", "is_qualitative": False, "is_quantitative": True},
            {"name": "White Blood Cell Count", "specimen": "Blood", "unit": "10^9/L", "is_qualitative": False, "is_quantitative": True},
            {"name": "Platelet Count", "specimen": "Blood", "unit": "10^9/L", "is_qualitative": False, "is_quantitative": True},
        ],
        "Liver Function Test (LFT)": [
            {"name": "ALT (SGPT)", "specimen": "Blood", "unit": "IU/L", "is_qualitative": False, "is_quantitative": True},
            {"name": "AST (SGOT)", "specimen": "Blood", "unit": "IU/L", "is_qualitative": False, "is_quantitative": True},
            {"name": "Bilirubin", "specimen": "Blood", "unit": "mg/dL", "is_qualitative": False, "is_quantitative": True},
        ],
        "Renal Function Test (RFT)": [
            {"name": "Creatinine", "specimen": "Blood", "unit": "mg/dL", "is_qualitative": False, "is_quantitative": True},
            {"name": "Urea", "specimen": "Blood", "unit": "mg/dL", "is_qualitative": False, "is_quantitative": True},
        ],
        "Urinalysis": [
            {"name": "Urine Protein", "specimen": "Urine", "unit": "mg/dL", "is_qualitative": False, "is_quantitative": True},
            {"name": "Urine Glucose", "specimen": "Urine", "unit": "mg/dL", "is_qualitative": False, "is_quantitative": True},
            {"name": "Urine pH", "specimen": "Urine", "unit": "", "is_qualitative": False, "is_quantitative": True},
        ],
        "COVID-19 PCR": [
            {"name": "SARS-CoV-2 RNA", "specimen": "Swab", "unit": "", "is_qualitative": True, "is_quantitative": False},
        ],
        "Malaria Test": [
            {"name": "Malaria Parasite", "specimen": "Blood", "unit": "", "is_qualitative": True, "is_quantitative": False},
        ],
    }

    created_profiles = []
    created_panels = []
    for profile_name, panels in profiles_and_panels.items():
        profile, _ = LabTestProfile.objects.get_or_create(name=profile_name)
        created_profiles.append(profile)
        for panel in panels:
            item, _ = Item.objects.get_or_create(
                name=panel["name"],
                defaults={
                    "item_code": f"LAB-{profile_name[:3].upper()}-{panel['name'][:3].upper()}",
                    "desc": f"{panel['name']} test for {profile_name}",
                    "category": "Lab Test",
                    "units_of_measure": panel.get("unit", "unit") or "unit",
                    "vat_rate": 0.0,
                    "packed": "1",
                    "subpacked": "1",
                    "slow_moving_period": 90,
                }
            )
            lab_panel, _ = LabTestPanel.objects.get_or_create(
                name=panel["name"],
                specimen=specimens[panel["specimen"]],
                test_profile=profile,
                unit=panel.get("unit", "unit") or "unit",
                item=item,
                is_qualitative=panel["is_qualitative"],
                is_quantitative=panel["is_quantitative"],
            )
            created_panels.append(lab_panel)
    return created_profiles, created_panels


def create_dummy_suppliers(count=20):
    """
    Create dummy suppliers for testing and development.
    """
    suppliers = []
    
    # Common supplier types for medical/pharmaceutical industry
    supplier_types = [
        "Pharmaceuticals", "Medical Equipment", "Surgical Instruments", "Laboratory Supplies",
        "Dental Equipment", "Radiology Equipment", "Healthcare Technology", "Medical Devices",
        "Consumables", "Chemicals", "Biotechnology", "Diagnostics"
    ]
    
    for _ in range(count):
        supplier_type = random.choice(supplier_types)
        
        # Generate realistic company names
        official_name = f"{fake.company()} {supplier_type} Ltd."
        
        # Create a shorter common name
        common_name = fake.company()[:30]  # Ensure it fits the 30 char limit
        
        supplier = Supplier.objects.create(
            official_name=official_name[:255],  # Ensure it fits the 255 char limit
            common_name=common_name
        )
        suppliers.append(supplier)
    
    return suppliers
