import random
from faker import Faker

from inventory.models import Item, Department, Supplier
from customuser.models import CustomUser
from company.models import Company, CompanyBranch, InsuranceCompany
from authperms.models import Permission, Group
from patient.models import Patient

from laboratory.models import LabTestProfile, Specimen, LabTestPanel, LabTestInterpretation, ReferenceValue
from inpatient.models import Ward, Bed


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
    "DOCTOR": ["CAN_ACCESS_DOCTOR_DASHBOARD", "CAN_ACCESS_RECEPTION_DASHBOARD"],
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


def create_reference_values():
    """
    Create reference value ranges for lab test panels.
    These define the normal ranges used for flag calculation (Low/Normal/High).
    """
    reference_values_created = []
    
    # Define reference ranges for common lab tests
    # Format: {test_name: [(sex, age_min, age_max, ref_low, ref_high)]}
    
    reference_ranges = {
        "Hemoglobin": [
            # Adult Males
            ('M', 18, 120, 13.0, 17.0),
            # Adult Females
            ('F', 18, 120, 12.0, 15.5),
            # Children (both sexes)
            ('M', 1, 17, 11.0, 16.0),
            ('F', 1, 17, 11.0, 16.0),
        ],
        
        "White Blood Cell Count": [
            # Adults (both sexes)
            ('M', 18, 120, 4.0, 11.0),
            ('F', 18, 120, 4.0, 11.0),
            # Children
            ('M', 1, 17, 5.0, 14.5),
            ('F', 1, 17, 5.0, 14.5),
        ],
        
        "Platelet Count": [
            # Adults (both sexes)
            ('M', 18, 120, 150.0, 400.0),
            ('F', 18, 120, 150.0, 400.0),
            # Children
            ('M', 1, 17, 150.0, 450.0),
            ('F', 1, 17, 150.0, 450.0),
        ],
        
        "ALT (SGPT)": [
            # Adult Males
            ('M', 18, 120, 7.0, 41.0),
            # Adult Females
            ('F', 18, 120, 7.0, 33.0),
        ],
        
        "AST (SGOT)": [
            # Adult Males
            ('M', 18, 120, 8.0, 40.0),
            # Adult Females
            ('F', 18, 120, 8.0, 32.0),
        ],
        
        "Bilirubin": [
            # Adults (both sexes)
            ('M', 18, 120, 0.1, 1.2),
            ('F', 18, 120, 0.1, 1.2),
        ],
        
        "Creatinine": [
            # Adult Males
            ('M', 18, 120, 0.7, 1.3),
            # Adult Females
            ('F', 18, 120, 0.6, 1.1),
            # Elderly Males
            ('M', 65, 120, 0.8, 1.4),
            # Elderly Females
            ('F', 65, 120, 0.6, 1.2),
        ],
        
        "Urea": [
            # Adults (both sexes)
            ('M', 18, 120, 7.0, 20.0),
            ('F', 18, 120, 7.0, 20.0),
        ],
        
        "Urine Protein": [
            # Adults (both sexes) - should be minimal/absent
            ('M', 18, 120, 0.0, 15.0),
            ('F', 18, 120, 0.0, 15.0),
        ],
        
        "Urine Glucose": [
            # Adults (both sexes) - should be absent
            ('M', 18, 120, 0.0, 15.0),
            ('F', 18, 120, 0.0, 15.0),
        ],
        
        "Urine pH": [
            # Adults (both sexes)
            ('M', 18, 120, 4.5, 8.0),
            ('F', 18, 120, 4.5, 8.0),
        ],
    }
    
    # Create reference values
    for test_name, ranges in reference_ranges.items():
        try:
            # Find the lab test panel
            lab_panel = LabTestPanel.objects.get(name=test_name)
            
            for range_data in ranges:
                sex, age_min, age_max, ref_low, ref_high = range_data
                
                # Create or get the reference value
                ref_val, created = ReferenceValue.objects.get_or_create(
                    lab_test_panel=lab_panel,
                    sex=sex,
                    age_min=age_min,
                    age_max=age_max,
                    defaults={
                        'ref_value_low': ref_low,
                        'ref_value_high': ref_high,
                    }
                )
                
                if created:
                    reference_values_created.append(ref_val)
                    
        except LabTestPanel.DoesNotExist:
            print(f"Warning: Lab test panel '{test_name}' not found. Skipping reference values.")
            continue
    
    return reference_values_created


