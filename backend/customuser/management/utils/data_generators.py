import random
from faker import Faker

from inventory.models import Item, Department, ItemUnit, Supplier, Unit
from customuser.models import CustomUser
from company.models import Company, CompanyBranch, InsuranceCompany
from authperms.models import Permission, Group
from patient.models import Patient

from laboratory.models import LabTestProfile, Specimen, LabTestPanel, LabTestInterpretation, ReferenceValue
from inpatient.models import Ward, Bed


fake = Faker()

# "Lab" (not "Laboratory") is the canonical name: laboratory.utils.lab_department()
# and the stock service both look it up by that name, so a stray "Laboratory"
# department would sit there holding no stock.
DEPARTMENTS = [
    "General", "Main", "Surgery", "Radiology", "Lab", "Pharmacy", "Dental", "Orthopedics", "Ophthalmology",
    "Cardiology", "Neurology", "Psychiatry", "Gynecology", "Pediatrics", "Dermatology", "ENT", "Urology",
]

# Items tagged to this department are shared with every department.
SHARED_DEPARTMENT_NAME = "General"

# Which department owns each kind of item. Anything mapped to "General" is
# shared rather than owned by one department.
CATEGORY_DEPARTMENTS = {
    "Drug": ["Pharmacy"],
    "LabReagent": ["Lab"],
    "LabConsumable": ["Lab"],
    "Lab Test": ["Lab"],
    "SurgicalEquipment": ["Surgery"],
    "Furniture": [SHARED_DEPARTMENT_NAME],
    "general": [SHARED_DEPARTMENT_NAME],
    "General Appointment": [SHARED_DEPARTMENT_NAME],
    "Specialized Appointment": [SHARED_DEPARTMENT_NAME],
}

# The general catalogue: (name, category, base unit, bought in packs, description).
# Every row is fixed rather than drawn at random. A random category once made
# a stretcher a lab reagent, and a random unit made the same item twice over,
# in kilograms and in millilitres.
DEMO_CATALOGUE = [
    ("Paracetamol Tablet", "Drug", "tablets", True, "Used for pain relief and fever reduction."),
    ("Aspirin", "Drug", "tablets", True, "Antiplatelet and pain relief."),
    ("Ibuprofen", "Drug", "tablets", True, "Anti-inflammatory pain relief."),
    ("Amoxicillin Capsule", "Drug", "capsules", True, "Antibiotic for bacterial infections."),
    ("Morphine", "Drug", "ampoules", True, "Opioid analgesic for severe pain."),
    ("Insulin Pen", "Drug", "pens", True, "Device for insulin injection."),
    ("Antiseptic Solution", "Drug", "ml", False, "Solution for cleaning wounds."),
    ("Saline Drip", "Drug", "bags", True, "IV fluid for hydration."),
    ("Surgical Gloves", "SurgicalEquipment", "pairs", True, "Sterile gloves for surgical procedures."),
    ("Syringe", "SurgicalEquipment", "pieces", True, "Disposable syringe for injections."),
    ("Catheter", "SurgicalEquipment", "pieces", True, "Urinary drainage catheter."),
    ("Gauze Roll", "SurgicalEquipment", "rolls", True, "Sterile gauze for wound dressing."),
    ("Bandage", "SurgicalEquipment", "rolls", True, "Elastic bandage for support."),
    ("Face Mask", "SurgicalEquipment", "pieces", True, "Protective mask for infection control."),
    ("Surgical Mask", "SurgicalEquipment", "pieces", True, "Protective mask for surgery."),
    ("Scalpel", "SurgicalEquipment", "pieces", True, "Sharp blade for surgical procedures."),
    ("Thermometer", "SurgicalEquipment", "pieces", False, "Device to measure body temperature."),
    ("Stethoscope", "SurgicalEquipment", "pieces", False, "Instrument to listen to heart and lungs."),
    ("Blood Pressure Monitor", "SurgicalEquipment", "pieces", False, "Device to measure blood pressure."),
    ("Pulse Oximeter", "SurgicalEquipment", "pieces", False, "Measures blood oxygen saturation."),
    ("Nebulizer", "SurgicalEquipment", "pieces", False, "Delivers inhaled medication."),
    ("Suction Machine", "SurgicalEquipment", "pieces", False, "Clears airway secretions."),
    ("ECG Machine", "SurgicalEquipment", "pieces", False, "Device to record heart activity."),
    ("Defibrillator", "SurgicalEquipment", "pieces", False, "Device to restore normal heartbeat."),
    ("Operating Light", "SurgicalEquipment", "pieces", False, "Theatre lighting."),
    ("Wheelchair", "Furniture", "pieces", False, "Mobility aid for patients."),
    ("Crutches", "Furniture", "pairs", False, "Aid for walking support."),
    ("IV Stand", "Furniture", "pieces", False, "Holds infusion bags at the bedside."),
    ("Hospital Bed", "Furniture", "pieces", False, "Adjustable ward bed."),
    ("Stretcher", "Furniture", "pieces", False, "Patient transport."),
    ("Mayo Stand", "Furniture", "pieces", False, "Instrument tray stand for theatre."),
    ("Instrument Table", "Furniture", "pieces", False, "Theatre instrument table."),
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
    "RECEPTIONIST": ["CAN_ACCESS_RECEPTION_DASHBOARD", "CAN_ACCESS_PATIENTS_DASHBOARD"],
    "LAB_TECH": ["CAN_ACCESS_LABORATORY_DASHBOARD", "CAN_RECEIVE_INVENTORY_NOTIFICATIONS"],
    "NURSE": ["CAN_ACCESS_NURSING_DASHBOARD"],
}


MASTER_LAB_UNITS = [
    # (symbol, name, category)
    # 1. Mass / Weight
    ('kg', 'kilogram', 'mass'),
    ('g', 'gram', 'mass'),
    ('mg', 'milligram', 'mass'),
    ('µg', 'microgram', 'mass'),
    ('ng', 'nanogram', 'mass'),
    ('pg', 'picogram', 'mass'),
    ('fg', 'femtogram', 'mass'),
    # 2. Volume
    ('L', 'litre', 'volume'),
    ('dL', 'decilitre', 'volume'),
    ('mL', 'millilitre', 'volume'),
    ('µL', 'microlitre', 'volume'),
    ('nL', 'nanolitre', 'volume'),
    ('fL', 'femtolitre', 'volume'),
    # 3. Length
    ('m', 'meter', 'length'),
    ('cm', 'centimeter', 'length'),
    ('mm', 'millimeter', 'length'),
    ('µm', 'micrometer', 'length'),
    ('nm', 'nanometer', 'length'),
    ('pm', 'picometer', 'length'),
    # 4. Concentration
    ('g/L', 'grams per litre', 'concentration'),
    ('g/dL', 'grams per decilitre', 'concentration'),
    ('mg/dL', 'milligrams per decilitre', 'concentration'),
    ('mg/L', 'milligrams per litre', 'concentration'),
    ('µg/mL', 'micrograms per millilitre', 'concentration'),
    ('µg/L', 'micrograms per litre', 'concentration'),
    ('ng/mL', 'nanograms per millilitre', 'concentration'),
    ('pg/mL', 'picograms per millilitre', 'concentration'),
    ('mol/L', 'moles per litre', 'concentration'),
    ('mmol/L', 'millimoles per litre', 'concentration'),
    ('µmol/L', 'micromoles per litre', 'concentration'),
    ('nmol/L', 'nanomoles per litre', 'concentration'),
    ('pmol/L', 'picomoles per litre', 'concentration'),
    ('Eq/L', 'equivalents per litre', 'concentration'),
    ('mEq/L', 'milliequivalents per litre', 'concentration'),
    # 5. Hematology
    ('×10⁹/µL', '10^9 per microlitre', 'hematology'),
    ('×10³/µL', '10^3 per microlitre', 'hematology'),
    ('x10³/µL', '10^3 per microlitre (alt)', 'hematology'),
    ('x10⁶/µL', '10^6 per microlitre', 'hematology'),
    ('10^9/L', '10^9 per litre', 'hematology'),
    ('cells/µL', 'cells per microlitre', 'hematology'),
    ('cells/mm³', 'cells per cubic millimetre', 'hematology'),
    ('%', 'percent', 'hematology'),
    # 6. Enzyme Activity
    ('U/L', 'units per litre', 'enzyme'),
    ('IU/L', 'international units per litre', 'enzyme'),
    ('IU', 'international unit', 'enzyme'),
    ('mIU/mL', 'milli-IU per millilitre', 'enzyme'),
    ('kU/L', 'kilo units per litre', 'enzyme'),
    # 7. Hormones & Tumor Markers
    ('IU/mL', 'international units per millilitre', 'hormone'),
    ('mIU/L', 'milli-IU per litre', 'hormone'),
    ('AU/mL', 'arbitrary units per millilitre', 'hormone'),
    # 8. Microbiology
    ('CFU/mL', 'colony forming units per millilitre', 'microbiology'),
    ('CFU/g', 'colony forming units per gram', 'microbiology'),
    ('PFU/mL', 'plaque forming units per millilitre', 'microbiology'),
    ('copies/mL', 'copies per millilitre', 'microbiology'),
    # 9. Urinalysis
    ('mg/24h', 'milligrams per 24 hours', 'urinalysis'),
    ('mmol/24h', 'millimoles per 24 hours', 'urinalysis'),
    ('cells/HPF', 'cells per high power field', 'urinalysis'),
    ('casts/LPF', 'casts per low power field', 'urinalysis'),
    # 10. Coagulation
    ('sec', 'seconds', 'coagulation'),
    ('INR', 'international normalised ratio', 'coagulation'),
    # 11. Blood Gas
    ('mmHg', 'millimetres of mercury', 'blood_gas'),
    ('kPa', 'kilopascal', 'blood_gas'),
    # 12. Osmolality & Density
    ('mOsm/kg', 'milliosmoles per kilogram', 'osmolality'),
    ('Osm/kg', 'osmoles per kilogram', 'osmolality'),
    ('g/mL', 'grams per millilitre', 'osmolality'),
    ('kg/L', 'kilograms per litre', 'osmolality'),
    # 13. Molecular Biology
    ('ng/µL', 'nanograms per microlitre', 'molecular'),
    ('bp', 'base pairs', 'molecular'),
    ('kb', 'kilobase', 'molecular'),
    ('Mb', 'megabase', 'molecular'),
    # 14. Dose & Ratio
    ('mg/kg', 'milligrams per kilogram', 'dose'),
    ('µg/kg', 'micrograms per kilogram', 'dose'),
    ('mg/g', 'milligrams per gram', 'dose'),
    ('mmol/kg', 'millimoles per kilogram', 'dose'),
    ('mL/kg', 'millilitres per kilogram', 'dose'),
    ('ratio', 'ratio', 'dose'),
    ('index', 'index', 'dose'),
    ('score', 'score', 'dose'),
    # General
    ('unit', 'unit', 'general'),
    ('kits', 'kits', 'general'),
    ('tablets', 'tablets', 'general'),
    ('capsules', 'capsules', 'general'),
    ('vials', 'vials', 'general'),
    ('ampoules', 'ampoules', 'general'),
    ('bags', 'bags', 'general'),
    ('inhalers', 'inhalers', 'general'),
    ('sachets', 'sachets', 'general'),
    ('bottles', 'bottles', 'general'),
    ('rolls', 'rolls', 'general'),
    ('pieces', 'pieces', 'general'),
    ('pairs', 'pairs', 'general'),
]


