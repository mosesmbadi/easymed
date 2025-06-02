import random
from faker import Faker

from inventory.models import Item
from customuser.models import CustomUser
from company.models import Company, CompanyBranch, InsuranceCompany

fake = Faker()

MEDICAL_ITEM_NAMES = [
    "Paracetamol Tablet", "Surgical Gloves", "Syringe 5ml", "IV Cannula", "Blood Pressure Monitor",
    "Stethoscope", "Insulin Pen", "Antiseptic Solution", "Gauze Roll", "Thermometer",
    "Amoxicillin Capsule", "Saline Drip", "Face Mask", "ECG Machine", "Defibrillator",
    "Scalpel", "Surgical Mask", "Bandage", "Wheelchair", "Crutches"
]

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
    categories = [c[0] for c in Item.CATEGORY_CHOICES]
    units = [u[0] for u in Item.UNIT_CHOICES]
    for _ in range(count):
        name = random.choice(MEDICAL_ITEM_NAMES)
        desc = random.choice(MEDICAL_DESCRIPTIONS)
        category = random.choice(categories)
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