def create_lab_test_interpretations():
    """
    Create common interpretations for lab test panels.
    This provides realistic, medically-accurate interpretation ranges for common tests.
    """
    interpretations_created = []
    
    # Define interpretations for common lab tests
    # Format: {test_name: [(range_type, sex, age_min, age_max, value_min, value_max, interpretation, clinical_action, requires_attention)]}
    
    lab_interpretations = {
        "Hemoglobin": [
            # Critical Low - Male
            ('critical_low', 'M', None, None, None, 7.0, 
             "Critically low hemoglobin (severe anemia). Immediate intervention required.",
             "Urgent blood transfusion may be needed. Investigate cause: blood loss, hemolysis, bone marrow failure.",
             True),
            # Low - Male
            ('low', 'M', 18, None, 7.0, 13.0,
             "Low hemoglobin (anemia). May cause fatigue, weakness, and shortness of breath.",
             "Check iron levels, B12, folate. Evaluate for chronic disease, bleeding, or nutritional deficiency.",
             False),
            # Normal - Male
            ('normal', 'M', 18, None, 13.0, 17.0,
             "Hemoglobin level is within normal range for adult males.",
             "No immediate action required. Continue routine monitoring.",
             False),
            # High - Male
            ('high', 'M', 18, None, 17.0, 20.0,
             "Elevated hemoglobin (polycythemia). May increase blood viscosity.",
             "Check for dehydration, smoking, sleep apnea, or polycythemia vera. Consider hydration status.",
             False),
            # Critical High - Male
            ('critical_high', 'M', None, None, 20.0, None,
             "Critically high hemoglobin. Risk of thrombosis and cardiovascular complications.",
             "Urgent hematology consultation. Rule out polycythemia vera. Consider phlebotomy.",
             True),
            # Critical Low - Female
            ('critical_low', 'F', None, None, None, 7.0,
             "Critically low hemoglobin (severe anemia). Immediate intervention required.",
             "Urgent blood transfusion may be needed. Investigate cause: blood loss, hemolysis, bone marrow failure.",
             True),
            # Low - Female
            ('low', 'F', 18, None, 7.0, 12.0,
             "Low hemoglobin (anemia). Common causes include iron deficiency, menstrual blood loss.",
             "Check iron studies, assess menstrual history. Consider iron supplementation if deficiency confirmed.",
             False),
            # Normal - Female
            ('normal', 'F', 18, None, 12.0, 15.5,
             "Hemoglobin level is within normal range for adult females.",
             "No immediate action required. Continue routine monitoring.",
             False),
            # High - Female
            ('high', 'F', 18, None, 15.5, 18.0,
             "Elevated hemoglobin (polycythemia). May increase blood viscosity.",
             "Check for dehydration, smoking, or underlying conditions. Evaluate hydration status.",
             False),
        ],
        
        "White Blood Cell Count": [
            # Critical Low
            ('critical_low', 'B', None, None, None, 2.0,
             "Critically low WBC count (severe leukopenia). High infection risk.",
             "Neutropenic precautions. Investigate cause: chemotherapy, bone marrow failure, severe infection. Consider G-CSF.",
             True),
            # Low
            ('low', 'B', None, None, 2.0, 4.0,
             "Low WBC count (leukopenia). Increased susceptibility to infections.",
             "Monitor for infections. Check differential count. Evaluate for viral illness, medications, or autoimmune conditions.",
             False),
            # Normal
            ('normal', 'B', None, None, 4.0, 11.0,
             "White blood cell count is within normal range.",
             "No immediate action required. Continue routine monitoring.",
             False),
            # High
            ('high', 'B', None, None, 11.0, 20.0,
             "Elevated WBC count (leukocytosis). May indicate infection or inflammation.",
             "Check differential count. Evaluate for infection, inflammation, stress, or hematologic disorders.",
             False),
            # Critical High
            ('critical_high', 'B', None, None, 20.0, None,
             "Critically high WBC count. Possible severe infection, leukemia, or extreme stress.",
             "Urgent evaluation needed. Perform differential count, blood smear. Rule out leukemia or severe sepsis.",
             True),
        ],
        
        "Platelet Count": [
            # Critical Low
            ('critical_low', 'B', None, None, None, 50.0,
             "Critically low platelet count (severe thrombocytopenia). High bleeding risk.",
             "Bleeding precautions. Avoid invasive procedures. Consider platelet transfusion if <20 or bleeding. Investigate cause.",
             True),
            # Low
            ('low', 'B', None, None, 50.0, 150.0,
             "Low platelet count (thrombocytopenia). Increased bleeding risk.",
             "Monitor for bleeding. Evaluate medications, viral infections, ITP, or bone marrow disorders.",
             False),
            # Normal
            ('normal', 'B', None, None, 150.0, 400.0,
             "Platelet count is within normal range.",
             "No immediate action required. Continue routine monitoring.",
             False),
            # High
            ('high', 'B', None, None, 400.0, 600.0,
             "Elevated platelet count (thrombocytosis). May increase clotting risk.",
             "Evaluate for reactive causes: infection, inflammation, iron deficiency. Consider myeloproliferative disorders if persistent.",
             False),
            # Critical High
            ('critical_high', 'B', None, None, 600.0, None,
             "Critically high platelet count. Increased risk of thrombosis or bleeding paradox.",
             "Hematology consultation. Rule out essential thrombocythemia. Consider antiplatelet therapy if high thrombotic risk.",
             True),
        ],
        
        "ALT (SGPT)": [
            # Normal
            ('normal', 'M', None, None, 0, 41.0,
             "ALT level is within normal range. Liver function appears normal.",
             "No immediate action required. Continue routine monitoring.",
             False),
            ('normal', 'F', None, None, 0, 33.0,
             "ALT level is within normal range. Liver function appears normal.",
             "No immediate action required. Continue routine monitoring.",
             False),
            # High
            ('high', 'B', None, None, 41.0, 200.0,
             "Elevated ALT. Indicates mild to moderate liver injury or inflammation.",
             "Evaluate for hepatitis (viral, alcoholic, drug-induced), fatty liver disease, or other liver conditions.",
             False),
            # Critical High
            ('critical_high', 'B', None, None, 200.0, None,
             "Severely elevated ALT. Indicates significant liver damage.",
             "Urgent hepatology consultation. Rule out acute hepatitis, drug toxicity, ischemic hepatitis. Check other liver enzymes.",
             True),
        ],
        
        "Creatinine": [
            # Normal - Male
            ('normal', 'M', 18, None, 0.7, 1.3,
             "Creatinine level is within normal range. Kidney function appears normal.",
             "No immediate action required. Continue routine monitoring.",
             False),
            # Normal - Female
            ('normal', 'F', 18, None, 0.6, 1.1,
             "Creatinine level is within normal range. Kidney function appears normal.",
             "No immediate action required. Continue routine monitoring.",
             False),
            # High
            ('high', 'B', None, None, 1.3, 3.0,
             "Elevated creatinine. Indicates reduced kidney function (chronic kidney disease or acute kidney injury).",
             "Calculate eGFR. Evaluate hydration, medications (NSAIDs, ACE inhibitors). Check urinalysis. Monitor potassium.",
             False),
            # Critical High
            ('critical_high', 'B', None, None, 3.0, None,
             "Severely elevated creatinine. Indicates significant kidney impairment.",
             "Urgent nephrology consultation. Check electrolytes, especially potassium. Consider dialysis if symptomatic uremia.",
             True),
        ],
        
        "Urea": [
            # Normal
            ('normal', 'B', None, None, 7.0, 20.0,
             "Urea level is within normal range.",
             "No immediate action required. Continue routine monitoring.",
             False),
            # High
            ('high', 'B', None, None, 20.0, 50.0,
             "Elevated urea. May indicate kidney dysfunction, dehydration, or high protein catabolism.",
             "Assess hydration status. Check creatinine for kidney function. Evaluate for GI bleeding if BUN/Cr ratio >20:1.",
             False),
            # Critical High
            ('critical_high', 'B', None, None, 50.0, None,
             "Severely elevated urea (uremia). Risk of encephalopathy and other complications.",
             "Urgent nephrology consultation. Monitor for uremic symptoms. Consider dialysis if indicated.",
             True),
        ],
        
        "Urine Glucose": [
            # Normal
            ('normal', 'B', None, None, 0, 15.0,
             "No glucose detected in urine. Normal finding.",
             "No immediate action required.",
             False),
            # High
            ('high', 'B', None, None, 15.0, None,
             "Glucose detected in urine (glycosuria). May indicate diabetes or renal glycosuria.",
             "Check fasting blood glucose and HbA1c. Rule out diabetes mellitus. Consider renal threshold disorders.",
             False),
        ],
        
        "Urine Protein": [
            # Normal
            ('normal', 'B', None, None, 0, 15.0,
             "Trace or no protein in urine. Normal finding.",
             "No immediate action required.",
             False),
            # High
            ('high', 'B', None, None, 15.0, 150.0,
             "Mild proteinuria detected. May be transient or indicate early kidney disease.",
             "Repeat test. If persistent, evaluate for kidney disease, hypertension, diabetes. Consider 24-hour urine collection.",
             False),
            # Critical High
            ('critical_high', 'B', None, None, 150.0, None,
             "Significant proteinuria. Indicates kidney damage (nephrotic or nephritic syndrome).",
             "Urgent nephrology referral. Check albumin, lipids, kidney function. Rule out nephrotic syndrome.",
             True),
        ],
    }
    
    # Create interpretations
    for test_name, interpretations in lab_interpretations.items():
        # Find the lab test panel
        try:
            lab_panel = LabTestPanel.objects.get(name=test_name)
            
            for interp_data in interpretations:
                range_type, sex, age_min, age_max, value_min, value_max, interpretation, clinical_action, requires_attention = interp_data
                
                # Create or get the interpretation
                interp, created = LabTestInterpretation.objects.get_or_create(
                    lab_test_panel=lab_panel,
                    range_type=range_type,
                    sex=sex,
                    age_min=age_min,
                    age_max=age_max,
                    value_min=value_min,
                    value_max=value_max,
                    defaults={
                        'interpretation': interpretation,
                        'clinical_action': clinical_action,
                        'requires_immediate_attention': requires_attention,
                    }
                )
                
                if created:
                    interpretations_created.append(interp)
                    
        except LabTestPanel.DoesNotExist:
            print(f"Warning: Lab test panel '{test_name}' not found. Skipping interpretations.")
            continue
    
    return interpretations_created


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