def lab_item_code(panel_name, profile_name=None):
    """
    A stable, collision-free code for a lab test item.

    The old template truncated the panel name to ten characters, so any two
    panels sharing a prefix ended up with the same code -- and an item code is
    what groups an item's stock across every receipt and every month, so a
    shared one silently merges two different tests in any report that groups
    by it. A short hash of the full name cannot collide that way, and it is
    deterministic, so re-running the seeder does not mint a second code for a
    panel that already has one.
    """
    import hashlib

    full = f"{profile_name or ''}|{panel_name}".strip('|')
    slug = ''.join(ch for ch in panel_name.upper() if ch.isalnum())[:10] or 'TEST'
    digest = hashlib.sha1(full.encode('utf-8')).hexdigest()[:4].upper()
    return f"LAB-{slug}-{digest}"


def create_units():
    """Create all master lab units of measurement."""
    created = []
    for symbol, name, category in MASTER_LAB_UNITS:
        unit, _ = Unit.objects.get_or_create(
            symbol=symbol,
            defaults={'name': name, 'category': category}
        )
        created.append(unit)
    return created


def _get_unit(symbol):
    """Return a Unit instance by symbol, or None if not found."""
    if not symbol:
        return None
    return Unit.objects.filter(symbol=symbol).first()


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



def create_dummy_items():
    '''The general catalogue. Lab items and services are seeded elsewhere.'''
    items = []
    for name, category, unit, packed, desc in DEMO_CATALOGUE:
        item, created = Item.objects.get_or_create(
            name=name,
            category=category,
            units_of_measure=unit,
            defaults={
                'item_code': fake.unique.bothify(text='???-#####'),
                'desc': desc,
                'vat_rate': 16.0,
                'slow_moving_period': random.choice([30, 60, 90, 180]),
            }
        )
        tag_item_departments(item, departments_for_category(item.category))
        if created and packed:
            add_demo_pack_sizes(item)
        items.append(item)
    return items


# Consumables really are bought by the box and the carton, so the demo data
# gives most stocked items a pack ladder. Without it nothing on the requisition
# or receiving screens has a unit to choose and the feature looks broken.
DEMO_PACK_LADDERS = [
    [('Box', 10), ('Carton', 100)],
    [('Box', 12), ('Carton', 144)],
    [('Pack', 25)],
    [('Strip', 10), ('Box', 100)],
    [('Box', 50)],
]


def add_demo_pack_sizes(item):
    '''Give a stocked item a plausible pack ladder, all stated in base units.'''
    for name, factor in random.choice(DEMO_PACK_LADDERS):
        ItemUnit.objects.get_or_create(
            item=item, name=name,
            defaults={
                'factor_to_base': factor,
                'is_purchase_default': factor <= 50,
            },
        )


def create_appointment_items():
    """
    Create appointment-specific items with proper categories.
    General Appointment has one item, Specialized Appointments have specific specialty items.
    """
    appointment_items = []
    
    # General Appointment - single item
    general_appointment, _ = Item.objects.get_or_create(
        name='General Appointment',
        category='General Appointment',
        units_of_measure='unit',
        defaults={
            'item_code': 'GEN-00001',
            'desc': 'Standard general consultation appointment',
            'vat_rate': 0.0,  # Appointments typically don't have VAT
            'slow_moving_period': 30,
        }
    )
    # Appointments are booked anywhere, so they are shared.
    tag_item_departments(general_appointment, SHARED_DEPARTMENT_NAME)
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
        item, _ = Item.objects.get_or_create(
            name=appt['name'],
            category='Specialized Appointment',
            units_of_measure='unit',
            defaults={
                'item_code': appt['code'],
                'desc': appt['desc'],
                'vat_rate': 0.0,  # Appointments typically don't have VAT
                'slow_moving_period': 30,
            }
        )
        tag_item_departments(item, SHARED_DEPARTMENT_NAME)
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
        perm = Permission.objects.filter(name=perm_name).first()
        if perm is None:
            perm = Permission.objects.create(name=perm_name)
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


def tag_item_departments(item, department_names, primary=None):
    """
    Link an item to the departments that use it.

    The first name listed becomes the primary (owning) department unless
    `primary` says otherwise. Tagging an item to "General" shares it with every
    department, so shared stock does not need enumerating against each one.
    """
    from inventory.models import ItemDepartment

    if isinstance(department_names, str):
        department_names = [department_names]

    primary = primary or (department_names[0] if department_names else None)
    links = []

    for name in department_names:
        department, _ = Department.objects.get_or_create(name=name)
        link, _ = ItemDepartment.objects.update_or_create(
            item=item, department=department,
            defaults={'is_primary': name == primary},
        )
        links.append(link)

    return links


def departments_for_category(category):
    """Departments an item of this category belongs to."""
    return CATEGORY_DEPARTMENTS.get(category, [SHARED_DEPARTMENT_NAME])


def create_item_department_links():
    """
    Tag every item to the departments that use it.

    Runs as a sweeper after the item generators, so items created by any route
    (random items, appointments, lab panels, reagents, pharmaceuticals) end up
    tagged. Items already tagged are left alone.
    """
    from inventory.models import Item, ItemDepartment, StockBalance

    created = 0
    skipped = 0

    for item in Item.objects.all().prefetch_related('department_links'):
        # .all() reads the prefetch cache; .exists() would re-query per item.
        if item.department_links.all():
            skipped += 1
            continue

        names = list(departments_for_category(item.category))

        # If the item already holds stock somewhere, that location is the
        # truth regardless of what its category suggests.
        stocked_at = list(
            StockBalance.objects.filter(item=item)
            .values_list('department__name', flat=True)
            .distinct()
        )
        for name in stocked_at:
            if name and name not in names:
                names.append(name)

        if not names:
            names = [SHARED_DEPARTMENT_NAME]

        # Prefer a location the item actually sits in as the primary one.
        primary = stocked_at[0] if stocked_at else names[0]
        tag_item_departments(item, names, primary=primary)
        created += 1

    return {
        'tagged': created,
        'already_tagged': skipped,
        'links': ItemDepartment.objects.count(),
    }