def create_real_world_lab_data():
    """
    Creates real-world lab test profiles, panels, reagents, and their relationships.
    Based on actual laboratory testing standards.
    """
    from laboratory.models import (
        LabTestProfile, LabTestPanel, Specimen, 
        TestPanelReagent, TestKitCounter, ReferenceValue
    )
    from inventory.models import Item, Department, Inventory
    from decimal import Decimal
    from datetime import date, timedelta
    
    created_data = {
        'profiles': [],
        'panels': [],
        'reagents': [],
        'links': [],
        'counters': [],
        'inventory_records': []
    }
    
    # Get or create Lab department
    lab_dept, _ = Department.objects.get_or_create(name='Lab')
    
    # Helper function to create inventory for reagent items
    def create_reagent_inventory(reagent_item, purchase_price, sale_price, quantity_kits):
        """Create inventory record for a reagent item"""
        inv, created = Inventory.objects.get_or_create(
            item=reagent_item,
            lot_number=f'LOT-{reagent_item.item_code}-2026',
            defaults={
                'department': lab_dept,
                'purchase_price': Decimal(str(purchase_price)),
                'sale_price': Decimal(str(sale_price)),
                'quantity_at_hand': int(reagent_item.subpacked) * quantity_kits,  # total tests
                'category_one': 'Resale',
                'expiry_date': date.today() + timedelta(days=365 * 2),  # 2 years from now
            }
        )
        if created:
            created_data['inventory_records'].append(inv)
        return inv
    
    # Get or create specimens
    blood_specimen, _ = Specimen.objects.get_or_create(name='Blood')
    serum_specimen, _ = Specimen.objects.get_or_create(name='Serum')
    urine_specimen, _ = Specimen.objects.get_or_create(name='Urine')
    
    # 1. COMPLETE BLOOD COUNT (CBC) PROFILE
    cbc_profile, _ = LabTestProfile.objects.get_or_create(name='Complete Blood Count (CBC)')
    
    # Create reagent for CBC
    cbc_reagent_item, _ = Item.objects.get_or_create(
        name='Sysmex CBC Reagent Kit',
        defaults={
            'desc': 'Complete reagent kit for automated hematology analyzer - Sysmex XN Series',
            'category': 'LabReagent',
            'units_of_measure': 'kits',
            'packed': '1',
            'subpacked': '500',  # 500 tests per kit
            'item_code': 'SYS-CBC-500',
            'vat_rate': 16.0,
        }
    )
    created_data['reagents'].append(cbc_reagent_item)
    
    # Create inventory for CBC reagent: 2 kits in stock
    create_reagent_inventory(
        reagent_item=cbc_reagent_item,
        purchase_price=15000.00,  # KES 15,000 per kit
        sale_price=18000.00,      # KES 18,000 per kit
        quantity_kits=2           # 2 kits = 1000 tests
    )
    
    # CBC Panels
    cbc_panels_data = [
        ('Hemoglobin', 'g/dL', False, True),
        ('White Blood Cell Count', 'x10³/µL', False, True),
        ('Red Blood Cell Count', 'x10⁶/µL', False, True),
        ('Platelet Count', 'x10³/µL', False, True),
        ('Hematocrit', '%', False, True),
        ('Mean Corpuscular Volume (MCV)', 'fL', False, True),
    ]
    
    for panel_name, unit, is_qual, is_quant in cbc_panels_data:
        # Create item for billing
        panel_item, _ = Item.objects.get_or_create(
            name=panel_name,
            defaults={
                'desc': f'{panel_name} test',
                'category': 'Lab Test',
                'units_of_measure': 'unit',
                'packed': '1',
                'subpacked': '1',
                'item_code': f'LAB-{panel_name[:10].upper().replace(" ", "-")}',
                'vat_rate': 16.0,
            }
        )
        
        panel, created = LabTestPanel.objects.get_or_create(
            name=panel_name,
            test_profile=cbc_profile,
            defaults={
                'specimen': blood_specimen,
                'unit': unit,
                'item': panel_item,
                'is_qualitative': is_qual,
                'is_quantitative': is_quant,
            }
        )
        if created:
            created_data['panels'].append(panel)
            
            # Link to CBC reagent (1 test consumed per panel)
            link, _ = TestPanelReagent.objects.get_or_create(
                test_panel=panel,
                reagent_item=cbc_reagent_item,
                defaults={'tests_consumed_per_run': 1}
            )
            created_data['links'].append(link)
    
    # Initialize CBC reagent counter
    cbc_counter, _ = TestKitCounter.objects.get_or_create(
        reagent_item=cbc_reagent_item,
        defaults={
            'available_tests': 1000,  # 2 kits = 1000 tests
            'minimum_threshold': 100,
        }
    )
    created_data['counters'].append(cbc_counter)
    
    # 2. LIVER FUNCTION TEST (LFT) PROFILE
    lft_profile, _ = LabTestProfile.objects.get_or_create(name='Liver Function Test (LFT)')
    
    # Create reagents for LFT (separate reagents for different tests)
    alt_ast_reagent, _ = Item.objects.get_or_create(
        name='Roche ALT/AST Reagent',
        defaults={
            'desc': 'Enzymatic colorimetric test for ALT and AST determination',
            'category': 'LabReagent',
            'units_of_measure': 'kits',
            'packed': '1',
            'subpacked': '200',  # 200 tests per kit
            'item_code': 'ROCHE-ALT-AST-200',
            'vat_rate': 16.0,
        }
    )
    created_data['reagents'].append(alt_ast_reagent)
    create_reagent_inventory(alt_ast_reagent, 8000.00, 10000.00, 2)
    
    alp_reagent, _ = Item.objects.get_or_create(
        name='Roche Alkaline Phosphatase Reagent',
        defaults={
            'desc': 'Colorimetric test for ALP determination using p-nitrophenyl phosphate',
            'category': 'LabReagent',
            'units_of_measure': 'kits',
            'packed': '1',
            'subpacked': '200',
            'item_code': 'ROCHE-ALP-200',
            'vat_rate': 16.0,
        }
    )
    created_data['reagents'].append(alp_reagent)
    create_reagent_inventory(alp_reagent, 7500.00, 9500.00, 2)
    
    bilirubin_reagent, _ = Item.objects.get_or_create(
        name='Roche Total Bilirubin Reagent',
        defaults={
            'desc': 'Diazo method for total bilirubin determination',
            'category': 'LabReagent',
            'units_of_measure': 'kits',
            'packed': '1',
            'subpacked': '200',
            'item_code': 'ROCHE-TBIL-200',
            'vat_rate': 16.0,
        }
    )
    created_data['reagents'].append(bilirubin_reagent)
    create_reagent_inventory(bilirubin_reagent, 8500.00, 10500.00, 2)
    
    albumin_protein_reagent, _ = Item.objects.get_or_create(
        name='Roche Albumin/Total Protein Reagent',
        defaults={
            'desc': 'BCG method for albumin and biuret method for total protein',
            'category': 'LabReagent',
            'units_of_measure': 'kits',
            'packed': '1',
            'subpacked': '250',
            'item_code': 'ROCHE-ALB-TP-250',
            'vat_rate': 16.0,
        }
    )
    created_data['reagents'].append(albumin_protein_reagent)
    create_reagent_inventory(albumin_protein_reagent, 9000.00, 11500.00, 2)
    
    # LFT Panels with specific reagent links
    lft_panels_config = [
        ('Alanine Aminotransferase (ALT)', 'U/L', [alt_ast_reagent]),
        ('Aspartate Aminotransferase (AST)', 'U/L', [alt_ast_reagent]),
        ('Alkaline Phosphatase (ALP)', 'U/L', [alp_reagent]),
        ('Total Bilirubin', 'mg/dL', [bilirubin_reagent]),
        ('Albumin', 'g/dL', [albumin_protein_reagent]),
        ('Total Protein', 'g/dL', [albumin_protein_reagent]),
    ]
    
    for panel_name, unit, reagents in lft_panels_config:
        panel_item, _ = Item.objects.get_or_create(
            name=panel_name,
            defaults={
                'desc': f'{panel_name} test - Liver function marker',
                'category': 'Lab Test',
                'units_of_measure': 'unit',
                'packed': '1',
                'subpacked': '1',
                'item_code': f'LAB-{panel_name[:10].upper().replace(" ", "-")}',
                'vat_rate': 16.0,
            }
        )
        
        panel, created = LabTestPanel.objects.get_or_create(
            name=panel_name,
            test_profile=lft_profile,
            defaults={
                'specimen': serum_specimen,
                'unit': unit,
                'item': panel_item,
                'is_qualitative': False,
                'is_quantitative': True,
            }
        )
        if created:
            created_data['panels'].append(panel)
        
        # Link to appropriate reagents
        for reagent in reagents:
            link, _ = TestPanelReagent.objects.get_or_create(
                test_panel=panel,
                reagent_item=reagent,
                defaults={'tests_consumed_per_run': 1}
            )
            created_data['links'].append(link)
    
    # Initialize counters for LFT reagents
    for reagent in [alt_ast_reagent, alp_reagent, bilirubin_reagent, albumin_protein_reagent]:
        counter, _ = TestKitCounter.objects.get_or_create(
            reagent_item=reagent,
            defaults={
                'available_tests': 400,  # 2 kits
                'minimum_threshold': 50,
            }
        )
        created_data['counters'].append(counter)
    
    # 3. LIPID PROFILE
    lipid_profile, _ = LabTestProfile.objects.get_or_create(name='Lipid Profile')
    
    # Lipid reagents
    cholesterol_reagent, _ = Item.objects.get_or_create(
        name='Abbott Cholesterol Reagent',
        defaults={
            'desc': 'Enzymatic endpoint method for cholesterol determination',
            'category': 'LabReagent',
            'units_of_measure': 'kits',
            'packed': '1',
            'subpacked': '300',
            'item_code': 'ABB-CHOL-300',
            'vat_rate': 16.0,
        }
    )
    created_data['reagents'].append(cholesterol_reagent)
    create_reagent_inventory(cholesterol_reagent, 10000.00, 12500.00, 2)
    
    triglycerides_reagent, _ = Item.objects.get_or_create(
        name='Abbott Triglycerides Reagent',
        defaults={
            'desc': 'Enzymatic colorimetric test with lipase and glycerol kinase',
            'category': 'LabReagent',
            'units_of_measure': 'kits',
            'packed': '1',
            'subpacked': '300',
            'item_code': 'ABB-TRIG-300',
            'vat_rate': 16.0,
        }
    )
    created_data['reagents'].append(triglycerides_reagent)
    create_reagent_inventory(triglycerides_reagent, 9500.00, 12000.00, 2)
    
    hdl_ldl_reagent, _ = Item.objects.get_or_create(
        name='Abbott HDL/LDL Reagent',
        defaults={
            'desc': 'Direct measurement of HDL and LDL cholesterol',
            'category': 'LabReagent',
            'units_of_measure': 'kits',
            'packed': '1',
            'subpacked': '250',
            'item_code': 'ABB-HDL-LDL-250',
            'vat_rate': 16.0,
        }
    )
    created_data['reagents'].append(hdl_ldl_reagent)
    create_reagent_inventory(hdl_ldl_reagent, 11000.00, 14000.00, 2)
    
    lipid_panels_config = [
        ('Total Cholesterol', 'mg/dL', [cholesterol_reagent]),
        ('Triglycerides', 'mg/dL', [triglycerides_reagent]),
        ('HDL Cholesterol', 'mg/dL', [hdl_ldl_reagent]),
        ('LDL Cholesterol', 'mg/dL', [hdl_ldl_reagent]),
    ]
    
    for panel_name, unit, reagents in lipid_panels_config:
        panel_item, _ = Item.objects.get_or_create(
            name=panel_name,
            defaults={
                'desc': f'{panel_name} test - Cardiovascular risk assessment',
                'category': 'Lab Test',
                'units_of_measure': 'unit',
                'packed': '1',
                'subpacked': '1',
                'item_code': f'LAB-{panel_name[:10].upper().replace(" ", "-")}',
                'vat_rate': 16.0,
            }
        )
        
        panel, created = LabTestPanel.objects.get_or_create(
            name=panel_name,
            test_profile=lipid_profile,
            defaults={
                'specimen': serum_specimen,
                'unit': unit,
                'item': panel_item,
                'is_qualitative': False,
                'is_quantitative': True,
            }
        )
        if created:
            created_data['panels'].append(panel)
        
        for reagent in reagents:
            link, _ = TestPanelReagent.objects.get_or_create(
                test_panel=panel,
                reagent_item=reagent,
                defaults={'tests_consumed_per_run': 1}
            )
            created_data['links'].append(link)
    
    # Initialize counters for lipid reagents
    for reagent in [cholesterol_reagent, triglycerides_reagent, hdl_ldl_reagent]:
        counter, _ = TestKitCounter.objects.get_or_create(
            reagent_item=reagent,
            defaults={
                'available_tests': 600,  # 2 kits
                'minimum_threshold': 75,
            }
        )
        created_data['counters'].append(counter)
    
    # 4. KIDNEY FUNCTION TEST (RFT/KFT) PROFILE
    kft_profile, _ = LabTestProfile.objects.get_or_create(name='Kidney Function Test (RFT)')
    
    # Kidney function reagents
    creatinine_reagent, _ = Item.objects.get_or_create(
        name='Roche Creatinine Reagent',
        defaults={
            'desc': 'Jaffe kinetic method for creatinine determination',
            'category': 'LabReagent',
            'units_of_measure': 'kits',
            'packed': '1',
            'subpacked': '300',
            'item_code': 'ROCHE-CREAT-300',
            'vat_rate': 16.0,
        }
    )
    created_data['reagents'].append(creatinine_reagent)
    create_reagent_inventory(creatinine_reagent, 8500.00, 11000.00, 2)
    
    urea_reagent, _ = Item.objects.get_or_create(
        name='Roche Urea/BUN Reagent',
        defaults={
            'desc': 'Urease/GLDH enzymatic method for urea determination',
            'category': 'LabReagent',
            'units_of_measure': 'kits',
            'packed': '1',
            'subpacked': '300',
            'item_code': 'ROCHE-UREA-300',
            'vat_rate': 16.0,
        }
    )
    created_data['reagents'].append(urea_reagent)
    create_reagent_inventory(urea_reagent, 7500.00, 9500.00, 2)
    
    uric_acid_reagent, _ = Item.objects.get_or_create(
        name='Roche Uric Acid Reagent',
        defaults={
            'desc': 'Uricase enzymatic colorimetric method',
            'category': 'LabReagent',
            'units_of_measure': 'kits',
            'packed': '1',
            'subpacked': '250',
            'item_code': 'ROCHE-URIC-250',
            'vat_rate': 16.0,
        }
    )
    created_data['reagents'].append(uric_acid_reagent)
    create_reagent_inventory(uric_acid_reagent, 8000.00, 10000.00, 2)
    
    kft_panels_config = [
        ('Creatinine', 'mg/dL', [creatinine_reagent]),
        ('Urea', 'mg/dL', [urea_reagent]),
        ('Blood Urea Nitrogen (BUN)', 'mg/dL', [urea_reagent]),
        ('Uric Acid', 'mg/dL', [uric_acid_reagent]),
    ]
    
    for panel_name, unit, reagents in kft_panels_config:
        panel_item, _ = Item.objects.get_or_create(
            name=panel_name,
            defaults={
                'desc': f'{panel_name} test - Kidney function marker',
                'category': 'Lab Test',
                'units_of_measure': 'unit',
                'packed': '1',
                'subpacked': '1',
                'item_code': f'LAB-{panel_name[:10].upper().replace(" ", "-")}',
                'vat_rate': 16.0,
            }
        )
        
        panel, created = LabTestPanel.objects.get_or_create(
            name=panel_name,
            test_profile=kft_profile,
            defaults={
                'specimen': serum_specimen,
                'unit': unit,
                'item': panel_item,
                'is_qualitative': False,
                'is_quantitative': True,
            }
        )
        if created:
            created_data['panels'].append(panel)
        
        for reagent in reagents:
            link, _ = TestPanelReagent.objects.get_or_create(
                test_panel=panel,
                reagent_item=reagent,
                defaults={'tests_consumed_per_run': 1}
            )
            created_data['links'].append(link)
    
    for reagent in [creatinine_reagent, urea_reagent, uric_acid_reagent]:
        counter, _ = TestKitCounter.objects.get_or_create(
            reagent_item=reagent,
            defaults={
                'available_tests': 600,
                'minimum_threshold': 75,
            }
        )
        created_data['counters'].append(counter)
    
    # 5. THYROID FUNCTION TEST (TFT) PROFILE
    tft_profile, _ = LabTestProfile.objects.get_or_create(name='Thyroid Function Test (TFT)')
    
    # Thyroid reagents
    thyroid_reagent, _ = Item.objects.get_or_create(
        name='Roche Thyroid Panel Reagent',
        defaults={
            'desc': 'Electrochemiluminescence immunoassay (ECLIA) for thyroid hormones',
            'category': 'LabReagent',
            'units_of_measure': 'kits',
            'packed': '1',
            'subpacked': '100',
            'item_code': 'ROCHE-THYROID-100',
            'vat_rate': 16.0,
        }
    )
    created_data['reagents'].append(thyroid_reagent)
    create_reagent_inventory(thyroid_reagent, 18000.00, 23000.00, 2)
    
    tft_panels_config = [
        ('Thyroid Stimulating Hormone (TSH)', 'mIU/L'),
        ('Free T3 (FT3)', 'pg/mL'),
        ('Free T4 (FT4)', 'ng/dL'),
        ('Total T3', 'ng/dL'),
        ('Total T4', 'µg/dL'),
    ]
    
    for panel_name, unit in tft_panels_config:
        panel_item, _ = Item.objects.get_or_create(
            name=panel_name,
            defaults={
                'desc': f'{panel_name} test - Thyroid function assessment',
                'category': 'Lab Test',
                'units_of_measure': 'unit',
                'packed': '1',
                'subpacked': '1',
                'item_code': f'LAB-{panel_name[:10].upper().replace(" ", "-")}',
                'vat_rate': 16.0,
            }
        )
        
        panel, created = LabTestPanel.objects.get_or_create(
            name=panel_name,
            test_profile=tft_profile,
            defaults={
                'specimen': serum_specimen,
                'unit': unit,
                'item': panel_item,
                'is_qualitative': False,
                'is_quantitative': True,
            }
        )
        if created:
            created_data['panels'].append(panel)
        
        link, _ = TestPanelReagent.objects.get_or_create(
            test_panel=panel,
            reagent_item=thyroid_reagent,
            defaults={'tests_consumed_per_run': 1}
        )
        created_data['links'].append(link)
    
    counter, _ = TestKitCounter.objects.get_or_create(
        reagent_item=thyroid_reagent,
        defaults={
            'available_tests': 200,
            'minimum_threshold': 30,
        }
    )
    created_data['counters'].append(counter)
    
    # 6. ELECTROLYTES PROFILE
    electrolytes_profile, _ = LabTestProfile.objects.get_or_create(name='Electrolytes Panel')
    
    # Electrolytes reagent
    electrolytes_reagent, _ = Item.objects.get_or_create(
        name='Roche ISE Electrolytes Reagent',
        defaults={
            'desc': 'Ion-selective electrode (ISE) method for sodium, potassium, chloride',
            'category': 'LabReagent',
            'units_of_measure': 'kits',
            'packed': '1',
            'subpacked': '500',
            'item_code': 'ROCHE-ELEC-500',
            'vat_rate': 16.0,
        }
    )
    created_data['reagents'].append(electrolytes_reagent)
    create_reagent_inventory(electrolytes_reagent, 12000.00, 15000.00, 2)
    
    electrolytes_panels_config = [
        ('Sodium (Na+)', 'mmol/L'),
        ('Potassium (K+)', 'mmol/L'),
        ('Chloride (Cl-)', 'mmol/L'),
        ('Bicarbonate (HCO3-)', 'mmol/L'),
    ]
    
    for panel_name, unit in electrolytes_panels_config:
        panel_item, _ = Item.objects.get_or_create(
            name=panel_name,
            defaults={
                'desc': f'{panel_name} test - Electrolyte balance assessment',
                'category': 'Lab Test',
                'units_of_measure': 'unit',
                'packed': '1',
                'subpacked': '1',
                'item_code': f'LAB-{panel_name[:10].upper().replace(" ", "-")}',
                'vat_rate': 16.0,
            }
        )
        
        panel, created = LabTestPanel.objects.get_or_create(
            name=panel_name,
            test_profile=electrolytes_profile,
            defaults={
                'specimen': serum_specimen,
                'unit': unit,
                'item': panel_item,
                'is_qualitative': False,
                'is_quantitative': True,
            }
        )
        if created:
            created_data['panels'].append(panel)
        
        link, _ = TestPanelReagent.objects.get_or_create(
            test_panel=panel,
            reagent_item=electrolytes_reagent,
            defaults={'tests_consumed_per_run': 1}
        )
        created_data['links'].append(link)
    
    counter, _ = TestKitCounter.objects.get_or_create(
        reagent_item=electrolytes_reagent,
        defaults={
            'available_tests': 1000,
            'minimum_threshold': 150,
        }
    )
    created_data['counters'].append(counter)
    
    # 7. BLOOD GLUCOSE PROFILE
    glucose_profile, _ = LabTestProfile.objects.get_or_create(name='Blood Glucose Profile')
    
    glucose_reagent, _ = Item.objects.get_or_create(
        name='Roche Glucose Reagent',
        defaults={
            'desc': 'Hexokinase enzymatic method for glucose determination',
            'category': 'LabReagent',
            'units_of_measure': 'kits',
            'packed': '1',
            'subpacked': '500',
            'item_code': 'ROCHE-GLUC-500',
            'vat_rate': 16.0,
        }
    )
    created_data['reagents'].append(glucose_reagent)
    create_reagent_inventory(glucose_reagent, 9000.00, 11500.00, 2)
    
    hba1c_reagent, _ = Item.objects.get_or_create(
        name='Abbott HbA1c Reagent',
        defaults={
            'desc': 'HPLC method for hemoglobin A1c determination',
            'category': 'LabReagent',
            'units_of_measure': 'kits',
            'packed': '1',
            'subpacked': '100',
            'item_code': 'ABB-HBA1C-100',
            'vat_rate': 16.0,
        }
    )
    created_data['reagents'].append(hba1c_reagent)
    create_reagent_inventory(hba1c_reagent, 15000.00, 19000.00, 2)
    
    glucose_panels_config = [
        ('Fasting Blood Sugar (FBS)', 'mg/dL', [glucose_reagent]),
        ('Random Blood Sugar (RBS)', 'mg/dL', [glucose_reagent]),
        ('Hemoglobin A1c (HbA1c)', '%', [hba1c_reagent]),
    ]
    
    for panel_name, unit, reagents in glucose_panels_config:
        panel_item, _ = Item.objects.get_or_create(
            name=panel_name,
            defaults={
                'desc': f'{panel_name} test - Diabetes monitoring',
                'category': 'Lab Test',
                'units_of_measure': 'unit',
                'packed': '1',
                'subpacked': '1',
                'item_code': f'LAB-{panel_name[:10].upper().replace(" ", "-")}',
                'vat_rate': 16.0,
            }
        )
        
        panel, created = LabTestPanel.objects.get_or_create(
            name=panel_name,
            test_profile=glucose_profile,
            defaults={
                'specimen': serum_specimen if 'HbA1c' not in panel_name else blood_specimen,
                'unit': unit,
                'item': panel_item,
                'is_qualitative': False,
                'is_quantitative': True,
            }
        )
        if created:
            created_data['panels'].append(panel)
        
        for reagent in reagents:
            link, _ = TestPanelReagent.objects.get_or_create(
                test_panel=panel,
                reagent_item=reagent,
                defaults={'tests_consumed_per_run': 1}
            )
            created_data['links'].append(link)
    
    for reagent in [glucose_reagent, hba1c_reagent]:
        tests = 1000 if reagent == glucose_reagent else 200
        counter, _ = TestKitCounter.objects.get_or_create(
            reagent_item=reagent,
            defaults={
                'available_tests': tests,
                'minimum_threshold': tests // 10,
            }
        )
        created_data['counters'].append(counter)
    
    # ==== ADD REFERENCE VALUES FOR EXISTING PANELS ====
    created_data['reference_values'] = []
    
    # CBC Reference Values (gender-specific where applicable)
    cbc_ref_values = {
        'Hemoglobin': [
            {'sex': 'M', 'age_min': 18, 'age_max': 120, 'low': 13.0, 'high': 17.0},
            {'sex': 'F', 'age_min': 18, 'age_max': 120, 'low': 12.0, 'high': 15.0},
        ],
        'White Blood Cell Count': [
            {'sex': 'B', 'age_min': 18, 'age_max': 120, 'low': 4.0, 'high': 11.0},
        ],
        'Red Blood Cell Count': [
            {'sex': 'M', 'age_min': 18, 'age_max': 120, 'low': 4.5, 'high': 5.9},
            {'sex': 'F', 'age_min': 18, 'age_max': 120, 'low': 4.1, 'high': 5.1},
        ],
        'Platelet Count': [
            {'sex': 'B', 'age_min': 18, 'age_max': 120, 'low': 150, 'high': 400},
        ],
        'Hematocrit': [
            {'sex': 'M', 'age_min': 18, 'age_max': 120, 'low': 38.0, 'high': 50.0},
            {'sex': 'F', 'age_min': 18, 'age_max': 120, 'low': 35.0, 'high': 45.0},
        ],
        'Mean Corpuscular Volume (MCV)': [
            {'sex': 'B', 'age_min': 18, 'age_max': 120, 'low': 80.0, 'high': 100.0},
        ],
    }
    
    # LFT Reference Values
    lft_ref_values = {
        'Alanine Aminotransferase (ALT)': [
            {'sex': 'B', 'age_min': 18, 'age_max': 120, 'low': 7, 'high': 56},
        ],
        'Aspartate Aminotransferase (AST)': [
            {'sex': 'B', 'age_min': 18, 'age_max': 120, 'low': 10, 'high': 40},
        ],
        'Alkaline Phosphatase (ALP)': [
            {'sex': 'B', 'age_min': 18, 'age_max': 120, 'low': 44, 'high': 147},
        ],
        'Total Bilirubin': [
            {'sex': 'B', 'age_min': 18, 'age_max': 120, 'low': 0.3, 'high': 1.2},
        ],
        'Albumin': [
            {'sex': 'B', 'age_min': 18, 'age_max': 120, 'low': 3.5, 'high': 5.5},
        ],
        'Total Protein': [
            {'sex': 'B', 'age_min': 18, 'age_max': 120, 'low': 6.0, 'high': 8.3},
        ],
    }
    
    # Lipid Profile Reference Values
    lipid_ref_values = {
        'Total Cholesterol': [
            {'sex': 'B', 'age_min': 18, 'age_max': 120, 'low': 0, 'high': 200},  # <200 desirable
        ],
        'Triglycerides': [
            {'sex': 'B', 'age_min': 18, 'age_max': 120, 'low': 0, 'high': 150},  # <150 normal
        ],
        'HDL Cholesterol': [
            {'sex': 'M', 'age_min': 18, 'age_max': 120, 'low': 40, 'high': 999},  # >40 for men
            {'sex': 'F', 'age_min': 18, 'age_max': 120, 'low': 50, 'high': 999},  # >50 for women
        ],
        'LDL Cholesterol': [
            {'sex': 'B', 'age_min': 18, 'age_max': 120, 'low': 0, 'high': 100},  # <100 optimal
        ],
    }
    
    # Kidney Function Test Reference Values
    kft_ref_values = {
        'Creatinine': [
            {'sex': 'M', 'age_min': 18, 'age_max': 120, 'low': 0.7, 'high': 1.3},
            {'sex': 'F', 'age_min': 18, 'age_max': 120, 'low': 0.6, 'high': 1.1},
        ],
        'Urea': [
            {'sex': 'B', 'age_min': 18, 'age_max': 120, 'low': 15, 'high': 40},
        ],
        'Blood Urea Nitrogen (BUN)': [
            {'sex': 'B', 'age_min': 18, 'age_max': 120, 'low': 7, 'high': 20},
        ],
        'Uric Acid': [
            {'sex': 'M', 'age_min': 18, 'age_max': 120, 'low': 3.4, 'high': 7.0},
            {'sex': 'F', 'age_min': 18, 'age_max': 120, 'low': 2.4, 'high': 6.0},
        ],
    }
    
    # Thyroid Function Test Reference Values
    tft_ref_values = {
        'Thyroid Stimulating Hormone (TSH)': [
            {'sex': 'B', 'age_min': 18, 'age_max': 120, 'low': 0.4, 'high': 4.0},
        ],
        'Free T3 (FT3)': [
            {'sex': 'B', 'age_min': 18, 'age_max': 120, 'low': 2.0, 'high': 4.4},
        ],
        'Free T4 (FT4)': [
            {'sex': 'B', 'age_min': 18, 'age_max': 120, 'low': 0.8, 'high': 1.8},
        ],
        'Total T3': [
            {'sex': 'B', 'age_min': 18, 'age_max': 120, 'low': 80, 'high': 200},
        ],
        'Total T4': [
            {'sex': 'B', 'age_min': 18, 'age_max': 120, 'low': 5.0, 'high': 12.0},
        ],
    }
    
    # Electrolytes Reference Values
    electrolytes_ref_values = {
        'Sodium (Na+)': [
            {'sex': 'B', 'age_min': 18, 'age_max': 120, 'low': 136, 'high': 145},
        ],
        'Potassium (K+)': [
            {'sex': 'B', 'age_min': 18, 'age_max': 120, 'low': 3.5, 'high': 5.1},
        ],
        'Chloride (Cl-)': [
            {'sex': 'B', 'age_min': 18, 'age_max': 120, 'low': 98, 'high': 107},
        ],
        'Bicarbonate (HCO3-)': [
            {'sex': 'B', 'age_min': 18, 'age_max': 120, 'low': 22, 'high': 29},
        ],
    }
    
    # Blood Glucose Reference Values
    glucose_ref_values = {
        'Fasting Blood Sugar (FBS)': [
            {'sex': 'B', 'age_min': 18, 'age_max': 120, 'low': 70, 'high': 100},  # Normal fasting
        ],
        'Random Blood Sugar (RBS)': [
            {'sex': 'B', 'age_min': 18, 'age_max': 120, 'low': 70, 'high': 140},  # Normal random
        ],
        'Hemoglobin A1c (HbA1c)': [
            {'sex': 'B', 'age_min': 18, 'age_max': 120, 'low': 4.0, 'high': 5.6},  # <5.7% normal
        ],
    }
    
    # Create reference values for all panels
    all_ref_values = {
        **cbc_ref_values, 
        **lft_ref_values, 
        **lipid_ref_values,
        **kft_ref_values,
        **tft_ref_values,
        **electrolytes_ref_values,
        **glucose_ref_values
    }
    
    for panel_name, ref_ranges in all_ref_values.items():
        # Find all panels with this name (may be in different profiles)
        panels = LabTestPanel.objects.filter(name=panel_name)
        for panel in panels:
            for ref_range in ref_ranges:
                sex_value = ref_range['sex'] if ref_range['sex'] != 'B' else None
                if sex_value:
                    ref_val, created = ReferenceValue.objects.get_or_create(
                        lab_test_panel=panel,
                        sex=sex_value,
                        age_min=ref_range['age_min'],
                        age_max=ref_range['age_max'],
                        defaults={
                            'ref_value_low': Decimal(str(ref_range['low'])),
                            'ref_value_high': Decimal(str(ref_range['high'])),
                        }
                    )
                    if created:
                        created_data['reference_values'].append(ref_val)
                else:
                    # Create for both Male and Female when sex='B'
                    for sex_choice in ['M', 'F']:
                        ref_val, created = ReferenceValue.objects.get_or_create(
                            lab_test_panel=panel,
                            sex=sex_choice,
                            age_min=ref_range['age_min'],
                            age_max=ref_range['age_max'],
                            defaults={
                                'ref_value_low': Decimal(str(ref_range['low'])),
                                'ref_value_high': Decimal(str(ref_range['high'])),
                            }
                        )
                        if created:
                            created_data['reference_values'].append(ref_val)
    
    print(f"\n✅ Created Real-World Lab Data:")
    print(f"   - {len(created_data['profiles'])} Profiles")
    print(f"   - {len(created_data['panels'])} Test Panels")
    print(f"   - {len(created_data['reference_values'])} Reference Values")
    print(f"   - {len(created_data['reagents'])} Reagent Items")
    print(f"   - {len(created_data['inventory_records'])} Reagent Inventory Records")
    print(f"   - {len(created_data['links'])} Panel-Reagent Links")
    print(f"   - {len(created_data['counters'])} Reagent Counters")
    
    return created_data