def create_demo_lab_profiles_and_panels():
    # Common specimens
    specimen_names = ["Blood", "Urine", "Stool", "Sputum", "CSF", "Saliva", "Swab", "Serum", "Plasma"]
    specimens = {}
    for name in specimen_names:
        specimens[name], _ = Specimen.objects.get_or_create(name=name)

    # Only what the curated set in create_real_world_lab_data() does not cover.
    # CBC, liver and kidney panels used to be declared here too. That left two
    # "Urea" panels in two differently named renal profiles, and worse, the toy
    # CBC panels shared the curated profile's name: the curated generator found
    # Hemoglobin, White Blood Cell Count and Platelet Count already there,
    # skipped them, and never linked the reagent the CBC showcase exists for.
    profiles_and_panels = {
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
                category="Lab Test",
                units_of_measure=panel.get("unit", "unit") or "unit",
                defaults={
                    "item_code": lab_item_code(panel['name'], profile_name),
                    "desc": f"{panel['name']} test for {profile_name}",
                    "vat_rate": 0.0,
                    "slow_moving_period": 90,
                }
            )
            tag_item_departments(item, "Lab")
            lab_panel, _ = LabTestPanel.objects.get_or_create(
                name=panel["name"],
                specimen=specimens[panel["specimen"]],
                test_profile=profile,
                item=item,
                defaults={
                    'units': _get_unit(panel.get("unit", "")),
                    'is_qualitative': panel["is_qualitative"],
                    'is_quantitative': panel["is_quantitative"],
                }
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
        
        # Additional panels from real-world lab data
        "Red Blood Cell Count": [
            ('M', 18, 120, 4.5, 5.9),
            ('F', 18, 120, 4.1, 5.1),
            ('M', 1, 17, 3.8, 5.5),
            ('F', 1, 17, 3.8, 5.5),
        ],
        
        "Hematocrit": [
            ('M', 18, 120, 40.0, 54.0),
            ('F', 18, 120, 36.0, 46.0),
            ('M', 1, 17, 32.0, 48.0),
            ('F', 1, 17, 32.0, 48.0),
        ],
        
        "Mean Corpuscular Volume (MCV)": [
            ('M', 18, 120, 80.0, 100.0),
            ('F', 18, 120, 80.0, 100.0),
            ('M', 1, 17, 70.0, 90.0),
            ('F', 1, 17, 70.0, 90.0),
        ],
        
        "Alanine Aminotransferase (ALT)": [
            ('M', 18, 120, 7.0, 55.0),
            ('F', 18, 120, 7.0, 45.0),
        ],
        
        "Aspartate Aminotransferase (AST)": [
            ('M', 18, 120, 8.0, 48.0),
            ('F', 18, 120, 8.0, 40.0),
        ],
        
        "Alkaline Phosphatase (ALP)": [
            ('M', 18, 120, 40.0, 129.0),
            ('F', 18, 120, 35.0, 104.0),
            ('M', 1, 17, 100.0, 390.0),
            ('F', 1, 17, 100.0, 320.0),
        ],
        
        "Total Bilirubin": [
            ('M', 18, 120, 0.1, 1.2),
            ('F', 18, 120, 0.1, 1.2),
        ],
        
        "Albumin": [
            ('M', 18, 120, 3.5, 5.0),
            ('F', 18, 120, 3.5, 5.0),
        ],
        
        "Total Protein": [
            ('M', 18, 120, 6.0, 8.3),
            ('F', 18, 120, 6.0, 8.3),
        ],
        
        "Total Cholesterol": [
            ('M', 18, 120, 125.0, 200.0),
            ('F', 18, 120, 125.0, 200.0),
        ],
        
        "Triglycerides": [
            ('M', 18, 120, 40.0, 150.0),
            ('F', 18, 120, 40.0, 150.0),
        ],
        
        "HDL Cholesterol": [
            ('M', 18, 120, 40.0, 60.0),
            ('F', 18, 120, 50.0, 70.0),
        ],
        
        "LDL Cholesterol": [
            ('M', 18, 120, 0.0, 100.0),
            ('F', 18, 120, 0.0, 100.0),
        ],
        
        "Blood Urea Nitrogen (BUN)": [
            ('M', 18, 120, 7.0, 20.0),
            ('F', 18, 120, 7.0, 20.0),
        ],
        
        "Uric Acid": [
            ('M', 18, 120, 3.5, 7.2),
            ('F', 18, 120, 2.6, 6.0),
        ],
        
        "Thyroid Stimulating Hormone (TSH)": [
            ('M', 18, 120, 0.4, 4.0),
            ('F', 18, 120, 0.4, 4.0),
        ],
        
        "Free T3 (FT3)": [
            ('M', 18, 120, 2.3, 4.2),
            ('F', 18, 120, 2.3, 4.2),
        ],
        
        "Free T4 (FT4)": [
            ('M', 18, 120, 0.8, 1.8),
            ('F', 18, 120, 0.8, 1.8),
        ],
        
        "Total T3": [
            ('M', 18, 120, 80.0, 200.0),
            ('F', 18, 120, 80.0, 200.0),
        ],
        
        "Total T4": [
            ('M', 18, 120, 4.5, 12.0),
            ('F', 18, 120, 4.5, 12.0),
        ],
        
        "Fasting Blood Sugar (FBS)": [
            ('M', 18, 120, 70.0, 100.0),
            ('F', 18, 120, 70.0, 100.0),
        ],
        
        "Random Blood Sugar (RBS)": [
            ('M', 18, 120, 70.0, 140.0),
            ('F', 18, 120, 70.0, 140.0),
        ],
        
        "Hemoglobin A1c (HbA1c)": [
            ('M', 18, 120, 4.0, 5.6),
            ('F', 18, 120, 4.0, 5.6),
        ],
    }
    
    # Create reference values
    for test_name, ranges in reference_ranges.items():
        try:
            # Find all lab test panels with this name (there may be duplicates)
            lab_panels = LabTestPanel.objects.filter(name=test_name)
            
            if not lab_panels.exists():
                print(f"Warning: Lab test panel '{test_name}' not found. Skipping reference values.")
                continue
            
            # Create reference values for each matching panel
            for lab_panel in lab_panels:
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
                    
        except Exception as e:
            print(f"Error creating reference values for '{test_name}': {e}")
            continue
    
    return reference_values_created


def create_lab_test_interpretations():
    """
    Create common interpretations for lab test profiles.
    """
    interpretations_created = []

    profile_interpretations = {
        "Complete Blood Count (CBC)": (
            "This profile evaluates overall health and detects a wide range of disorders, including anemia, infection, and leukemia.",
            "Review full CBC parameters. Correlate with clinical findings.",
            False
        ),
        "Liver Function Test (LFT)": (
            "Evaluates liver health, detects liver damage or disease.",
            "If abnormal, consider imaging or further viral hepatitis screening.",
            False
        ),
        "Kidney Function Test (RFT)": (
            "Assesses kidney function and hydration status.",
            "Adjust renally cleared medications if eGFR is reduced.",
            False
        ),
        "Urinalysis": (
            "Detects and manages a wide range of disorders, such as urinary tract infections, kidney disease and diabetes.",
            "If signs of UTI, consider urine culture.",
            False
        ),
        "COVID-19 PCR": (
            "Detects the presence of SARS-CoV-2 RNA.",
            "If positive, isolate patient and initiate contact tracing.",
            True
        ),
        "Malaria Test": (
            "Detects the presence of malaria parasites in the blood.",
            "If positive, initiate antimalarial therapy immediately.",
            True
        )
    }

    for profile_name, (interpretation, clinical_action, requires_attention) in profile_interpretations.items():
        try:
            profile = LabTestProfile.objects.get(name=profile_name)
            interp, created = LabTestInterpretation.objects.get_or_create(
                test_profile=profile,
                defaults={
                    'interpretation': interpretation,
                    'clinical_action': clinical_action,
                    'requires_immediate_attention': requires_attention,
                }
            )
            if created:
                interpretations_created.append(interp)
        except LabTestProfile.DoesNotExist:
            print(f"Warning: Lab test profile '{profile_name}' not found. Skipping interpretation.")

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


def create_dummy_requisitions(count=8):
    """
    Raise a few requisitions, most of them ordered by the box rather than by
    the individual unit, so the procurement screens have realistic pack-based
    lines to show.
    """
    from inventory.models import Requisition, RequisitionItem

    requester = CustomUser.objects.filter(role=CustomUser.SYS_ADMIN).first() or CustomUser.objects.first()
    departments = list(Department.objects.filter(is_stock_location=True)) or list(Department.objects.all())
    suppliers = list(Supplier.objects.all())
    stocked_items = list(
        Item.objects.filter(is_stock_tracked=True).prefetch_related('unit_conversions')[:60])

    if not (requester and departments and suppliers and stocked_items):
        return []

    requisitions = []
    for _ in range(count):
        requisition = Requisition.objects.create(
            department=random.choice(departments),
            requested_by=requester,
        )

        for item in random.sample(stocked_items, min(4, len(stocked_items))):
            packs = list(item.unit_conversions.all())
            # Order in a pack when the item has one -- that is the case worth
            # demonstrating -- and loose the rest of the time.
            pack = random.choice(packs) if packs and random.random() < 0.75 else None
            RequisitionItem.objects.create(
                requisition=requisition,
                item=item,
                item_unit=pack,
                preferred_supplier=random.choice(suppliers),
                quantity_requested=random.randint(2, 20) if pack else random.randint(20, 200),
            )

        requisitions.append(requisition)

    return requisitions


def create_real_world_lab_data():
    """
    Creates real-world lab test profiles, panels, reagents, and their relationships.
    Based on actual laboratory testing standards.
    """
    from laboratory.models import (
        LabTestProfile, LabTestPanel, Specimen,
        TestPanelReagent, ReferenceValue
    )
    from inventory.models import Item, Department, ItemUnit, StockMovement, StockPolicy
    from inventory.services import stock as stock_service
    from decimal import ROUND_CEILING, Decimal
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

    # What one test's worth of each reagent is worth to the patient. Collected
    # here and spent at the end, on the panels, because a reagent carries no
    # price of its own -- the panel built from it is the thing that is sold.
    reagent_price_per_test = {}

    def create_reagent_inventory(reagent_item, purchase_price, sale_price, quantity_kits,
                                 tests_per_kit=1):
        """
        Seed opening stock for a reagent through the ledger, so demo data goes
        in the same way real stock does.

        `tests_per_kit` is recorded as the reagent's Kit pack size, then used to
        convert the kits bought into the tests the ledger actually counts.

        `sale_price` arrives per kit and is banked per test against the reagent,
        to be charged on the panels that consume it.
        """
        if tests_per_kit > 1:
            ItemUnit.objects.update_or_create(
                item=reagent_item,
                name='Kit',
                defaults={'factor_to_base': tests_per_kit, 'is_purchase_default': True},
            )
        units = tests_per_kit * quantity_kits
        movement = stock_service.receive(
            item=reagent_item,
            department=lab_dept,
            quantity=units,
            unit_cost=Decimal(str(purchase_price)) / tests_per_kit,
            lot_number=f'LOT-{reagent_item.item_code}-2026',
            expiry_date=date.today() + timedelta(days=365 * 2),
            reason='Demo data opening stock',
            source_type=StockMovement.Source.SYSTEM,
            movement_type=StockMovement.Type.OPENING_BALANCE,
            idempotency_key=f'demo-reagent:{reagent_item.id}',
        )
        # Both prices arrive per kit, but the ledger works per base unit, so
        # the sale figure is divided down the same way unit_cost is above. It
        # is banked rather than applied: a reagent is a raw material, nobody
        # buys one, and `Item.is_sellable` is false for it. The panel it feeds
        # is what carries the price.
        reagent_price_per_test[reagent_item.id] = (
            Decimal(str(sale_price)) / tests_per_kit)
        tag_item_departments(reagent_item, 'Lab')
        created_data['inventory_records'].append(movement)
        return movement

    def set_reagent_threshold(reagent_item, threshold):
        """Re-order level for a reagent now lives on StockPolicy."""
        policy, _ = StockPolicy.objects.update_or_create(
            item=reagent_item, department=lab_dept,
            defaults={'re_order_level': threshold},
        )
        created_data['counters'].append(policy)
        return policy
    
    # Get or create specimens
    blood_specimen, _ = Specimen.objects.get_or_create(name='Blood')
    serum_specimen, _ = Specimen.objects.get_or_create(name='Serum')
    urine_specimen, _ = Specimen.objects.get_or_create(name='Urine')
    
    # 1. COMPLETE BLOOD COUNT (CBC) PROFILE
    cbc_profile, _ = LabTestProfile.objects.get_or_create(name='Complete Blood Count (CBC)')
    
    # Create reagent for CBC
    cbc_reagent_item, _ = Item.objects.get_or_create(
        name='Sysmex CBC Reagent Kit',
        category='LabReagent',
        units_of_measure='tests',
        defaults={
            'desc': 'Complete reagent kit for automated hematology analyzer - Sysmex XN Series',
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
        quantity_kits=2,          # 2 kits = 1000 tests
        tests_per_kit=500,
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
            category='Lab Test',
            units_of_measure='unit',
            defaults={
                'desc': f'{panel_name} test',
                'item_code': lab_item_code(panel_name),
                'vat_rate': 16.0,
            }
        )
        
        panel, created = LabTestPanel.objects.get_or_create(
            name=panel_name,
            test_profile=cbc_profile,
            defaults={
                'specimen': blood_specimen,
                'units': _get_unit(unit),
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
                defaults={'units_consumed_per_run': 1}
            )
            created_data['links'].append(link)
    
    # Re-order level for the CBC reagent
    set_reagent_threshold(cbc_reagent_item, 100)
    
    # 2. LIVER FUNCTION TEST (LFT) PROFILE
    lft_profile, _ = LabTestProfile.objects.get_or_create(name='Liver Function Test (LFT)')
    
    # Create reagents for LFT (separate reagents for different tests)
    alt_ast_reagent, _ = Item.objects.get_or_create(
        name='Roche ALT/AST Reagent',
        category='LabReagent',
        units_of_measure='tests',
        defaults={
            'desc': 'Enzymatic colorimetric test for ALT and AST determination',
            'item_code': 'ROCHE-ALT-AST-200',
            'vat_rate': 16.0,
        }
    )
    created_data['reagents'].append(alt_ast_reagent)
    create_reagent_inventory(alt_ast_reagent, 8000.00, 10000.00, 2, 200)
    
    alp_reagent, _ = Item.objects.get_or_create(
        name='Roche Alkaline Phosphatase Reagent',
        category='LabReagent',
        units_of_measure='tests',
        defaults={
            'desc': 'Colorimetric test for ALP determination using p-nitrophenyl phosphate',
            'item_code': 'ROCHE-ALP-200',
            'vat_rate': 16.0,
        }
    )
    created_data['reagents'].append(alp_reagent)
    create_reagent_inventory(alp_reagent, 7500.00, 9500.00, 2, 200)
    
    bilirubin_reagent, _ = Item.objects.get_or_create(
        name='Roche Total Bilirubin Reagent',
        category='LabReagent',
        units_of_measure='tests',
        defaults={
            'desc': 'Diazo method for total bilirubin determination',
            'item_code': 'ROCHE-TBIL-200',
            'vat_rate': 16.0,
        }
    )
    created_data['reagents'].append(bilirubin_reagent)
    create_reagent_inventory(bilirubin_reagent, 8500.00, 10500.00, 2, 200)
    
    albumin_protein_reagent, _ = Item.objects.get_or_create(
        name='Roche Albumin/Total Protein Reagent',
        category='LabReagent',
        units_of_measure='tests',
        defaults={
            'desc': 'BCG method for albumin and biuret method for total protein',
            'item_code': 'ROCHE-ALB-TP-250',
            'vat_rate': 16.0,
        }
    )
    created_data['reagents'].append(albumin_protein_reagent)
    create_reagent_inventory(albumin_protein_reagent, 9000.00, 11500.00, 2, 250)
    
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
            category='Lab Test',
            units_of_measure='unit',
            defaults={
                'desc': f'{panel_name} test - Liver function marker',
                'item_code': lab_item_code(panel_name),
                'vat_rate': 16.0,
            }
        )
        
        panel, created = LabTestPanel.objects.get_or_create(
            name=panel_name,
            test_profile=lft_profile,
            defaults={
                'specimen': serum_specimen,
                'units': _get_unit(unit),
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
                defaults={'units_consumed_per_run': 1}
            )
            created_data['links'].append(link)
    
    # Re-order levels for LFT reagents
    for reagent in [alt_ast_reagent, alp_reagent, bilirubin_reagent, albumin_protein_reagent]:
        set_reagent_threshold(reagent, 50)
    
    # 3. LIPID PROFILE
    lipid_profile, _ = LabTestProfile.objects.get_or_create(name='Lipid Profile')
    
    # Lipid reagents
    cholesterol_reagent, _ = Item.objects.get_or_create(
        name='Abbott Cholesterol Reagent',
        category='LabReagent',
        units_of_measure='tests',
        defaults={
            'desc': 'Enzymatic endpoint method for cholesterol determination',
            'item_code': 'ABB-CHOL-300',
            'vat_rate': 16.0,
        }
    )
    created_data['reagents'].append(cholesterol_reagent)
    create_reagent_inventory(cholesterol_reagent, 10000.00, 12500.00, 2, 300)
    
    triglycerides_reagent, _ = Item.objects.get_or_create(
        name='Abbott Triglycerides Reagent',
        category='LabReagent',
        units_of_measure='tests',
        defaults={
            'desc': 'Enzymatic colorimetric test with lipase and glycerol kinase',
            'item_code': 'ABB-TRIG-300',
            'vat_rate': 16.0,
        }
    )
    created_data['reagents'].append(triglycerides_reagent)
    create_reagent_inventory(triglycerides_reagent, 9500.00, 12000.00, 2, 300)
    
    hdl_ldl_reagent, _ = Item.objects.get_or_create(
        name='Abbott HDL/LDL Reagent',
        category='LabReagent',
        units_of_measure='tests',
        defaults={
            'desc': 'Direct measurement of HDL and LDL cholesterol',
            'item_code': 'ABB-HDL-LDL-250',
            'vat_rate': 16.0,
        }
    )
    created_data['reagents'].append(hdl_ldl_reagent)
    create_reagent_inventory(hdl_ldl_reagent, 11000.00, 14000.00, 2, 250)
    
    lipid_panels_config = [
        ('Total Cholesterol', 'mg/dL', [cholesterol_reagent]),
        ('Triglycerides', 'mg/dL', [triglycerides_reagent]),
        ('HDL Cholesterol', 'mg/dL', [hdl_ldl_reagent]),
        ('LDL Cholesterol', 'mg/dL', [hdl_ldl_reagent]),
    ]
    
    for panel_name, unit, reagents in lipid_panels_config:
        panel_item, _ = Item.objects.get_or_create(
            name=panel_name,
            category='Lab Test',
            units_of_measure='unit',
            defaults={
                'desc': f'{panel_name} test - Cardiovascular risk assessment',
                'item_code': lab_item_code(panel_name),
                'vat_rate': 16.0,
            }
        )
        
        panel, created = LabTestPanel.objects.get_or_create(
            name=panel_name,
            test_profile=lipid_profile,
            defaults={
                'specimen': serum_specimen,
                'units': _get_unit(unit),
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
                defaults={'units_consumed_per_run': 1}
            )
            created_data['links'].append(link)
    
    # Re-order levels for lipid reagents
    for reagent in [cholesterol_reagent, triglycerides_reagent, hdl_ldl_reagent]:
        set_reagent_threshold(reagent, 75)
    
    # 4. KIDNEY FUNCTION TEST (RFT/KFT) PROFILE
    kft_profile, _ = LabTestProfile.objects.get_or_create(name='Kidney Function Test (RFT)')
    
    # Kidney function reagents
    creatinine_reagent, _ = Item.objects.get_or_create(
        name='Roche Creatinine Reagent',
        category='LabReagent',
        units_of_measure='tests',
        defaults={
            'desc': 'Jaffe kinetic method for creatinine determination',
            'item_code': 'ROCHE-CREAT-300',
            'vat_rate': 16.0,
        }
    )
    created_data['reagents'].append(creatinine_reagent)
    create_reagent_inventory(creatinine_reagent, 8500.00, 11000.00, 2, 300)
    
    urea_reagent, _ = Item.objects.get_or_create(
        name='Roche Urea/BUN Reagent',
        category='LabReagent',
        units_of_measure='tests',
        defaults={
            'desc': 'Urease/GLDH enzymatic method for urea determination',
            'item_code': 'ROCHE-UREA-300',
            'vat_rate': 16.0,
        }
    )
    created_data['reagents'].append(urea_reagent)
    create_reagent_inventory(urea_reagent, 7500.00, 9500.00, 2, 300)
    
    uric_acid_reagent, _ = Item.objects.get_or_create(
        name='Roche Uric Acid Reagent',
        category='LabReagent',
        units_of_measure='tests',
        defaults={
            'desc': 'Uricase enzymatic colorimetric method',
            'item_code': 'ROCHE-URIC-250',
            'vat_rate': 16.0,
        }
    )
    created_data['reagents'].append(uric_acid_reagent)
    create_reagent_inventory(uric_acid_reagent, 8000.00, 10000.00, 2, 250)
    
    kft_panels_config = [
        ('Creatinine', 'mg/dL', [creatinine_reagent]),
        ('Urea', 'mg/dL', [urea_reagent]),
        ('Blood Urea Nitrogen (BUN)', 'mg/dL', [urea_reagent]),
        ('Uric Acid', 'mg/dL', [uric_acid_reagent]),
    ]
    
    for panel_name, unit, reagents in kft_panels_config:
        panel_item, _ = Item.objects.get_or_create(
            name=panel_name,
            category='Lab Test',
            units_of_measure='unit',
            defaults={
                'desc': f'{panel_name} test - Kidney function marker',
                'item_code': lab_item_code(panel_name),
                'vat_rate': 16.0,
            }
        )
        
        panel, created = LabTestPanel.objects.get_or_create(
            name=panel_name,
            test_profile=kft_profile,
            defaults={
                'specimen': serum_specimen,
                'units': _get_unit(unit),
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
                defaults={'units_consumed_per_run': 1}
            )
            created_data['links'].append(link)
    
    for reagent in [creatinine_reagent, urea_reagent, uric_acid_reagent]:
        set_reagent_threshold(reagent, 75)
    
    # 5. THYROID FUNCTION TEST (TFT) PROFILE
    tft_profile, _ = LabTestProfile.objects.get_or_create(name='Thyroid Function Test (TFT)')
    
    # Thyroid reagents
    thyroid_reagent, _ = Item.objects.get_or_create(
        name='Roche Thyroid Panel Reagent',
        category='LabReagent',
        units_of_measure='tests',
        defaults={
            'desc': 'Electrochemiluminescence immunoassay (ECLIA) for thyroid hormones',
            'item_code': 'ROCHE-THYROID-100',
            'vat_rate': 16.0,
        }
    )
    created_data['reagents'].append(thyroid_reagent)
    create_reagent_inventory(thyroid_reagent, 18000.00, 23000.00, 2, 100)
    
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
            category='Lab Test',
            units_of_measure='unit',
            defaults={
                'desc': f'{panel_name} test - Thyroid function assessment',
                'item_code': lab_item_code(panel_name),
                'vat_rate': 16.0,
            }
        )
        
        panel, created = LabTestPanel.objects.get_or_create(
            name=panel_name,
            test_profile=tft_profile,
            defaults={
                'specimen': serum_specimen,
                'units': _get_unit(unit),
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
            defaults={'units_consumed_per_run': 1}
        )
        created_data['links'].append(link)
    
    set_reagent_threshold(thyroid_reagent, 30)
    
    # 6. ELECTROLYTES PROFILE
    electrolytes_profile, _ = LabTestProfile.objects.get_or_create(name='Electrolytes Panel')
    
    # Electrolytes reagent
    electrolytes_reagent, _ = Item.objects.get_or_create(
        name='Roche ISE Electrolytes Reagent',
        category='LabReagent',
        units_of_measure='tests',
        defaults={
            'desc': 'Ion-selective electrode (ISE) method for sodium, potassium, chloride',
            'item_code': 'ROCHE-ELEC-500',
            'vat_rate': 16.0,
        }
    )
    created_data['reagents'].append(electrolytes_reagent)
    create_reagent_inventory(electrolytes_reagent, 12000.00, 15000.00, 2, 500)
    
    electrolytes_panels_config = [
        ('Sodium (Na+)', 'mmol/L'),
        ('Potassium (K+)', 'mmol/L'),
        ('Chloride (Cl-)', 'mmol/L'),
        ('Bicarbonate (HCO3-)', 'mmol/L'),
    ]
    
    for panel_name, unit in electrolytes_panels_config:
        panel_item, _ = Item.objects.get_or_create(
            name=panel_name,
            category='Lab Test',
            units_of_measure='unit',
            defaults={
                'desc': f'{panel_name} test - Electrolyte balance assessment',
                'item_code': lab_item_code(panel_name),
                'vat_rate': 16.0,
            }
        )
        
        panel, created = LabTestPanel.objects.get_or_create(
            name=panel_name,
            test_profile=electrolytes_profile,
            defaults={
                'specimen': serum_specimen,
                'units': _get_unit(unit),
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
            defaults={'units_consumed_per_run': 1}
        )
        created_data['links'].append(link)
    
    set_reagent_threshold(electrolytes_reagent, 150)
    
    # 7. BLOOD GLUCOSE PROFILE
    glucose_profile, _ = LabTestProfile.objects.get_or_create(name='Blood Glucose Profile')
    
    glucose_reagent, _ = Item.objects.get_or_create(
        name='Roche Glucose Reagent',
        category='LabReagent',
        units_of_measure='tests',
        defaults={
            'desc': 'Hexokinase enzymatic method for glucose determination',
            'item_code': 'ROCHE-GLUC-500',
            'vat_rate': 16.0,
        }
    )
    created_data['reagents'].append(glucose_reagent)
    create_reagent_inventory(glucose_reagent, 9000.00, 11500.00, 2, 500)
    
    hba1c_reagent, _ = Item.objects.get_or_create(
        name='Abbott HbA1c Reagent',
        category='LabReagent',
        units_of_measure='tests',
        defaults={
            'desc': 'HPLC method for hemoglobin A1c determination',
            'item_code': 'ABB-HBA1C-100',
            'vat_rate': 16.0,
        }
    )
    created_data['reagents'].append(hba1c_reagent)
    create_reagent_inventory(hba1c_reagent, 15000.00, 19000.00, 2, 100)
    
    glucose_panels_config = [
        ('Fasting Blood Sugar (FBS)', 'mg/dL', [glucose_reagent]),
        ('Random Blood Sugar (RBS)', 'mg/dL', [glucose_reagent]),
        ('Hemoglobin A1c (HbA1c)', '%', [hba1c_reagent]),
    ]
    
    for panel_name, unit, reagents in glucose_panels_config:
        panel_item, _ = Item.objects.get_or_create(
            name=panel_name,
            category='Lab Test',
            units_of_measure='unit',
            defaults={
                'desc': f'{panel_name} test - Diabetes monitoring',
                'item_code': lab_item_code(panel_name),
                'vat_rate': 16.0,
            }
        )
        
        panel, created = LabTestPanel.objects.get_or_create(
            name=panel_name,
            test_profile=glucose_profile,
            defaults={
                'specimen': serum_specimen if 'HbA1c' not in panel_name else blood_specimen,
                'units': _get_unit(unit),
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
                defaults={'units_consumed_per_run': 1}
            )
            created_data['links'].append(link)
    
    for reagent in [glucose_reagent, hba1c_reagent]:
        tests = 1000 if reagent == glucose_reagent else 200
        set_reagent_threshold(reagent, tests // 10)
    
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
    
    # Price the panels. This is the lab's only sale price: the panel is the
    # finished product, assembled from reagents that are individually worth
    # nothing to a patient. A panel with no reagents still needs a price, so it
    # falls back to the same default `ensure_service_prices` would give it.
    #
    # The price has to carry the draw and the bench time as well as the
    # reagent, so it is a multiple of the reagent's worth with a floor, rounded
    # the way a price list is. Priced at the reagent alone, a haemoglobin sold
    # for 36 and lost money on every draw.
    DEFAULT_PANEL_PRICE = Decimal('500.00')
    PANEL_MARKUP = 4
    PANEL_FLOOR = Decimal('200')
    PRICE_STEP = Decimal('50')
    priced_panels = 0

    for panel in LabTestPanel.objects.filter(
            id__in=[p.id for p in created_data['panels']]
    ).select_related('item').prefetch_related('reagent_links'):
        if not panel.item_id or panel.item.current_sale_price:
            continue
        price = sum(
            (reagent_price_per_test.get(link.reagent_item_id, Decimal('0'))
             * link.units_consumed_per_run
             for link in panel.reagent_links.all()),
            Decimal('0'),
        )
        if price:
            steps = (price * PANEL_MARKUP / PRICE_STEP).to_integral_value(rounding=ROUND_CEILING)
            price = max(PANEL_FLOOR, steps * PRICE_STEP)
        panel.set_sale_price((price or DEFAULT_PANEL_PRICE).quantize(Decimal('0.01')))
        priced_panels += 1

    print(f"\n✅ Created Real-World Lab Data:")
    print(f"   - {priced_panels} Panels Priced")
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


# Which consumables an item drags along, by name. Written as substrings
# because the catalogue spells drugs out in full ("Tetracycline 100mg
# Injection") and the rule is about the route, not the strength.
#
# The point of the pairs below is the contrast: Panadol and the paracetamol
# TABLET need nothing, the paracetamol INJECTION cannot be given without a
# syringe and a swab. Billing refuses the injection when they are not in stock.
CONSUMABLE_RULES = [
    {
        'match': ['Injection', 'Injectable'],
        'exclude': [],
        'consumables': [
            ('Syringes 5ml', 1, True),
            ('Alcohol Swabs', 1, True),
            ('Gauze Swabs 10x10cm', 1, False),
        ],
    },
    {
        'match': ['IV Cannula', 'Normal Saline 0.9%', 'Dextrose', "Ringer's Lactate"],
        'exclude': ['Cannula 18G', 'Cannula 20G'],
        'consumables': [
            ('IV Cannula 18G', 1, True),
            ('Alcohol Swabs', 1, True),
            ('Surgical Tape', 1, False),
        ],
    },
    {
        'match': ['Vaccine', 'Tetanus Toxoid'],
        'exclude': [],
        'consumables': [
            ('Syringes 5ml', 1, True),
            ('Alcohol Swabs', 1, True),
        ],
    },
]

# Blood-drawn lab tests need the draw kit whatever the panel is. Named
# individually so a urine test is not billed a blood tube.
BLOOD_TEST_CONSUMABLES = [
    ('Syringes 5ml', 1, True),
    ('Alcohol Swabs', 1, True),
    ('Blood Collection Tubes EDTA', 1, True),
    # A swab to press on the puncture. Not a roll of cotton wool: that is
    # 500 g, and one per draw made every blood test cost more than it sold for.
    ('Gauze Swabs 10x10cm', 1, False),
]

URINE_TEST_CONSUMABLES = [
    ('Urine Collection Containers', 1, True),
    ('Sterile Gloves Medium', 1, False),
]


def consumable_item_names():
    """
    Every item the rules above name as a consumable.

    One definition, used twice: by the pharmacy seeding, so these are created
    as Internal and unpriced in the first place, and by the linking step. They
    used to be created as priced Resale stock and flipped to Internal
    afterwards, which left a sale price on every syringe in the catalogue.
    """
    return (
        {name for rule in CONSUMABLE_RULES for name, _, _ in rule['consumables']}
        | {name for name, _, _ in BLOOD_TEST_CONSUMABLES}
        | {name for name, _, _ in URINE_TEST_CONSUMABLES}
    )


# How many of each collection item the lab keeps on its own shelf. Sample
# collection issues from Lab, never from Pharmacy.
LAB_COLLECTION_STOCK = 200


def create_item_consumables():
    """
    Wire up what gets used up alongside something else, on both sides of the
    hospital.

    Pharmacy: an injectable drug needs a syringe and a swab whether it is given
    in the ward or at the patient's home, so the link sits on the drug
    (`ItemConsumable`) and leaves stock when the drug is billed. Tablets need
    nothing and get no rows, which is what lets billing tell "needs nothing"
    apart from "needs something we do not have".

    Lab: the syringe belongs to the *draw*, not the test, so it sits on the
    specimen (`SpecimenConsumable`) and leaves stock when the sample is
    collected. Three panels off one tube of blood cost one syringe, and a
    re-test off an archived sample costs none.
    """
    from inventory.models import Item, ItemConsumable

    print("\n\U0001f489 Linking items to their consumables (accompaniments)...")

    # Every consumable is an internal-use item, not something sold on its own.
    consumable_names = consumable_item_names()

    consumables = {}
    for name in consumable_names:
        item = Item.objects.filter(name=name).first()
        if item is None:
            print(f"   ! consumable not in catalogue, skipped: {name}")
            continue
        if item.category_one != 'Internal':
            item.category_one = 'Internal'
            item.save(update_fields=['category_one'])
        consumables[name] = item

    def link(item, rows):
        made = 0
        for name, quantity, required in rows:
            consumable = consumables.get(name)
            if consumable is None or consumable.id == item.id:
                continue
            _, created = ItemConsumable.objects.update_or_create(
                item=item, consumable=consumable,
                defaults={'quantity_per_use': quantity, 'is_required': required},
            )
            made += int(created)
        return made

    created = 0
    linked_items = 0

    # Drugs and supplies, by what the name says about the route.
    for rule in CONSUMABLE_RULES:
        query = Item.objects.none()
        for token in rule['match']:
            query = query | Item.objects.filter(name__icontains=token)
        for token in rule['exclude']:
            query = query.exclude(name__icontains=token)

        for item in query.distinct():
            if item.name in consumables:
                continue  # a consumable does not accompany itself
            made = link(item, rule['consumables'])
            created += made
            linked_items += int(made > 0)

    # The lab side: on the specimen, because the draw is what spends them.
    from laboratory.models import Specimen, SpecimenConsumable

    specimen_created = 0
    specimens_linked = 0

    for specimen in Specimen.objects.all():
        name = (specimen.name or '').strip().lower()
        if name in ('blood', 'serum', 'plasma'):
            rows = BLOOD_TEST_CONSUMABLES
        elif name == 'urine':
            rows = URINE_TEST_CONSUMABLES
        else:
            continue

        made = 0
        for consumable_name, quantity, required in rows:
            item = consumables.get(consumable_name)
            if item is None:
                continue
            _, was_created = SpecimenConsumable.objects.update_or_create(
                specimen=specimen, item=item,
                defaults={'quantity_per_collection': quantity, 'is_required': required},
            )
            made += int(was_created)
        specimen_created += made
        specimens_linked += int(made > 0)

    # The lab draws from its own shelf. Everything the pharmacy seeding
    # received went into Pharmacy, which is right for the syringe that goes
    # with an injection and wrong for the one that goes into an arm in
    # phlebotomy: collection issues from Lab, so with nothing there every demo
    # draw would be recorded short. Move a working stock across the way a real
    # lab gets it -- a transfer, which keeps each lot and its cost -- and leave
    # the pharmacy at least half of what it had.
    from inventory.models import Department
    from inventory.services import stock as stock_service
    from inventory.services.stock import StockError
    from laboratory.utils import lab_department

    lab = lab_department()
    pharmacy = Department.objects.filter(name__iexact='Pharmacy').first()
    lab_items_stocked = 0

    collection_item_ids = SpecimenConsumable.objects.values_list('item_id', flat=True).distinct()
    for item in Item.objects.filter(id__in=list(collection_item_ids)).order_by('name'):
        if pharmacy is None or lab is None or pharmacy == lab:
            print("   ! no separate Pharmacy and Lab locations; lab gets no collection stock")
            break
        wanted = LAB_COLLECTION_STOCK - stock_service.available_quantity(item, lab)
        if wanted <= 0:
            continue
        quantity = min(wanted, stock_service.available_quantity(item, pharmacy) // 2)
        if quantity <= 0:
            print(f"   ! no pharmacy stock of {item.name} to send to the lab")
            continue
        try:
            stock_service.transfer(
                item=item, from_department=pharmacy, to_department=lab,
                quantity=quantity,
                reason='Demo data: lab working stock for sample collection',
            )
        except StockError as exc:
            print(f"   ! could not move {item.name} to Lab: {exc}")
            continue
        lab_items_stocked += 1
        print(f"   - moved {quantity} {item.units_of_measure} of {item.name} to Lab")

    total = ItemConsumable.objects.count()
    specimen_total = SpecimenConsumable.objects.count()
    print(f"   - {created} new accompaniment links across {linked_items} items")
    print(f"   - {total} accompaniment links in total")
    print(f"   - {specimen_created} new collection links across {specimens_linked} specimens")
    print(f"   - {specimen_total} collection links in total")

    for item in Item.objects.filter(name__icontains='Tetracycline'):
        needs = list(item.consumable_links.select_related('consumable'))
        summary = ', '.join(f"{l.quantity_per_use} x {l.consumable.name}" for l in needs) or 'nothing'
        print(f"   - {item.name} needs {summary}")

    for specimen in Specimen.objects.prefetch_related('consumables__item'):
        needs = list(specimen.consumables.all())
        summary = ', '.join(
            f"{l.quantity_per_collection} x {l.item.name}" for l in needs) or 'nothing'
        print(f"   - collecting {specimen.name} needs {summary}")

    return {
        'links_created': created,
        'items_linked': linked_items,
        'total_links': total,
        'specimen_links_created': specimen_created,
        'specimens_linked': specimens_linked,
        'total_specimen_links': specimen_total,
        'lab_items_stocked': lab_items_stocked,
    }


def create_pharmaceutical_inventory():
    """
    Create comprehensive pharmaceutical inventory with realistic drugs across all categories.
    Includes medications, medical supplies, and consumables with proper pricing and quantities.
    """
    from inventory.models import StockBalance, StockMovement
    from inventory.services import stock as stock_service
    from decimal import Decimal
    from datetime import date, timedelta

    created_data = {
        'items': [],
        'inventory_records': []
    }

    # Get or create Pharmacy department
    pharmacy_dept, _ = Department.objects.get_or_create(name='Pharmacy')
    
    print("\n💊 Creating Pharmaceutical Inventory...")
    
    # Define comprehensive pharmaceutical categories with realistic drugs
    pharmaceuticals = {
        # ANTIBIOTICS
        "Antibiotics": [
            {"name": "Amoxicillin 500mg Capsules", "unit": "capsules", "pack": "1000", "subpack": "10", "purchase": 50.00, "sale": 80.00, "qty": 500},
            {"name": "Amoxicillin-Clavulanate 625mg Tablets", "unit": "tablets", "pack": "500", "subpack": "10", "purchase": 120.00, "sale": 180.00, "qty": 300},
            {"name": "Azithromycin 500mg Tablets", "unit": "tablets", "pack": "500", "subpack": "6", "purchase": 200.00, "sale": 300.00, "qty": 250},
            {"name": "Ciprofloxacin 500mg Tablets", "unit": "tablets", "pack": "1000", "subpack": "10", "purchase": 80.00, "sale": 120.00, "qty": 400},
            {"name": "Doxycycline 100mg Capsules", "unit": "capsules", "pack": "1000", "subpack": "10", "purchase": 60.00, "sale": 95.00, "qty": 300},
            {"name": "Metronidazole 400mg Tablets", "unit": "tablets", "pack": "1000", "subpack": "10", "purchase": 40.00, "sale": 65.00, "qty": 400},
            {"name": "Ceftriaxone 1g Injection", "unit": "vials", "pack": "100", "subpack": "1", "purchase": 150.00, "sale": 250.00, "qty": 200},
            {"name": "Gentamicin 80mg Injection", "unit": "ampoules", "pack": "100", "subpack": "1", "purchase": 80.00, "sale": 130.00, "qty": 150},
            # The pair the accompaniment rules are written about: the capsule
            # is given by hand, the injection needs a syringe and a swab.
            {"name": "Tetracycline 250mg Capsules", "unit": "capsules", "pack": "1000", "subpack": "10", "purchase": 55.00, "sale": 90.00, "qty": 400},
            {"name": "Tetracycline 100mg Injection", "unit": "vials", "pack": "100", "subpack": "1", "purchase": 180.00, "sale": 290.00, "qty": 150},
        ],
        
        # ANALGESICS & ANTIPYRETICS
        "Analgesics": [
            {"name": "Paracetamol 500mg Tablets", "unit": "tablets", "pack": "2000", "subpack": "10", "purchase": 20.00, "sale": 35.00, "qty": 1000},
            # Same molecule, two routes. The tablet needs nothing; the
            # injection cannot be given without a syringe and a swab.
            {"name": "Paracetamol 1g Injection", "unit": "vials", "pack": "50", "subpack": "1", "purchase": 180.00, "sale": 280.00, "qty": 200},
            {"name": "Panadol 500mg Tablets", "unit": "tablets", "pack": "2000", "subpack": "10", "purchase": 35.00, "sale": 60.00, "qty": 800},
            {"name": "Ibuprofen 400mg Tablets", "unit": "tablets", "pack": "1000", "subpack": "10", "purchase": 45.00, "sale": 70.00, "qty": 600},
            {"name": "Diclofenac 50mg Tablets", "unit": "tablets", "pack": "1000", "subpack": "10", "purchase": 50.00, "sale": 80.00, "qty": 500},
            {"name": "Tramadol 50mg Capsules", "unit": "capsules", "pack": "500", "subpack": "10", "purchase": 100.00, "sale": 160.00, "qty": 250},
            {"name": "Morphine 10mg Injection", "unit": "ampoules", "pack": "50", "subpack": "1", "purchase": 200.00, "sale": 350.00, "qty": 100},
        ],
        
        # ANTIHYPERTENSIVES & CARDIOVASCULAR
        "Cardiovascular": [
            {"name": "Amlodipine 5mg Tablets", "unit": "tablets", "pack": "1000", "subpack": "10", "purchase": 70.00, "sale": 110.00, "qty": 500},
            {"name": "Atenolol 50mg Tablets", "unit": "tablets", "pack": "1000", "subpack": "10", "purchase": 60.00, "sale": 95.00, "qty": 400},
            {"name": "Lisinopril 10mg Tablets", "unit": "tablets", "pack": "1000", "subpack": "10", "purchase": 90.00, "sale": 140.00, "qty": 350},
            {"name": "Hydrochlorothiazide 25mg Tablets", "unit": "tablets", "pack": "1000", "subpack": "10", "purchase": 45.00, "sale": 70.00, "qty": 400},
            {"name": "Furosemide 40mg Tablets", "unit": "tablets", "pack": "1000", "subpack": "10", "purchase": 50.00, "sale": 80.00, "qty": 350},
            {"name": "Aspirin 75mg Tablets", "unit": "tablets", "pack": "1000", "subpack": "10", "purchase": 30.00, "sale": 50.00, "qty": 600},
            {"name": "Atorvastatin 20mg Tablets", "unit": "tablets", "pack": "500", "subpack": "10", "purchase": 150.00, "sale": 230.00, "qty": 300},
        ],
        
        # ANTIDIABETICS
        "Antidiabetics": [
            {"name": "Metformin 500mg Tablets", "unit": "tablets", "pack": "1000", "subpack": "10", "purchase": 60.00, "sale": 95.00, "qty": 600},
            {"name": "Glibenclamide 5mg Tablets", "unit": "tablets", "pack": "1000", "subpack": "10", "purchase": 55.00, "sale": 85.00, "qty": 400},
            {"name": "Insulin NPH 100IU/ml", "unit": "vials", "pack": "50", "subpack": "1", "purchase": 400.00, "sale": 600.00, "qty": 100},
            {"name": "Insulin Regular 100IU/ml", "unit": "vials", "pack": "50", "subpack": "1", "purchase": 400.00, "sale": 600.00, "qty": 100},
        ],
        
        # ANTIMALARIALS
        "Antimalarials": [
            {"name": "Artemether-Lumefantrine 20/120mg Tablets", "unit": "tablets", "pack": "500", "subpack": "24", "purchase": 180.00, "sale": 280.00, "qty": 300},
            {"name": "Quinine 300mg Tablets", "unit": "tablets", "pack": "1000", "subpack": "10", "purchase": 70.00, "sale": 110.00, "qty": 400},
            {"name": "Artesunate 60mg Injection", "unit": "vials", "pack": "100", "subpack": "1", "purchase": 200.00, "sale": 320.00, "qty": 150},
        ],
        
        # GASTROINTESTINAL
        "Gastrointestinal": [
            {"name": "Omeprazole 20mg Capsules", "unit": "capsules", "pack": "1000", "subpack": "10", "purchase": 80.00, "sale": 125.00, "qty": 500},
            {"name": "Ranitidine 150mg Tablets", "unit": "tablets", "pack": "1000", "subpack": "10", "purchase": 60.00, "sale": 95.00, "qty": 400},
            {"name": "Oral Rehydration Salts (ORS)", "unit": "sachets", "pack": "500", "subpack": "1", "purchase": 10.00, "sale": 20.00, "qty": 1000},
            {"name": "Loperamide 2mg Capsules", "unit": "capsules", "pack": "500", "subpack": "10", "purchase": 50.00, "sale": 80.00, "qty": 300},
        ],
        
        # RESPIRATORY
        "Respiratory": [
            {"name": "Salbutamol 100mcg Inhaler", "unit": "inhalers", "pack": "50", "subpack": "1", "purchase": 150.00, "sale": 250.00, "qty": 100},
            {"name": "Prednisolone 5mg Tablets", "unit": "tablets", "pack": "1000", "subpack": "10", "purchase": 70.00, "sale": 110.00, "qty": 400},
            {"name": "Cetirizine 10mg Tablets", "unit": "tablets", "pack": "1000", "subpack": "10", "purchase": 40.00, "sale": 65.00, "qty": 500},
            {"name": "Chlorpheniramine 4mg Tablets", "unit": "tablets", "pack": "1000", "subpack": "10", "purchase": 30.00, "sale": 50.00, "qty": 500},
        ],
        
        # IV FLUIDS & SOLUTIONS
        "IV Fluids": [
            {"name": "Normal Saline 0.9% 1000ml", "unit": "bags", "pack": "20", "subpack": "1", "purchase": 800.00, "sale": 1200.00, "qty": 200},
            {"name": "Dextrose 5% 1000ml", "unit": "bags", "pack": "20", "subpack": "1", "purchase": 850.00, "sale": 1250.00, "qty": 200},
            {"name": "Ringer's Lactate 1000ml", "unit": "bags", "pack": "20", "subpack": "1", "purchase": 900.00, "sale": 1300.00, "qty": 150},
            {"name": "Dextrose 5% in Saline 1000ml", "unit": "bags", "pack": "20", "subpack": "1", "purchase": 950.00, "sale": 1400.00, "qty": 150},
        ],
        
        # VACCINES
        "Vaccines": [
            {"name": "BCG Vaccine", "unit": "vials", "pack": "50", "subpack": "1", "purchase": 200.00, "sale": 350.00, "qty": 100},
            {"name": "DPT Vaccine", "unit": "vials", "pack": "50", "subpack": "1", "purchase": 250.00, "sale": 400.00, "qty": 100},
            {"name": "Hepatitis B Vaccine", "unit": "vials", "pack": "50", "subpack": "1", "purchase": 350.00, "sale": 550.00, "qty": 80},
            {"name": "Tetanus Toxoid", "unit": "ampoules", "pack": "100", "subpack": "1", "purchase": 150.00, "sale": 250.00, "qty": 150},
        ],
        
        # MEDICAL SUPPLIES & CONSUMABLES
        "Medical Supplies": [
            {"name": "Sterile Gloves Medium", "unit": "pairs", "pack": "100", "subpack": "50", "purchase": 1500.00, "sale": 2200.00, "qty": 200},
            {"name": "Sterile Gloves Large", "unit": "pairs", "pack": "100", "subpack": "50", "purchase": 1500.00, "sale": 2200.00, "qty": 200},
            {"name": "Surgical Masks", "unit": "pieces", "pack": "500", "subpack": "50", "purchase": 500.00, "sale": 800.00, "qty": 1000},
            {"name": "N95 Respirators", "unit": "pieces", "pack": "200", "subpack": "20", "purchase": 2000.00, "sale": 3000.00, "qty": 400},
            {"name": "Syringes 5ml", "unit": "pieces", "pack": "500", "subpack": "100", "purchase": 800.00, "sale": 1200.00, "qty": 1000},
            {"name": "Syringes 10ml", "unit": "pieces", "pack": "500", "subpack": "100", "purchase": 900.00, "sale": 1350.00, "qty": 800},
            {"name": "IV Cannula 18G", "unit": "pieces", "pack": "200", "subpack": "50", "purchase": 1500.00, "sale": 2300.00, "qty": 500},
            {"name": "IV Cannula 20G", "unit": "pieces", "pack": "200", "subpack": "50", "purchase": 1400.00, "sale": 2200.00, "qty": 500},
            {"name": "Gauze Swabs 10x10cm", "unit": "pieces", "pack": "1000", "subpack": "100", "purchase": 500.00, "sale": 800.00, "qty": 2000},
            {"name": "Cotton Wool 500g", "unit": "rolls", "pack": "20", "subpack": "1", "purchase": 450.00, "sale": 650.00, "qty": 100},
            {"name": "Bandages 10cm", "unit": "rolls", "pack": "100", "subpack": "10", "purchase": 800.00, "sale": 1200.00, "qty": 300},
            {"name": "Surgical Tape", "unit": "rolls", "pack": "100", "subpack": "10", "purchase": 600.00, "sale": 950.00, "qty": 300},
            {"name": "Alcohol Swabs", "unit": "pieces", "pack": "1000", "subpack": "100", "purchase": 400.00, "sale": 650.00, "qty": 2000},
            {"name": "Blood Collection Tubes EDTA", "unit": "pieces", "pack": "500", "subpack": "100", "purchase": 1200.00, "sale": 1800.00, "qty": 1000},
            {"name": "Urine Collection Containers", "unit": "pieces", "pack": "500", "subpack": "50", "purchase": 800.00, "sale": 1200.00, "qty": 1000},
        ],
        
        # ANTISEPTICS & DISINFECTANTS
        "Antiseptics": [
            {"name": "Hydrogen Peroxide 3% 500ml", "unit": "bottles", "pack": "20", "subpack": "1", "purchase": 600.00, "sale": 950.00, "qty": 100},
            {"name": "Betadine Solution 500ml", "unit": "bottles", "pack": "20", "subpack": "1", "purchase": 1500.00, "sale": 2300.00, "qty": 80},
            {"name": "Methylated Spirit 500ml", "unit": "bottles", "pack": "20", "subpack": "1", "purchase": 400.00, "sale": 650.00, "qty": 120},
            {"name": "Hand Sanitizer 500ml", "unit": "bottles", "pack": "20", "subpack": "1", "purchase": 800.00, "sale": 1200.00, "qty": 200},
            {"name": "Chlorhexidine 4% 500ml", "unit": "bottles", "pack": "20", "subpack": "1", "purchase": 1200.00, "sale": 1800.00, "qty": 80},
        ],
    }
    
    # Syringes, swabs and tubes are used up alongside something else and never
    # sold on their own, so they are created Internal and left unpriced.
    consumables = consumable_item_names()

    # Create items and inventory records
    for category, drugs in pharmaceuticals.items():
        for drug in drugs:
            # Create or get the item
            cat = 'Drug' if category not in ['Medical Supplies', 'Antiseptics'] else 'SurgicalEquipment'
            item, item_created = Item.objects.get_or_create(
                name=drug["name"],
                category=cat,
                units_of_measure=drug["unit"],
                defaults={
                    'desc': f'{drug["name"]} - {category}',
                    'category_one': 'Internal' if drug["name"] in consumables else 'Resale',
                    'item_code': f'PHARM-{drug["name"][:8].upper().replace(" ", "")}-{random.randint(100, 999)}',
                    'vat_rate': 0.0,  # Most pharmaceuticals are VAT-exempt
                    'slow_moving_period': 90,
                }
            )

            # The list quotes prices per pack -- the smallest one a supplier
            # sells: a strip of ten, a box of a hundred syringes -- but the
            # ledger counts base units. Taken per unit, a syringe cost 800.
            units_per_pack = int(drug["subpack"])
            if units_per_pack > 1:
                ItemUnit.objects.update_or_create(
                    item=item, name='Pack',
                    defaults={'factor_to_base': units_per_pack, 'is_purchase_default': True},
                )

            # Pharmaceuticals and supplies are dispensed from the pharmacy.
            tag_item_departments(item, 'Pharmacy')

            if item_created:
                created_data['items'].append(item)
            
            # Seed opening stock through the ledger, the same way real stock
            # arrives, so the demo data has a documented origin.
            if not StockBalance.objects.filter(item=item, department=pharmacy_dept).exists():
                # Generate realistic expiry dates based on drug type
                if category in ['Vaccines', 'IV Fluids']:
                    expiry_months = random.randint(12, 24)  # Shorter shelf life
                elif category == 'Medical Supplies':
                    expiry_months = random.randint(24, 60)  # Longer shelf life
                else:
                    expiry_months = random.randint(18, 36)  # Standard shelf life

                movement = stock_service.receive(
                    item=item,
                    department=pharmacy_dept,
                    quantity=drug["qty"],
                    unit_cost=Decimal(str(drug["purchase"])) / units_per_pack,
                    lot_number=f'LOT-{date.today().year}-{random.randint(1000, 9999)}',
                    expiry_date=date.today() + timedelta(days=expiry_months * 30),
                    reason='Demo data opening stock',
                    source_type=StockMovement.Source.SYSTEM,
                    movement_type=StockMovement.Type.OPENING_BALANCE,
                    idempotency_key=f'demo-drug:{item.id}',
                )
                # The pharmacy list quotes a sale price for everything, but an
                # internal consumable has none -- the API would refuse one.
                if item.is_sellable:
                    stock_service.set_sale_price(item, (
                        Decimal(str(drug["sale"])) / units_per_pack).quantize(Decimal('0.01')))
                created_data['inventory_records'].append(movement)
    
    print(f"\n✅ Created Pharmaceutical Inventory:")
    print(f"   - {len(created_data['items'])} Drug Items")
    print(f"   - {len(created_data['inventory_records'])} Inventory Records")
    
    # Category summary
    category_counts = {}
    for category, drugs in pharmaceuticals.items():
        category_counts[category] = len(drugs)
    
    print("\n   Items by Category:")
    for category, count in category_counts.items():
        print(f"   - {category}: {count} items")
    
    total_value = sum(
        movement.unit_cost * movement.quantity for movement in created_data['inventory_records'])
    print(f"\n   Total Inventory Value: KES {total_value:,.2f}")
    
    return created_data



def create_insurance_price_list(max_insurers=5):
    """
    Agree a price list with the insurers the demo patients actually carry.

    Nothing seeds these otherwise -- `inventory.tasks.create_insurance_prices_for_item`
    exists but nothing calls it -- so without this every insured line in the
    demo falls back to the cash price and the insurer/co-pay split is never
    seen.

    An insurance price is a split, not a discount: `sale_price` is the
    insurer's portion and `co_pay` the patient's, and the line is worth the two
    together. Each insurer here agrees the cash price in total and differs only
    in how much of it the patient carries -- nothing, a tenth or a fifth -- so
    every shape of split turns up somewhere.
    """
    from decimal import Decimal

    from django.db.models import Count

    from inventory.models import InsuranceItemSalePrice

    print("\n\U0001f3e5 Agreeing insurance prices with the patients' insurers...")

    insurers = list(
        InsuranceCompany.objects.annotate(members=Count('patient'))
        .filter(members__gt=0)
        .order_by('-members', 'id')[:max_insurers]
    )
    if not insurers:
        print("   ! no insurer covers any patient; nothing to agree")
        return {'insurers': 0, 'prices': 0}

    # Only what is actually sold. A reagent or a syringe has no price to split.
    sellable = (
        Item.objects.exclude(category__in=Item.UNPRICED_CATEGORIES)
        .exclude(category_one='Internal')
    )
    priced = []
    for item in sellable:
        price = item.current_sale_price
        if price:
            priced.append((item, Decimal(price)))

    patient_shares = [Decimal('0'), Decimal('0.10'), Decimal('0.20')]
    rows = []
    for index, insurer in enumerate(insurers):
        share = patient_shares[index % len(patient_shares)]
        for item, price in priced:
            co_pay = (price * share).quantize(Decimal('1'))
            rows.append(InsuranceItemSalePrice(
                item=item,
                insurance_company=insurer,
                sale_price=price - co_pay,
                co_pay=co_pay,
            ))
        print(f"   - {insurer.name}: patient co-pays {int(share * 100)}%")

    before = InsuranceItemSalePrice.objects.count()
    InsuranceItemSalePrice.objects.bulk_create(rows, ignore_conflicts=True)
    created = InsuranceItemSalePrice.objects.count() - before
    print(f"   - {created} insurance prices across {len(priced)} sellable items")

    return {'insurers': len(insurers), 'prices': created}