def create_hospital_wards_and_beds():
    """
    Create realistic hospital wards and beds for inpatient management.
    Creates wards with appropriate bed types and capacity.
    """
    
    wards_data = [
        # General Wards
        {"name": "Male General Ward A", "ward_type": "general", "gender": "male", "capacity": 20},
        {"name": "Male General Ward B", "ward_type": "general", "gender": "male", "capacity": 20},
        {"name": "Female General Ward A", "ward_type": "general", "gender": "female", "capacity": 20},
        {"name": "Female General Ward B", "ward_type": "general", "gender": "female", "capacity": 20},
        
        # Pediatrics Wards
        {"name": "Pediatrics Ward A", "ward_type": "pediatrics", "gender": "male", "capacity": 15},
        {"name": "Pediatrics Ward B", "ward_type": "pediatrics", "gender": "female", "capacity": 15},
        
        # Maternity Ward
        {"name": "Maternity Ward", "ward_type": "maternity", "gender": "female", "capacity": 25},
        
        # Amenity/Private Wards
        {"name": "Private Ward - Male", "ward_type": "amenity", "gender": "male", "capacity": 8},
        {"name": "Private Ward - Female", "ward_type": "amenity", "gender": "female", "capacity": 8},
    ]
    
    bed_types_by_ward = {
        "general": ["manual", "semi_electric"],
        "pediatrics": ["manual", "semi_electric"],
        "maternity": ["semi_electric", "fully_electric"],
        "amenity": ["fully_electric", "fully_electric"],  # More electric beds in private
    }
    
    created_wards = []
    created_beds = []
    
    print("\n🏥 Creating Hospital Wards and Beds...")
    
    for ward_data in wards_data:
        # Create or get the ward
        ward, ward_created = Ward.objects.get_or_create(
            name=ward_data["name"],
            defaults={
                "ward_type": ward_data["ward_type"],
                "gender": ward_data["gender"],
                "capacity": ward_data["capacity"]
            }
        )
        
        if ward_created:
            created_wards.append(ward)
            print(f"   ✓ Created ward: {ward.name} ({ward.capacity} beds)")
        
        # Create beds for this ward if they don't exist
        existing_beds_count = Bed.objects.filter(ward=ward).count()
        
        if existing_beds_count == 0:
            bed_types = bed_types_by_ward[ward_data["ward_type"]]
            
            for bed_num in range(1, ward_data["capacity"] + 1):
                # Alternate between bed types for variety
                bed_type = bed_types[bed_num % len(bed_types)]
                
                # Create bed number (e.g., "A-01", "A-02", etc.)
                bed_number = f"{ward.name.split()[0][0]}{ward.name.split()[-1][0] if len(ward.name.split()) > 1 else ''}-{bed_num:02d}"
                
                bed = Bed.objects.create(
                    ward=ward,
                    bed_type=bed_type,
                    bed_number=bed_number,
                    status="available"
                )
                created_beds.append(bed)
    
    print(f"\n✅ Created Hospital Infrastructure:")
    print(f"   - {len(created_wards)} Wards")
    print(f"   - {len(created_beds)} Beds")
    print(f"   - Total Capacity: {sum(w.capacity for w in created_wards)} beds")
    
    # Summary by ward type
    ward_types = {}
    for ward in created_wards:
        if ward.ward_type not in ward_types:
            ward_types[ward.ward_type] = {"count": 0, "beds": 0}
        ward_types[ward.ward_type]["count"] += 1
        ward_types[ward.ward_type]["beds"] += ward.capacity
    
    print("\n   Ward Types Summary:")
    for ward_type, stats in ward_types.items():
        print(f"   - {ward_type.title()}: {stats['count']} ward(s), {stats['beds']} beds")
    
    return {
        "wards": created_wards,
        "beds": created_beds
    }
