"""
Two months of a working clinic, generated through the same code staff use.

The catalogue on its own -- items, prices, panels, wards -- shows none of what
the system does. Every stock movement, invoice, result and receipt is caused
by something happening to a patient, so this module makes those things happen:
patients arrive, are triaged, seen, tested, dispensed to, admitted, billed and
paid for; the stores reorder what runs low; insurers settle their claims;
samples are archived, retested, released and disposed of.

Two ideas hold it together.

**A demo clock.** Everything is backdated, so reports and dashboards have
history. The clock replaces what the backend reads as "now" -- including
`default=timezone.now` field defaults and Django's own `auto_now_add` -- so a
visit on the 14th is stamped the 14th throughout: its invoice, its stock
movements, its results, its receipt.

**A discrete-event simulation.** Every visit, admission, restock and
settlement is a small script that yields the time of its next step. One
scheduler runs all of them in time order, so the ledger and every turnaround
time are chronologically true even when visits overlap. Steps due after the
real wall clock never run -- which is exactly what makes "today" look like a
working day in progress rather than a finished one.

Every step goes through the real rules -- the billing check, the stock
signals, the payment-allocation and goods-receipt code the screens call. A
step those rules refuse is rolled back and reported, never forced in.
"""

import contextlib
import datetime as _dt
import heapq
import itertools
import math
import random
import types
import zoneinfo
from collections import Counter, defaultdict
from decimal import Decimal
from types import SimpleNamespace
from unittest import mock

import django.utils.timezone as timezone_module
from django.conf import settings
from django.db import transaction
from django.db.models import Sum

DEMO_DAYS = 60
DEMO_SEED = 20260913
ADMIN_EMAIL = 'admin@mail.com'
ADMIN_PASSWORD = 'admin'
STAFF_PASSWORD = 'demo1234'
STAFF_EMAIL_DOMAIN = 'easymed.demo'

_real_datetime = _dt.datetime
_real_date = _dt.date


def _local_zone():
    return zoneinfo.ZoneInfo(settings.TIME_ZONE)


# ---------------------------------------------------------------------------
# The clock
# ---------------------------------------------------------------------------

class _ClockMeta(type):
    """
    isinstance() and issubclass() against a stand-in answer exactly as they
    would against the real class, so nothing that type-checks a date notices
    it has been swapped.
    """

    def __instancecheck__(cls, obj):
        return isinstance(obj, cls._real)

    def __subclasscheck__(cls, subclass):
        return issubclass(subclass, cls._real)


class ClockDatetime(_real_datetime, metaclass=_ClockMeta):
    """`datetime` as the backend sees it while the demo clock is running."""
    _real = _real_datetime

    def __new__(cls, *args, **kwargs):
        # Hand back the real type, so nothing downstream -- the database
        # adapter least of all -- ever holds the stand-in.
        return _real_datetime(*args, **kwargs)

    @classmethod
    def now(cls, tz=None):
        moment = DemoClock.current()
        if moment is None:
            return _real_datetime.now(tz)
        if tz is None:
            return moment.astimezone(_local_zone()).replace(tzinfo=None)
        return moment.astimezone(tz)

    @classmethod
    def today(cls):
        return cls.now()

    @classmethod
    def utcnow(cls):
        return cls.now(_dt.timezone.utc).replace(tzinfo=None)


class ClockDate(_real_date, metaclass=_ClockMeta):
    """`date` as Django's DateField sees it while the demo clock is running."""
    _real = _real_date

    def __new__(cls, *args, **kwargs):
        return _real_date(*args, **kwargs)

    @classmethod
    def today(cls):
        moment = DemoClock.current()
        if moment is None:
            return _real_date.today()
        return moment.astimezone(_local_zone()).date()


def _datetime_module_for_fields():
    """
    The `datetime` module as Django's model fields see it.

    DateField(auto_now_add) calls datetime.date.today() and TimeField calls
    datetime.datetime.now() directly -- neither goes through timezone.now() --
    so the clock has to be handed to them this way.
    """
    proxy = types.ModuleType('datetime')
    proxy.__dict__.update(_dt.__dict__)
    proxy.datetime = ClockDatetime
    proxy.date = ClockDate
    return proxy


def _modules_reading_the_clock():
    """App modules that call datetime.now() themselves, for reference numbers."""
    import customuser.models
    import inventory.models
    import laboratory.models
    import patient.models
    import pharmacy.models

    modules = (customuser.models, inventory.models, laboratory.models,
               patient.models, pharmacy.models)
    return [m for m in modules if getattr(m, 'datetime', None) is _real_datetime]


class DemoClock:
    """
    What the backend reads as "now" while the demo is generated.

    Replaces the `datetime` class that django.utils.timezone reads -- and so
    every timezone.now(), every `default=timezone.now` and every auto_now field
    -- plus Django's field-level date handling and the few app modules that
    stamp reference numbers from datetime.now(). Celery tasks run inline for
    the duration, on this clock, instead of later in a worker on the wall
    clock.

    The clock never runs ahead of the real one.
    """
    _moment = None

    def __init__(self, start):
        self.wall = _real_datetime.now(_dt.timezone.utc)
        self.start = start
        self._stack = None

    @classmethod
    def current(cls):
        return cls._moment

    @property
    def now(self):
        return DemoClock._moment

    def set(self, moment):
        DemoClock._moment = min(moment, self.wall)

    def advance(self, **delta):
        self.set(DemoClock._moment + _dt.timedelta(**delta))

    def __enter__(self):
        import django.db.models.fields as fields_module
        from easymed.celery import app as celery_app

        stack = contextlib.ExitStack()
        stack.enter_context(mock.patch.object(timezone_module, 'datetime', ClockDatetime))
        stack.enter_context(mock.patch.object(
            fields_module, 'datetime', _datetime_module_for_fields()))
        for module in _modules_reading_the_clock():
            stack.enter_context(mock.patch.object(module, 'datetime', ClockDatetime))

        # Celery reads settings loaded under namespace='CELERY' by their
        # prefixed name first, so the Django setting CELERY_TASK_ALWAYS_EAGER
        # shadows a plain `conf.task_always_eager = True` -- which is how every
        # reagent deduction in the demo went to the worker, ran before its
        # step committed, and found no result to deduct for.
        eager = celery_app.conf['CELERY_TASK_ALWAYS_EAGER']
        celery_app.conf['CELERY_TASK_ALWAYS_EAGER'] = True
        stack.callback(celery_app.conf.__setitem__, 'CELERY_TASK_ALWAYS_EAGER', eager)
        stack.callback(DemoClock._stop)

        self._stack = stack
        self.set(self.start)
        return self

    def __exit__(self, *exc_info):
        return self._stack.__exit__(*exc_info)

    @staticmethod
    def _stop():
        DemoClock._moment = None


def demo_start(days=DEMO_DAYS):
    """When the demo's history begins: the morning before its first visit day."""
    local_today = _real_datetime.now(_local_zone()).date()
    first = local_today - _dt.timedelta(days=days + 1)
    return _at(first, 7, 0)


def _at(day, hour, minute=0):
    return _real_datetime(day.year, day.month, day.day, hour, minute, tzinfo=_local_zone())


# ---------------------------------------------------------------------------
# The scheduler
# ---------------------------------------------------------------------------

class DemoRefused(Exception):
    """A step the real rules would not allow."""


def run_scripts(clock, world, scripts):
    """
    Run every script's steps in time order across all of them.

    A script is a generator that yields the time of its next step; the work of
    that step is the code after the yield. Each step runs in its own
    transaction, so a refused step rolls back alone and ends its script.
    Steps due after the wall clock are dropped, not run.
    """
    heap = []
    order = itertools.count()

    def push(script, label):
        try:
            first = next(script)
        except StopIteration:
            return
        heapq.heappush(heap, (first, next(order), script, label))

    for script, label in scripts:
        push(script, label)

    last_report = None
    while heap or world.pending:
        while world.pending:
            push(*world.pending.pop())
        if not heap:
            break

        when, _, script, label = heapq.heappop(heap)
        if when > clock.wall:
            world.counts['steps still to come'] += 1
            script.close()
            continue

        clock.set(when)
        day = when.astimezone(_local_zone()).date()
        if last_report is None or (day - last_report).days >= 7:
            last_report = day
            print(f"   ... {day:%a %d %b}: {world.counts['visits']} visits so far")

        pending_before = len(world.pending)
        try:
            with transaction.atomic():
                # A script's last step ends by running off the end of the
                # generator. Caught out here, that StopIteration would leave
                # the atomic block as an exception and roll the step back --
                # every visit's payment was its last step, and none survived.
                try:
                    following = script.send(None)
                except StopIteration:
                    following = None
        except Exception as exc:  # noqa: BLE001 -- every refusal is reported
            del world.pending[pending_before:]
            world.refuse(label, exc)
            continue

        if following is not None:
            heapq.heappush(heap, (max(following, when), next(order), script, label))


# ---------------------------------------------------------------------------
# Who works here
# ---------------------------------------------------------------------------

DEMO_STAFF = [
    ('doctor', 'Wanjiru', 'Kamau', 'General Practitioner'),
    ('doctor', 'Otieno', 'Odhiambo', 'Consultant Physician'),
    ('doctor', 'Amina', 'Hassan', 'Paediatrician'),
    ('doctor', 'Kipchoge', 'Rotich', 'Dental Surgeon'),
    ('senior_nurse', 'Esther', 'Wambui', 'Nursing Officer in Charge'),
    ('nurse', 'Grace', 'Muthoni', 'Registered Nurse'),
    ('nurse', 'Faith', 'Achieng', 'Registered Nurse'),
    ('nurse', 'Brian', 'Kiprono', 'Enrolled Nurse'),
    ('nurse', 'Mercy', 'Njeri', 'Registered Nurse'),
    ('labtech', 'Peter', 'Mwangi', 'Medical Laboratory Technologist'),
    ('labtech', 'Lucy', 'Chebet', 'Medical Laboratory Technician'),
    ('pharmacist', 'David', 'Omondi', 'Pharmacist'),
    ('pharmacist', 'Ann', 'Wairimu', 'Pharmaceutical Technologist'),
    ('receptionist', 'Joyce', 'Atieno', 'Front Office'),
    ('receptionist', 'Samuel', 'Kariuki', 'Front Office and Cashier'),
]

# Dashboards are gated on the permissions of a user's group, not on the role
# alone, so a staff account without its group logs in to an empty menu.
ROLE_GROUP = {
    'sysadmin': 'SYS_ADMIN',
    'doctor': 'DOCTOR',
    'nurse': 'NURSE',
    'senior_nurse': 'NURSE',
    'labtech': 'LAB_TECH',
    'pharmacist': 'PHARMACIST',
    'receptionist': 'RECEPTIONIST',
}


def staff_email(first, last):
    return f"{first}.{last}@{STAFF_EMAIL_DOMAIN}".lower()


def seed_staff():
    """
    The people the demo is run by, able to log in to their own dashboards.

    Nothing else in the project creates an administrator, so on a fresh
    database nobody could log in at all; one is created when none exists.
    """
    from authperms.models import Group
    from customuser.models import CustomUser
    from inventory.models import Department

    groups = {group.name: group for group in Group.objects.all()}
    staff = defaultdict(list)

    admin = CustomUser.objects.filter(is_superuser=True).order_by('id').first()
    if admin is None:
        admin = CustomUser.objects.create_superuser(
            ADMIN_EMAIL, ADMIN_PASSWORD, first_name='System', last_name='Administrator')
    if admin.group_id is None and 'SYS_ADMIN' in groups:
        admin.group = groups['SYS_ADMIN']
        admin.save(update_fields=['group'])
    staff['sysadmin'].append(admin)

    for index, (role, first, last, profession) in enumerate(DEMO_STAFF):
        email = staff_email(first, last)
        user = CustomUser.objects.filter(email=email).first()
        if user is None:
            user = CustomUser.objects.create_user(
                email=email,
                password=STAFF_PASSWORD,
                first_name=first,
                last_name=last,
                role=role,
                profession=profession,
                phone=f"+2547{index:02d}{(index * 7919) % 1000000:06d}",
                group=groups.get(ROLE_GROUP[role]),
            )
        staff[role].append(user)

    # Heads can receive stock inwards for their own department.
    for name, role in (('Pharmacy', 'pharmacist'), ('Lab', 'labtech')):
        department = Department.objects.filter(name__iexact=name).first()
        if department and department.head_id is None and staff[role]:
            department.head = staff[role][0]
            department.save(update_fields=['head'])

    staff['nurse_all'] = staff['senior_nurse'] + staff['nurse']
    return staff


# ---------------------------------------------------------------------------
# Standing set-up: accounts, lab, pharmacy reference data, patients' details
# ---------------------------------------------------------------------------

def seed_chart_of_accounts():
    """
    Where money lands. Recording a payment needs a sub-account tied to a
    payment mode, so without these no receipt could be posted at all.
    """
    from billing.models import MainAccount, PaymentMode, SubAccount

    cash = PaymentMode.get_default()
    mpesa = (PaymentMode.objects.filter(payment_category='mobile_money').first()
             or PaymentMode.objects.create(payment_mode='M-Pesa', payment_category='mobile_money'))
    bank = (PaymentMode.objects.filter(payment_category='bank_transfer').first()
            or PaymentMode.objects.create(payment_mode='Bank Transfer', payment_category='bank_transfer'))

    def main(name, description):
        return MainAccount.objects.get_or_create(name=name, defaults={'description': description})[0]

    def sub(main_account, name, mode, opening, description):
        return SubAccount.objects.get_or_create(
            main_account=main_account, name=name,
            defaults={
                'payment_mode': mode, 'opening_bal': Decimal(opening),
                'description': description, 'min_trans': Decimal('1'),
                'max_trans': Decimal('5000000'), 'max_bal': Decimal('50000000'),
            })[0]

    cash_at_hand = main('Cash at Hand', 'Notes and coins held at the cashier')
    mobile = main('Mobile Money', 'M-Pesa paybill collections')
    banks = main('Bank Accounts', 'Operating and collection accounts')

    return {
        'till': sub(cash_at_hand, 'Main Till', cash, '20000', 'Front office cash drawer'),
        'mpesa': sub(mobile, 'M-Pesa Paybill 247247', mpesa, '0', 'Patient mobile payments'),
        'collections': sub(banks, 'Equity Bank - Collections', bank, '350000',
                           'Where insurers settle their claims'),
        'payments': sub(banks, 'KCB - Supplier Payments', bank, '500000', 'Pays suppliers'),
    }


REAGENT_CHEMISTRY = {
    'Sysmex CBC Reagent Kit': ('Cellpack DCL diluent', '7647-14-5', '58.44', '99.50'),
    'Roche ALT/AST Reagent': ('L-Alanine substrate', '56-41-7', '89.09', '98.00'),
    'Roche Alkaline Phosphatase Reagent': ('p-Nitrophenyl phosphate', '330-13-2', '219.09', '99.00'),
    'Roche Total Bilirubin Reagent': ('Diazotized sulfanilic acid', '121-57-3', '173.19', '98.50'),
    'Roche Albumin/Total Protein Reagent': ('Bromocresol green', '76-60-8', '698.01', '95.00'),
    'Abbott Cholesterol Reagent': ('Cholesterol oxidase', '9028-76-6', '386.65', '97.00'),
    'Abbott Triglycerides Reagent': ('Glycerol kinase', '9030-66-4', '92.09', '97.50'),
    'Abbott HDL/LDL Reagent': ('Polyanion detergent', '9004-54-0', '504.44', '96.00'),
    'Roche Creatinine Reagent': ('Picric acid', '88-89-1', '229.10', '99.00'),
    'Roche Urea/BUN Reagent': ('Urease', '9002-13-5', '60.06', '98.00'),
    'Roche Uric Acid Reagent': ('Uricase', '9002-12-4', '168.11', '98.00'),
    'Roche Thyroid Panel Reagent': ('Ruthenium chelate', '64894-64-0', '1057.20', '95.00'),
    'Roche ISE Electrolytes Reagent': ('Sodium chloride', '7647-14-5', '58.44', '99.90'),
    'Roche Glucose Reagent': ('Hexokinase', '9001-51-8', '180.16', '99.00'),
    'Abbott HbA1c Reagent': ('Fructosyl peptide oxidase', '9014-63-5', '1034.00', '96.50'),
}

ARCHIVE_DAYS = {
    'Blood': 7, 'Serum': 14, 'Plasma': 14, 'Urine': 2, 'Stool': 1,
    'Swab': 5, 'Sputum': 3, 'CSF': 30, 'Saliva': 2,
}


def seed_lab_setup():
    """Analysers, reagent chemistry, how long each specimen is kept, and where."""
    from inventory.models import Item
    from laboratory.models import (
        Archive, ArchiveComponent, ArchivePosition, ArchiveRack, ArchiveSection,
        LabEquipment, LabReagent, LabSettings, Specimen,
    )
    from patient.models import TriageSettings

    LabSettings.get_settings()
    TriageSettings.objects.get_or_create(pk=1)

    for name, ip, port, data_format, com_mode in (
        ('Sysmex XN-550 Haematology Analyser', '192.168.10.21', '5100', 'hl7', 'tcp'),
        ('Roche Cobas c 311 Chemistry Analyser', '192.168.10.22', '5200', 'astm', 'tcp'),
        ('Mindray BS-240 Chemistry Analyser', None, 'COM3', 'astm', 'serial'),
    ):
        LabEquipment.objects.get_or_create(name=name, defaults={
            'ip_address': ip, 'port': port, 'data_format': data_format, 'com_mode': com_mode})

    for reagent in Item.objects.filter(category='LabReagent', name__in=REAGENT_CHEMISTRY):
        chemical, cas, weight, purity = REAGENT_CHEMISTRY[reagent.name]
        LabReagent.objects.get_or_create(item=reagent, defaults={
            'name': chemical, 'cas_number': cas,
            'molecular_weight': Decimal(weight), 'purity': Decimal(purity)})

    for name, days in ARCHIVE_DAYS.items():
        Specimen.objects.filter(name=name).update(max_archive_duration=days)

    archive, _ = Archive.objects.get_or_create(
        name='Main Sample Archive', defaults={'description': 'Specimens kept for re-testing'})
    for component_name in ('Refrigerator A (2-8C)', 'Freezer B (-20C)'):
        component, _ = ArchiveComponent.objects.get_or_create(archive=archive, name=component_name)
        for shelf in (1, 2):
            section, _ = ArchiveSection.objects.get_or_create(component=component, name=f'Shelf {shelf}')
            for rack_letter in 'AB':
                rack, _ = ArchiveRack.objects.get_or_create(section=section, name=f'Rack {rack_letter}')
                for slot in range(1, 11):
                    ArchivePosition.objects.get_or_create(
                        rack=rack, name=f'{component_name[0]}{shelf}{rack_letter}-{slot:02d}')


def seed_pharmacy_reference():
    """Drug categories, routes and forms, as the pharmacy screens group them."""
    from inventory.models import Item
    from pharmacy.models import Drug, DrugCategory, DrugMode, DrugState

    for item in Item.objects.filter(category='Drug'):
        name = item.name.lower()
        category_name = item.desc.rsplit(' - ', 1)[-1] if ' - ' in (item.desc or '') else 'General'
        if 'inhaler' in name:
            state, mode = 'Inhaler', 'Inhalation'
        elif 'injection' in name or 'vaccine' in name or 'toxoid' in name:
            state, mode = 'Injection', 'Injection'
        elif '1000ml' in name:
            state, mode = 'Liquid', 'IV Infusion'
        elif 'capsule' in name:
            state, mode = 'Capsule', 'Oral'
        elif 'tablet' in name:
            state, mode = 'Tablet', 'Oral'
        elif 'salts' in name:
            state, mode = 'Powder', 'Oral'
        else:
            state, mode = 'Liquid', 'Oral'
        Drug.objects.get_or_create(item=item, defaults={
            'category': DrugCategory.objects.get_or_create(name=category_name)[0],
            'mode': DrugMode.objects.get_or_create(name=mode)[0],
            'state': DrugState.objects.get_or_create(name=state)[0],
        })


DEMO_SUPPLIERS = [
    ('Harleys Limited', 'Harleys'),
    ('Dawa Limited', 'Dawa'),
    ('Surgipharm Limited', 'Surgipharm'),
    ('Crown Healthcare Limited', 'Crown Healthcare'),
    ('Chem-Labs Diagnostics Kenya', 'Chem-Labs'),
]

DEMO_CHILDREN = [
    ('Baraka', 'Otieno', 'M', 4), ('Neema', 'Wanjiku', 'F', 7), ('Tumaini', 'Mutua', 'M', 2),
    ('Imani', 'Akinyi', 'F', 10), ('Jabari', 'Kiprop', 'M', 12), ('Zawadi', 'Njoroge', 'F', 5),
    ('Amani', 'Wekesa', 'M', 8), ('Nia', 'Chepkoech', 'F', 3),
]

RESIDENCES = ['Westlands', 'Kilimani', 'Kasarani', 'Embakasi', 'Ruaka', 'Rongai',
              'Kitengela', 'Thika', 'Karen', 'South B', 'Ngong', 'Githurai']
KIN = ['Spouse', 'Parent', 'Sibling', 'Son', 'Daughter', 'Guardian']
KIN_NAMES = ['Mary', 'John', 'Esther', 'Joseph', 'Ruth', 'James', 'Agnes', 'Paul', 'Lydia', 'Daniel']


def seed_patient_details(rng):
    """Children for the paediatric side, and a next of kin for everybody."""
    from patient.models import ContactDetails, NextOfKin, Patient

    today = _real_date.today()
    for first, last, gender, years in DEMO_CHILDREN:
        if not Patient.objects.filter(first_name=first, second_name=last).exists():
            Patient.objects.create(
                first_name=first, second_name=last, gender=gender,
                # Counted in days, not by swapping the year: replace() raises
                # on 29 February, and this runs on every fresh start.
                date_of_birth=today - _dt.timedelta(days=int(365.25 * years) + rng.randint(0, 300)),
                phone=f"07{rng.randint(10000000, 99999999)}",
            )

    for patient in Patient.objects.filter(next_of_kin__isnull=True):
        contacts = ContactDetails.objects.create(
            tel_no=rng.randint(700000000, 799999999),
            residence=rng.choice(RESIDENCES),
        )
        child = _age(patient) < 16
        NextOfKin.objects.create(
            patient=patient,
            first_name=rng.choice(KIN_NAMES),
            second_name=patient.second_name,
            relationship='Parent' if child else rng.choice(KIN),
            contacts=contacts,
        )


def _age(patient):
    if not patient.date_of_birth:
        return 30
    return (_real_date.today() - patient.date_of_birth).days // 365


def seed_ward_nurses(staff):
    from inpatient.models import Ward, WardNurseAssignment

    wards = ['Male General Ward A', 'Female General Ward A', 'Pediatrics Ward A', 'Maternity Ward']
    lead = staff['senior_nurse'][0] if staff['senior_nurse'] else None
    for nurse, ward_name in zip(staff['nurse'], wards):
        ward = Ward.objects.filter(name=ward_name).first()
        if ward and not WardNurseAssignment.objects.filter(nurse=nurse).exists():
            WardNurseAssignment.objects.create(ward=ward, nurse=nurse, assigned_by=lead)


# ---------------------------------------------------------------------------
# Why patients come in
# ---------------------------------------------------------------------------

# Each scenario is a presentation the clinic sees often, with what a doctor
# would order for it. `abnormal` pushes results for panels whose name contains
# the key past their reference range, by that factor, so the results read like
# the diagnosis rather than like noise.
SCENARIOS = [
    {
        'key': 'malaria', 'weight': 14, 'child_ok': True, 'fever': True,
        'complaint': 'Fever, chills and headache for three days',
        'signs': 'Febrile, rigors, mild dehydration',
        'diagnosis': 'Uncomplicated malaria',
        'tests': ['Malaria Test', 'Complete Blood Count (CBC)'], 'positive': 0.7,
        'abnormal': {'Platelet': 0.7},
        'drugs': [('Artemether-Lumefantrine 20/120mg Tablets', 24, '4 tablets', 'Twice a day', '3 days'),
                  ('Paracetamol 500mg Tablets', 18, '2 tablets', 'Three times a day', '3 days')],
        'admit': 0.06, 'admit_reason': 'Severe malaria, unable to keep oral medication down',
        'admit_drugs': [('Artesunate 60mg Injection', 2, '1 vial IV', 'Every 12 hours', 'Inpatient'),
                        ('Normal Saline 0.9% 1000ml', 2, '1 litre IV', 'Every 12 hours', 'Inpatient')],
    },
    {
        'key': 'urti', 'weight': 12, 'child_ok': True,
        'complaint': 'Cough, sore throat and runny nose',
        'signs': 'Inflamed pharynx, clear chest',
        'diagnosis': 'Upper respiratory tract infection',
        'tests': [],
        'drugs': [('Amoxicillin 500mg Capsules', 15, '1 capsule', 'Three times a day', '5 days'),
                  ('Cetirizine 10mg Tablets', 7, '1 tablet', 'Once a day', '7 days'),
                  ('Paracetamol 500mg Tablets', 12, '2 tablets', 'Three times a day', '2 days')],
    },
    {
        'key': 'uti', 'weight': 9,
        'complaint': 'Burning urination and lower abdominal pain',
        'signs': 'Suprapubic tenderness, afebrile',
        'diagnosis': 'Urinary tract infection',
        'tests': ['Urinalysis'], 'abnormal': {'Protein': 1.8},
        'drugs': [('Ciprofloxacin 500mg Tablets', 10, '1 tablet', 'Twice a day', '5 days'),
                  ('Ibuprofen 400mg Tablets', 9, '1 tablet', 'Three times a day', '3 days')],
    },
    {
        'key': 'gastro', 'weight': 8, 'child_ok': True,
        'complaint': 'Diarrhoea and vomiting since yesterday',
        'signs': 'Mild dehydration, hyperactive bowel sounds',
        'diagnosis': 'Acute gastroenteritis',
        'tests': ['Complete Blood Count (CBC)'], 'abnormal': {'White Blood Cell': 1.3},
        'drugs': [('Oral Rehydration Salts (ORS)', 6, '1 sachet', 'After each loose stool', '3 days'),
                  ('Metronidazole 400mg Tablets', 15, '1 tablet', 'Three times a day', '5 days')],
        'admit': 0.05, 'admit_reason': 'Moderate dehydration needing IV fluids',
        'admit_drugs': [("Ringer's Lactate 1000ml", 2, '1 litre IV', 'Every 12 hours', 'Inpatient')],
    },
    {
        'key': 'hypertension', 'weight': 8, 'bp': True,
        'complaint': 'Headaches, review of blood pressure',
        'signs': 'Blood pressure raised on two readings',
        'diagnosis': 'Essential hypertension',
        'tests': ['Kidney Function Test (RFT)', 'Lipid Profile'],
        'abnormal': {'LDL': 1.3, 'Total Cholesterol': 1.2, 'Creatinine': 1.15},
        'drugs': [('Amlodipine 5mg Tablets', 30, '1 tablet', 'Once a day', '30 days'),
                  ('Hydrochlorothiazide 25mg Tablets', 30, '1 tablet', 'Once a day', '30 days')],
    },
    {
        'key': 'diabetes', 'weight': 7,
        'complaint': 'Excessive thirst and frequent urination',
        'signs': 'Random glucose high on glucometer',
        'diagnosis': 'Type 2 diabetes mellitus',
        'tests': ['Blood Glucose Profile', 'Kidney Function Test (RFT)'],
        'abnormal': {'Glucose': 1.7, 'HbA1c': 1.5},
        'drugs': [('Metformin 500mg Tablets', 60, '1 tablet', 'Twice a day', '30 days')],
    },
    {
        'key': 'checkup', 'weight': 7,
        'complaint': 'Routine medical check-up',
        'signs': 'No abnormal findings on examination',
        'diagnosis': 'Routine health screening',
        'tests': ['Complete Blood Count (CBC)', 'Lipid Profile', 'Blood Glucose Profile'],
        'drugs': [],
    },
    {
        'key': 'peptic', 'weight': 5,
        'complaint': 'Burning upper abdominal pain after meals',
        'signs': 'Epigastric tenderness',
        'diagnosis': 'Peptic ulcer disease',
        'tests': [],
        'drugs': [('Omeprazole 20mg Capsules', 28, '1 capsule', 'Once a day', '28 days')],
    },
    {
        'key': 'injury', 'weight': 5,
        'complaint': 'Cut on the forearm from a fall',
        'signs': 'Clean 3cm laceration, sutured',
        'diagnosis': 'Soft tissue injury',
        'tests': [],
        'drugs': [('Tetanus Toxoid', 1, '0.5ml IM', 'Once', 'Stat'),
                  ('Diclofenac 50mg Tablets', 10, '1 tablet', 'Twice a day', '5 days'),
                  ('Amoxicillin-Clavulanate 625mg Tablets', 10, '1 tablet', 'Twice a day', '5 days')],
    },
    {
        'key': 'dental', 'weight': 5, 'consult': 'Dentist Appointment',
        'complaint': 'Toothache, lower left molar',
        'signs': 'Carious tooth, tender to percussion',
        'diagnosis': 'Dental caries with pulpitis',
        'tests': [],
        'drugs': [('Amoxicillin 500mg Capsules', 15, '1 capsule', 'Three times a day', '5 days'),
                  ('Ibuprofen 400mg Tablets', 9, '1 tablet', 'Three times a day', '3 days')],
    },
    {
        'key': 'pneumonia', 'weight': 4, 'child_ok': True, 'fever': True, 'low_spo2': True,
        'complaint': 'High fever, cough and chest pain',
        'signs': 'Crackles right lower zone, breathing fast',
        'diagnosis': 'Community-acquired pneumonia',
        'tests': ['Complete Blood Count (CBC)', 'Electrolytes Panel'],
        'abnormal': {'White Blood Cell': 1.7},
        'drugs': [('Azithromycin 500mg Tablets', 3, '1 tablet', 'Once a day', '3 days'),
                  ('Paracetamol 500mg Tablets', 12, '2 tablets', 'Three times a day', '2 days')],
        'admit': 0.45, 'admit_reason': 'Low oxygen saturation, needs IV antibiotics',
        'admit_drugs': [('Ceftriaxone 1g Injection', 1, '1g IV', 'Once a day', 'Inpatient'),
                        ('Paracetamol 1g Injection', 3, '1g IV', 'Every 8 hours', 'Inpatient')],
    },
    {
        'key': 'anaemia', 'weight': 3,
        'complaint': 'Tiredness and dizziness for weeks',
        'signs': 'Pale conjunctivae, fast pulse',
        'diagnosis': 'Anaemia, cause to be established',
        'tests': ['Complete Blood Count (CBC)'],
        'abnormal': {'Hemoglobin': 0.7, 'Hematocrit': 0.75, 'Red Blood Cell': 0.8},
        'drugs': [],
    },
    {
        'key': 'liver', 'weight': 3,
        'complaint': 'Yellow eyes and upper abdominal discomfort',
        'signs': 'Jaundiced, tender liver edge',
        'diagnosis': 'Suspected hepatitis',
        'tests': ['Liver Function Test (LFT)', 'Complete Blood Count (CBC)'],
        'abnormal': {'Alanine': 3.0, 'Aspartate': 2.5, 'Bilirubin': 2.5},
        'drugs': [], 'refer': 0.5, 'refer_service': 'general',
    },
    {
        'key': 'thyroid', 'weight': 2,
        'complaint': 'Weight loss and palpitations',
        'signs': 'Fine tremor, fast pulse',
        'diagnosis': 'Suspected hyperthyroidism',
        'tests': ['Thyroid Function Test (TFT)'],
        'drugs': [('Atenolol 50mg Tablets', 30, '1 tablet', 'Once a day', '30 days')],
        'refer': 0.3, 'refer_service': 'general',
    },
    {
        'key': 'asthma', 'weight': 3, 'child_ok': True, 'low_spo2': True,
        'complaint': 'Wheezing and shortness of breath',
        'signs': 'Bilateral wheeze, speaking in sentences',
        'diagnosis': 'Acute asthma exacerbation',
        'tests': [],
        'drugs': [('Salbutamol 100mcg Inhaler', 1, '2 puffs', 'When needed', 'Ongoing'),
                  ('Prednisolone 5mg Tablets', 15, '3 tablets', 'Once a day', '5 days')],
    },
    {
        'key': 'covid', 'weight': 2, 'fever': True,
        'complaint': 'Fever, cough and loss of smell',
        'signs': 'Mild fever, clear chest',
        'diagnosis': 'Suspected COVID-19, isolate pending result',
        'tests': ['COVID-19 PCR'], 'positive': 0.15,
        'drugs': [('Paracetamol 500mg Tablets', 12, '2 tablets', 'Three times a day', '2 days')],
    },
]

REFERRAL_HOSPITALS = ['Kenyatta National Hospital', 'Aga Khan University Hospital',
                      'Nairobi Hospital', 'MP Shah Hospital']
REFERENCE_LABS = ['Lancet Kenya', 'PathCare Kenya', 'KEMRI Reference Laboratory',
                  'Aga Khan University Hospital Lab']
RECEIVING_TECHS = ['Kevin Maina', 'Sharon Moraa', 'Dennis Ouma', 'Irene Kendi']


# ---------------------------------------------------------------------------
# The world every script shares
# ---------------------------------------------------------------------------

class DemoWorld:
    """Who works here, what they use, and the lookups every script needs."""

    def __init__(self, clock, rng, staff, accounts):
        from billing.models import PaymentMode
        from inventory.models import Department, InsuranceItemSalePrice, Item, Supplier
        from laboratory.utils import lab_department
        from rest_framework.test import APIRequestFactory

        self.clock = clock
        self.rng = rng
        self.staff = staff
        self.accounts = accounts
        self.admin = staff['sysadmin'][0]
        self.local = _local_zone()
        self.pending = []
        self.refused = []
        self.counts = Counter()
        self._factory = APIRequestFactory()

        self.pharmacy = Department.objects.filter(name__iexact='Pharmacy').first()
        self.lab = lab_department()
        self.cash = PaymentMode.get_default()

        priced = set(InsuranceItemSalePrice.objects.values_list(
            'insurance_company_id', flat=True).distinct())
        self.insurer_modes = {
            mode.insurance_id: mode
            for mode in PaymentMode.objects.filter(insurance_id__in=priced)
        }

        self.drugs = {i.name: i for i in Item.objects.filter(
            category='Drug', item_code__startswith='PHARM-')}
        self.consultations = {i.name: i for i in Item.objects.filter(
            category__in=['General Appointment', 'Specialized Appointment'])}

        self.suppliers = {}
        for official, common in DEMO_SUPPLIERS:
            self.suppliers[common] = Supplier.objects.get_or_create(
                official_name=official, defaults={'common_name': common})[0]

        self.profiles = {}
        self.par = self._par_levels()
        self._invoice_seq = itertools.count(1001)

    # -- time -------------------------------------------------------------

    def later(self, low, high):
        return self.clock.now + _dt.timedelta(minutes=self.rng.randint(low, high))

    def today(self):
        return self.clock.now.astimezone(self.local).date()

    # -- bookkeeping ------------------------------------------------------

    def spawn(self, script, label):
        self.pending.append((script, label))

    def refuse(self, label, exc):
        self.counts['refused'] += 1
        self.refused.append(f"{label}: {exc}")

    # -- people -----------------------------------------------------------

    def doctor_for(self, patient, scenario):
        doctors = self.staff['doctor']
        if scenario['key'] == 'dental' and len(doctors) > 3:
            return doctors[3]
        if _age(patient) < 14 and len(doctors) > 2:
            return doctors[2]
        return self.rng.choice(doctors[:2])

    def consultation_for(self, patient, scenario):
        name = scenario.get('consult')
        if not name and _age(patient) < 14:
            name = 'Pediatrician Appointment'
        return self.consultations.get(name or 'General Appointment') \
            or self.consultations.get('General Appointment')

    def payment_mode_for(self, patient):
        """Most insured patients use their cover; the rest pay cash."""
        covered = [c for c in patient.insurances.all() if c.id in self.insurer_modes]
        if covered and self.rng.random() < 0.7:
            return self.insurer_modes[covered[0].id]
        return self.cash

    # -- lab --------------------------------------------------------------

    def profile(self, name):
        from laboratory.models import LabTestProfile

        if name not in self.profiles:
            profile = LabTestProfile.objects.filter(name=name).first()
            panels = []
            if profile:
                panels = list(profile.labtestpanel_set.select_related('item', 'specimen')
                              .order_by('id')[:6])
            self.profiles[name] = (profile, panels)
        return self.profiles[name]

    def result_for(self, panel, scenario):
        if panel.is_qualitative:
            positive = self.rng.random() < scenario.get('positive', 0.1)
            return 'Positive' if positive else 'Negative'
        reference = panel.reference_values.first()
        low, high = (float(reference.ref_value_low), float(reference.ref_value_high)) \
            if reference else (1.0, 10.0)
        for fragment, factor in scenario.get('abnormal', {}).items():
            if fragment.lower() in panel.name.lower():
                value = high * factor if factor > 1 else low * factor
                return f"{value * self.rng.uniform(0.95, 1.05):.2f}"
        return f"{self.rng.uniform(low, high):.2f}"

    # -- money ------------------------------------------------------------

    def bill(self, visit, item, mode, quantity=1):
        """Raise the line, then bill it: the till's two steps, in order."""
        from billing.models import InvoiceItem

        source = None
        if item.category == 'Lab Test':
            source = self.lab
        elif item.category == 'Drug':
            source = self.pharmacy
        line = InvoiceItem.objects.create(
            invoice_id=visit.invoice_id, item=item, quantity=quantity,
            payment_mode=mode, source_tag=source)
        line.status = 'billed'
        line.save()
        self.counts['invoice lines billed'] += 1
        return line

    def post_view(self, view_class, path, payload):
        """Call a real API view, as the screen that uses it would."""
        from rest_framework.test import force_authenticate

        request = self._factory.post(path, payload, format='json')
        force_authenticate(request, user=self.admin)
        response = view_class.as_view()(request)
        if response.status_code >= 400:
            raise DemoRefused(f"{path} said {response.status_code}: {getattr(response, 'data', '')}")
        return response.data

    def settle_patient(self, visit, patient):
        """What the patient owes on this visit, paid at the cashier -- mostly."""
        from billing.models import PaymentAllocation
        from billing.views import AllocatePaymentView

        invoice = visit.invoice
        due = invoice.invoice_items.filter(status='billed').aggregate(
            total=Sum('patient_amount'))['total'] or Decimal('0')
        paid = PaymentAllocation.objects.filter(
            invoice_item__invoice=invoice, receipt__patient=patient,
            receipt__insurance__isnull=True,
        ).aggregate(total=Sum('amount_applied'))['total'] or Decimal('0')
        outstanding = due - paid
        if outstanding <= 0:
            return

        roll = self.rng.random()
        if roll < 0.03:
            self.counts['visits left owing'] += 1
            return
        amount = outstanding if roll > 0.10 else (outstanding / 2).quantize(Decimal('1'))

        by_mpesa = self.rng.random() < 0.6
        account = self.accounts['mpesa'] if by_mpesa else self.accounts['till']
        reference = (f"{self.rng.choice('QRST')}{self.rng.choice('ABCDEFGHJK')}"
                     f"{self.rng.randint(10000000, 99999999)}") if by_mpesa \
            else f"CASH-{self.today():%y%m%d}-{self.rng.randint(1000, 9999)}"
        self.post_view(AllocatePaymentView, '/billing/allocate-payment/', {
            'patient_id': patient.id,
            'invoice_ids': [invoice.id],
            'sub_account': account.id,
            'amount': str(amount),
            'reference_number': reference,
            'payment_date': self.today().isoformat(),
        })
        self.counts['patient receipts'] += 1

    # -- stock ------------------------------------------------------------

    def _par_levels(self):
        """What each shelf held when the demo began: the level it is restocked to."""
        from inventory.models import StockBalance

        par = {}
        for department in (self.pharmacy, self.lab):
            if department is None:
                continue
            rows = StockBalance.objects.filter(department=department, quantity__gt=0).values(
                'item_id').annotate(total=Sum('quantity'))
            for row in rows:
                par[(row['item_id'], department.id)] = max(row['total'], 20)
        return par

    def in_stock(self, item, quantity):
        from inventory.services import stock as stock_service

        return stock_service.available_quantity(item, self.pharmacy) >= quantity

    def supplier_for(self, item):
        if item.category == 'LabReagent':
            return self.suppliers['Crown Healthcare' if item.id % 2 else 'Chem-Labs']
        if item.category == 'Drug':
            return self.suppliers['Harleys' if item.id % 2 else 'Dawa']
        return self.suppliers['Surgipharm']


# ---------------------------------------------------------------------------
# Scripts
# ---------------------------------------------------------------------------

def _set_track(visit, track):
    from patient.models import AttendanceProcess

    AttendanceProcess.objects.filter(pk=visit.pk).update(track=track)


def _vitals(world, patient, scenario):
    rng = world.rng
    age = _age(patient)
    if age < 14:
        height = 0.75 + 0.065 * age + rng.uniform(-0.04, 0.04)
        weight = 8 + 2.2 * age + rng.uniform(-2, 2)
    elif patient.gender == 'F':
        height = rng.uniform(1.52, 1.72)
        weight = rng.uniform(52, 88)
    else:
        height = rng.uniform(1.62, 1.86)
        weight = rng.uniform(60, 98)

    temperature = rng.uniform(38.0, 39.6) if scenario.get('fever') else rng.uniform(36.3, 37.2)
    pulse = rng.randint(64, 92) + (18 if scenario.get('fever') else 0)
    systolic, diastolic = rng.randint(108, 132), rng.randint(68, 85)
    if scenario.get('bp'):
        systolic, diastolic = rng.randint(150, 178), rng.randint(94, 108)
    spo2 = rng.randint(88, 93) if scenario.get('low_spo2') else rng.randint(96, 99)
    return {
        'temperature': Decimal(f"{temperature:.1f}"),
        'height': Decimal(f"{height:.2f}"),
        'weight': int(round(weight)),
        'pulse': pulse,
        'systolic': systolic,
        'diastolic': diastolic,
        'spo2': spo2,
        'bmi': Decimal(f"{weight / (height * height):.1f}"),
    }


def _prescribe(world, visit, doctor, drugs, inpatient_days=None):
    from patient.models import PrescribedDrug, Prescription

    Prescription.objects.filter(pk=visit.prescription_id).update(
        created_by=doctor, start_date=world.today())
    prescribed = []
    for name, quantity, dosage, frequency, duration in drugs:
        item = world.drugs.get(name)
        if item is None:
            continue
        if inpatient_days:
            quantity = quantity * inpatient_days
        if not world.in_stock(item, quantity):
            world.counts['drugs skipped: out of stock'] += 1
            continue
        if PrescribedDrug.objects.filter(prescription_id=visit.prescription_id, item=item).exists():
            continue
        prescribed.append(PrescribedDrug.objects.create(
            prescription_id=visit.prescription_id, item=item, quantity=quantity,
            dosage=dosage, frequency=frequency, duration=duration))
    return prescribed


def _dispense(world, visit, mode, prescribed):
    from patient.models import PrescribedDrug

    for drug in prescribed:
        world.bill(visit, drug.item, mode, quantity=drug.quantity)
    PrescribedDrug.objects.filter(pk__in=[d.pk for d in prescribed]).update(is_dispensed=True)
    world.counts['prescriptions dispensed'] += len(prescribed)


def _order_tests(world, visit, doctor, scenario, mode):
    from laboratory.models import LabTestRequest, LabTestRequestPanel

    orders = []
    for profile_name in scenario['tests']:
        profile, panels = world.profile(profile_name)
        if profile is None:
            continue
        runnable = [p for p in panels if p.can_run()[0]]
        if not runnable:
            world.counts['tests skipped: no reagent'] += 1
            continue
        request = LabTestRequest.objects.create(
            process=visit.process_test_req, test_profile=profile, requested_by=doctor,
            note=f"Work-up for {scenario['diagnosis'].lower()}")
        runs = []
        for panel in runnable:
            runs.append(LabTestRequestPanel.objects.create(test_panel=panel, lab_test_request=request))
            world.bill(visit, panel.item, mode)
        orders.append((request, profile, runnable, runs))
        world.counts['lab requests'] += 1
    return orders


def _collect(runs):
    samples = {}
    for run in runs:
        if run.patient_sample_id and run.patient_sample_id not in samples:
            samples[run.patient_sample_id] = run.patient_sample
    for sample in samples.values():
        if not sample.is_sample_collected:
            sample.is_sample_collected = True
            sample.save()
    return list(samples.values())


def _enter_results(world, runs, scenario):
    for run in runs:
        run.result = world.result_for(run.test_panel, scenario)
        run.save()
    world.counts['results entered'] += len(runs)


def _approve(requests, runs):
    from laboratory.models import LabTestRequest

    for run in runs:
        run.result_approved = True
        run.save()
    LabTestRequest.objects.filter(pk__in=[r.pk for r in requests]).update(has_result=True)


def _archive(world, visit, samples, orders, doctor, tech, mode):
    from laboratory.models import ArchivePosition, PatientSampleArchive

    for sample in samples:
        if world.rng.random() > 0.4:
            continue
        position = ArchivePosition.objects.filter(sample_archive__isnull=True).order_by('id').first()
        if position is None:
            world.counts['samples not archived: archive full'] += 1
            return
        archive = PatientSampleArchive.objects.create(
            patient_sample=sample, position=position, created_by=tech)
        world.counts['samples archived'] += 1

        roll = world.rng.random()
        if roll < 0.07:
            order = next((o for o in orders if o[2] and o[2][0].specimen_id == sample.specimen_id), None)
            if order:
                world.spawn(retest_script(world, visit, archive.id, order, doctor, tech, mode),
                            f"retest of {sample.patient_sample_code}")
        elif roll < 0.11:
            world.spawn(release_script(world, archive.id, tech),
                        f"release of {sample.patient_sample_code}")


def visit_script(world, patient, scenario, arrival):
    """One outpatient visit, from the front desk to the cashier."""
    from patient.models import AttendanceProcess, Consultation, Referral
    from roby.models import TriageResult

    rng = world.rng
    yield arrival

    doctor = world.doctor_for(patient, scenario)
    receptionist = rng.choice(world.staff['receptionist'])
    mode = world.payment_mode_for(patient)
    visit = AttendanceProcess.objects.create(
        patient=patient, doctor=doctor, created_by=receptionist, track='reception',
        reason=scenario['complaint'], created_at=world.clock.now)
    consultation_item = world.consultation_for(patient, scenario)
    if consultation_item:
        world.bill(visit, consultation_item, mode)
    world.counts['visits'] += 1

    yield world.later(2, 10)
    _set_track(visit, 'triage')

    yield world.later(5, 25)
    nurse = rng.choice(world.staff['nurse_all'])
    triage = visit.triage
    for field, value in _vitals(world, patient, scenario).items():
        setattr(triage, field, value)
    triage.created_by_user = nurse
    triage.notes = scenario['complaint']
    triage.save()
    _set_track(visit, 'doctor')
    if rng.random() < 0.12:
        TriageResult.objects.create(
            patient=patient, created_by=doctor, status='completed',
            predicted_condition=(f"Most likely: {scenario['diagnosis']}. "
                                 f"Suggested work-up: {', '.join(scenario['tests']) or 'clinical review'}."),
            gemini_response={'conditions': [scenario['diagnosis']], 'confidence': round(rng.uniform(0.6, 0.9), 2)},
        )
        world.counts['AI triage results'] += 1

    yield world.later(10, 50)
    Consultation.objects.create(
        doctor=doctor, patient=patient, attendance_process=visit,
        signs_and_symptoms=scenario['signs'], diagnosis=scenario['diagnosis'],
        doctors_note=f"{scenario['complaint']}. {scenario['signs']}. Impression: {scenario['diagnosis']}.")
    if rng.random() < scenario.get('refer', 0):
        Referral.objects.create(
            referred_by=doctor, patient=patient, attendance_process=visit,
            service=scenario.get('refer_service', 'general'), type='external',
            preferred_provider=rng.choice(REFERRAL_HOSPITALS),
            note=f"Please review: {scenario['diagnosis'].lower()}.")
        world.counts['referrals'] += 1

    orders = _order_tests(world, visit, doctor, scenario, mode)
    if orders:
        runs = [run for order in orders for run in order[3]]
        requests = [order[0] for order in orders]
        _set_track(visit, 'lab')

        yield world.later(5, 25)
        tech = rng.choice(world.staff['labtech'])
        samples = _collect(runs)

        yield world.later(35, 150)
        _enter_results(world, runs, scenario)
        _set_track(visit, 'added result')

        yield world.later(10, 60)
        _approve(requests, runs)
        _archive(world, visit, samples, orders, doctor, tech, mode)

        yield world.later(10, 40)

    if rng.random() < scenario.get('admit', 0):
        world.spawn(admission_script(world, visit, patient, scenario, doctor, mode),
                    f"admission of {patient.first_name} {patient.second_name}")
        return

    prescribed = _prescribe(world, visit, doctor, scenario['drugs'])
    if prescribed:
        _set_track(visit, 'pharmacy')
        yield world.later(5, 35)
        _dispense(world, visit, mode, prescribed)

    _set_track(visit, 'billing')
    yield world.later(2, 12)
    world.settle_patient(visit, patient)
    _set_track(visit, 'complete')


def admission_script(world, visit, patient, scenario, doctor, mode):
    """A stay on the ward: admitted, observed, treated on schedule, discharged."""
    from inpatient.models import (
        Bed, InPatientTriage, PatientAdmission, PatientDischarge, ScheduledDrug,
        ScheduledLabTest, Ward,
    )
    from patient.models import Referral

    rng = world.rng
    yield world.later(20, 60)

    age = _age(patient)
    if age < 14:
        names = ['Pediatrics Ward A'] if patient.gender == 'M' else ['Pediatrics Ward B']
    elif patient.gender == 'F':
        names = ['Female General Ward A', 'Female General Ward B']
    else:
        names = ['Male General Ward A', 'Male General Ward B']
    bed = Bed.objects.filter(ward__name__in=names, status='available',
                             current_patient__isnull=True).order_by('id').first()
    if bed is None:
        world.counts['admissions turned away: no bed'] += 1
        world.settle_patient(visit, patient)
        _set_track(visit, 'complete')
        return

    ward = Ward.objects.get(pk=bed.ward_id)
    admission = PatientAdmission.objects.create(
        attendance_process=visit, patient=patient, ward=ward, bed=bed,
        reason_for_admission=scenario.get('admit_reason', scenario['diagnosis']),
        admitted_by=doctor, admitted_at=world.clock.now)
    Bed.objects.filter(pk=bed.pk).update(status='occupied')
    _set_track(visit, 'inpatient')
    world.counts['admissions'] += 1

    stay_days = rng.randint(2, 5)
    prescribed = _prescribe(world, visit, doctor, scenario.get('admit_drugs', []), inpatient_days=stay_days)
    if prescribed:
        _dispense(world, visit, mode, prescribed)

    admitted = world.clock.now
    discharge_at = _at((admitted + _dt.timedelta(days=stay_days)).astimezone(world.local).date(),
                       rng.randint(9, 12), rng.randint(0, 59))

    per_day_by_name = {name: per_day for name, per_day, _, _, _ in scenario.get('admit_drugs', [])}
    for drug in prescribed:
        # Matched by name, not by position: a drug skipped for being out of
        # stock would otherwise shift every later one onto the wrong schedule.
        interval = 24 / max(per_day_by_name.get(drug.item.name, 1), 1)
        moment = admitted + _dt.timedelta(hours=1)
        while moment < discharge_at:
            ScheduledDrug.objects.create(
                prescription_schedule=admission.schedules, prescribed_drug=drug,
                schedule_time=moment,
                comment='Given as charted' if moment < world.clock.wall else 'Due')
            moment += _dt.timedelta(hours=interval)

    request = visit.process_test_req.attendace_test_requests.order_by('id').first()
    if request:
        repeat_at = admitted + _dt.timedelta(hours=36)
        if repeat_at < discharge_at:
            ScheduledLabTest.objects.create(
                schedule=admission.schedules, lab_test_request=request,
                lab_test_profile=request.test_profile, schedule_time=repeat_at,
                note='Repeat to monitor response to treatment',
                status='completed' if repeat_at < world.clock.wall else 'pending')

    nurse_names = [n.get_fullname() for n in world.staff['nurse_all']] or ['Ward nurse']
    rounds = admitted + _dt.timedelta(hours=4)
    day_index = 0
    while rounds < discharge_at:
        yield rounds
        vitals = _vitals(world, patient, scenario if day_index < 2 else {'key': 'recovering'})
        InPatientTriage.objects.create(
            created_by=rng.choice(nurse_names)[:45], patient_admission=admission,
            notes='Improving' if day_index >= 2 else 'Unwell, on treatment', **vitals)
        rounds += _dt.timedelta(hours=12)
        day_index += 1

    yield discharge_at
    referral = None
    discharge_type = 'normal'
    if rng.random() < 0.1:
        discharge_type = 'referral'
        referral = Referral.objects.create(
            referred_by=doctor, patient=patient, service='general', type='external',
            preferred_provider=rng.choice(REFERRAL_HOSPITALS),
            note='Transferred for specialist care.')
    PatientDischarge.objects.create(
        admission=admission, discharged_by=doctor, discharge_types=discharge_type,
        referral=referral,
        discharge_notes=f"Treated for {scenario['diagnosis'].lower()}. Stable on discharge.")
    world.counts['discharges'] += 1
    _set_track(visit, 'billing')

    yield world.later(10, 40)
    world.settle_patient(visit, patient)
    _set_track(visit, 'complete')


def retest_script(world, visit, archive_id, order, doctor, tech, mode):
    """A result queried, re-run off the archived sample -- no new draw."""
    from laboratory.models import LabTestRequest, LabTestRequestPanel, PatientSampleArchive

    rng = world.rng
    yield _at(world.today() + _dt.timedelta(days=rng.randint(1, 3)), rng.randint(9, 14), rng.randint(0, 59))

    archive = PatientSampleArchive.objects.filter(pk=archive_id).first()
    if archive is None:
        return
    _, profile, panels, _ = order
    request = LabTestRequest.objects.create(
        process=visit.process_test_req, test_profile=profile, requested_by=doctor,
        note='Re-test from the archived sample; result queried')
    runs = []
    for panel in panels:
        runs.append(LabTestRequestPanel.objects.create(test_panel=panel, lab_test_request=request))
        world.bill(visit, panel.item, mode)
    archive.action = 'retest'
    archive.save()
    world.counts['retests'] += 1

    yield world.later(40, 120)
    _enter_results(world, runs, {'key': 'retest'})

    yield world.later(10, 40)
    _approve([request], runs)
    world.settle_patient(visit, visit.patient)


def release_script(world, archive_id, tech):
    """A sample referred out to a reference lab for testing not done here."""
    from laboratory.models import PatientSampleArchive, ReleasedSample

    rng = world.rng
    yield _at(world.today() + _dt.timedelta(days=rng.randint(1, 2)), rng.randint(9, 15), rng.randint(0, 59))

    archive = PatientSampleArchive.objects.filter(pk=archive_id).select_related('patient_sample').first()
    if archive is None or hasattr(archive.patient_sample, 'release_record'):
        return
    sample = archive.patient_sample
    ReleasedSample.objects.create(
        patient_sample=sample, patient_sample_code=sample.patient_sample_code,
        facility_name=rng.choice(REFERENCE_LABS), receiving_lab_tech=rng.choice(RECEIVING_TECHS),
        reason='Specialised test not run in-house',
        notes='Packed on ice; chain-of-custody form signed', released_by=tech)
    archive.action = 'released'
    archive.save()
    world.counts['samples released'] += 1


def _days(first, last, weekday=None):
    day = first
    while day <= last:
        if weekday is None or day.weekday() == weekday:
            yield day
        day += _dt.timedelta(days=1)


def archive_housekeeping_script(world, first, last):
    """Dispose of samples past their keeping time -- not all, so some show expired."""
    from laboratory.models import PatientSampleArchive

    for day in _days(first, last):
        yield _at(day, 17, 30)
        for archive in PatientSampleArchive.objects.filter(action__isnull=True).select_related(
                'patient_sample__specimen'):
            keep = archive.patient_sample.specimen.max_archive_duration or 1
            if archive.archiving_date + _dt.timedelta(days=keep) < day and world.rng.random() < 0.75:
                archive.action = 'dispose'
                archive.save()
                world.counts['samples disposed'] += 1


def lab_topup_script(world, first, last):
    """Monday mornings the lab draws its collection supplies from the pharmacy store."""
    from inventory.services import stock as stock_service
    from laboratory.models import SpecimenConsumable

    for day in _days(first, last, weekday=0):
        yield _at(day, 8, 15)
        if world.pharmacy is None or world.lab is None:
            return
        for item_id in set(SpecimenConsumable.objects.values_list('item_id', flat=True)):
            from inventory.models import Item
            item = Item.objects.get(pk=item_id)
            have = stock_service.available_quantity(item, world.lab)
            if have >= 80:
                continue
            spare = stock_service.available_quantity(item, world.pharmacy) // 2
            quantity = min(200 - have, spare)
            if quantity > 0:
                stock_service.transfer(
                    item=item, from_department=world.pharmacy, to_department=world.lab,
                    quantity=quantity, performed_by=world.staff['labtech'][0],
                    reason='Weekly lab top-up of collection supplies')
                world.counts['lab top-up transfers'] += 1


def procurement_script(world, department, requester, first, last):
    """
    The weekly reorder: what has fallen below a third of its opening level is
    requisitioned, approved twice, ordered per supplier and delivered a few
    days later -- through the same serializers the procurement screens use.
    """
    from inventory.models import Item, PurchaseOrder, Requisition, RequisitionItem
    from inventory.serializers import GoodsReceiptSerializer, PurchaseOrderSerializer
    from inventory.services import stock as stock_service

    rng = world.rng
    if department is None:
        return
    for day in _days(first, last, weekday=0):
        yield _at(day, 9, 30)

        needs = []
        for (item_id, department_id), par in world.par.items():
            if department_id != department.id:
                continue
            item = Item.objects.prefetch_related('unit_conversions').get(pk=item_id)
            have = stock_service.available_quantity(item, department)
            if have >= par * 0.35:
                continue
            pack = next((u for u in item.unit_conversions.all() if u.is_purchase_default), None) \
                or item.unit_conversions.first()
            factor = pack.factor_to_base if pack else 1
            unit_cost = Decimal(item.current_cost or item.last_purchase_cost or 0)
            if unit_cost <= 0:
                continue
            packs = max(1, math.ceil((par - have) / factor))
            needs.append((item, pack, packs, (unit_cost * factor).quantize(Decimal('0.01'))))
        if not needs:
            continue

        requisition = Requisition.objects.create(department=department, requested_by=requester)
        lines = [RequisitionItem.objects.create(
            requisition=requisition, item=item, item_unit=pack, quantity_requested=packs,
            unit_cost=cost, preferred_supplier=world.supplier_for(item))
            for item, pack, packs, cost in needs]
        world.counts['requisitions'] += 1

        yield world.later(90, 240)
        requisition.department_approved = True
        requisition.department_approval_date = world.clock.now
        requisition.approved_by = department.head or requester
        requisition.save()

        yield _at(world.today() + _dt.timedelta(days=1), 10, rng.randint(0, 59))
        requisition.procurement_approved = True
        requisition.procurement_approval_date = world.clock.now
        requisition.save()

        yield world.later(30, 120)
        by_supplier = defaultdict(list)
        for line in lines:
            by_supplier[line.preferred_supplier_id].append(line.id)
        orders = []
        for supplier_id, line_ids in by_supplier.items():
            serializer = PurchaseOrderSerializer(data={
                'ordered_by': world.admin.id, 'requisition_items': line_ids, 'supplier': supplier_id})
            serializer.is_valid(raise_exception=True)
            order = serializer.save(created_by=world.admin)
            PurchaseOrder.objects.filter(pk=order.pk).update(approved_by=world.admin, is_dispatched=True)
            orders.append(order)
            world.counts['purchase orders'] += 1
        requisition.refresh_status()

        yield _at(world.today() + _dt.timedelta(days=rng.randint(2, 4)), 11, rng.randint(0, 59))
        receiver = department.head or requester
        for order in orders:
            partial = rng.random() < 0.2
            _receive(world, order, receiver, partial)
            if partial:
                world.spawn(balance_delivery_script(world, order.id, receiver),
                            f"balance of {order.PO_number}")


def _receive(world, order, receiver, partial, remaining_only=False):
    from inventory.models import IncomingItem
    from inventory.serializers import GoodsReceiptSerializer

    rng = world.rng
    lines = []
    for po_item in order.po_items.select_related('requisition_item__item', 'requisition_item__item_unit'):
        requisition_item = po_item.requisition_item
        quantity = po_item.quantity_ordered
        if remaining_only:
            quantity = po_item.quantity_ordered - po_item.quantity_received
        elif partial:
            quantity = max(1, quantity // 2)
        if quantity <= 0:
            continue
        lines.append({
            'item': requisition_item.item_id,
            'quantity': quantity,
            'item_unit': requisition_item.item_unit_id,
            'purchase_price': str(requisition_item.unit_cost),
            'lot_no': f"L{world.today():%y%m}-{rng.randint(10000, 99999)}",
            'expiry_date': (world.today() + _dt.timedelta(days=rng.randint(420, 1100))).isoformat(),
        })
    if not lines:
        return
    supplier = order.supplier
    serializer = GoodsReceiptSerializer(data={
        'purchase_order': order.id,
        'invoice_no': f"{supplier.common_name[:4].upper()}-{world.today():%y%m%d}-{next(world._invoice_seq)}",
        'status': 'pending',
        'note': 'Balance of order delivered' if remaining_only else 'Delivered in good condition',
        'lines': lines,
    }, context={'request': SimpleNamespace(user=receiver)})
    serializer.is_valid(raise_exception=True)
    serializer.save()
    world.counts['goods receipts'] += 1


def balance_delivery_script(world, order_id, receiver):
    from inventory.models import PurchaseOrder

    yield _at(world.today() + _dt.timedelta(days=world.rng.randint(4, 7)), 11, world.rng.randint(0, 59))
    order = PurchaseOrder.objects.get(pk=order_id)
    _receive(world, order, receiver, partial=False, remaining_only=True)


def supplier_payment_script(world, first, last):
    """Thursdays, invoices over three weeks old are paid -- a few only in part."""
    from inventory.models import SupplierInvoice
    from inventory.views import AllocateSupplierPaymentView

    for day in _days(first, last, weekday=3):
        yield _at(day, 11, 0)
        cutoff = world.clock.now - _dt.timedelta(days=21)
        for invoice in SupplierInvoice.objects.exclude(status='paid').filter(date_created__lte=cutoff):
            paid = invoice.payment_allocations.aggregate(total=Sum('amount_applied'))['total'] or Decimal('0')
            outstanding = (invoice.amount or Decimal('0')) - paid
            if outstanding <= 0:
                continue
            amount = outstanding if world.rng.random() > 0.15 else (outstanding / 2).quantize(Decimal('0.01'))
            world.post_view(AllocateSupplierPaymentView, '/inventory/allocate-supplier-payment/', {
                'supplier_id': invoice.supplier_id,
                'invoice_ids': [invoice.id],
                'sub_account': world.accounts['payments'].id,
                'amount': str(amount),
                'reference_number': f"EFT-{world.today():%y%m%d}-{invoice.id:05d}",
                'payment_date': world.today().isoformat(),
            })
            world.counts['supplier payments'] += 1


def insurer_settlement_script(world, first, last):
    """
    Fridays, each insurer settles its claims over a fortnight old. Most pay in
    full; some short-pay, which is what leaves real receivables on the books.
    """
    from billing.models import InvoiceItem, PaymentAllocation
    from billing.views import AllocatePaymentView

    for day in _days(first + _dt.timedelta(days=14), last, weekday=4):
        yield _at(day, 14, 0)
        cutoff = world.clock.now - _dt.timedelta(days=14)
        for insurer_id in world.insurer_modes:
            lines = InvoiceItem.objects.filter(
                status='billed', payment_mode__insurance_id=insurer_id, item_created_at__lte=cutoff)
            owed = lines.aggregate(total=Sum('actual_total'))['total'] or Decimal('0')
            paid = PaymentAllocation.objects.filter(
                invoice_item__in=lines, receipt__insurance_id=insurer_id,
            ).aggregate(total=Sum('amount_applied'))['total'] or Decimal('0')
            outstanding = owed - paid
            if outstanding <= 0:
                continue
            amount = outstanding if world.rng.random() > 0.2 else (outstanding * Decimal('0.85')).quantize(Decimal('0.01'))
            world.post_view(AllocatePaymentView, '/billing/allocate-payment/', {
                'insurance_id': insurer_id,
                'invoice_ids': list(lines.values_list('invoice_id', flat=True).distinct()),
                'sub_account': world.accounts['collections'].id,
                'amount': str(amount),
                'reference_number': f"CLM-{world.today():%y%m%d}-{insurer_id:03d}",
                'payment_date': world.today().isoformat(),
            })
            world.counts['insurer settlements'] += 1


def stock_take_script(world, days_ago, post=True):
    """A cycle count in the pharmacy: most lines agree, a couple come up short."""
    from inventory.models import StockBalance, StockTake, StockTakeLine
    from inventory.services import stock as stock_service

    if world.pharmacy is None:
        return
    rng = world.rng
    counter = world.staff['pharmacist'][-1]
    yield _at(world.clock.wall.astimezone(world.local).date() - _dt.timedelta(days=days_ago),
              16 if post else 8, 30)

    stock_take = StockTake.objects.create(
        department=world.pharmacy, counted_by=counter,
        note='Monthly cycle count' if post else 'Cycle count in progress')
    balances = list(StockBalance.objects.filter(department=world.pharmacy, quantity__gt=5)
                    .select_related('lot').order_by('id'))
    for index, balance in enumerate(rng.sample(balances, min(8, len(balances)))):
        short = index < 2
        StockTakeLine.objects.create(
            stock_take=stock_take, lot=balance.lot, system_quantity=balance.quantity,
            counted_quantity=balance.quantity - (rng.randint(1, 3) if short else 0),
            note='Short on count, investigated' if short else '')
    world.counts['stock takes'] += 1
    if not post:
        return

    yield world.later(40, 90)
    stock_service.post_stock_take(stock_take, performed_by=world.staff['pharmacist'][0])


def wastage_script(world, first, last):
    """Now and then a vial breaks. Stock that leaves unsold is stock too."""
    from inventory.models import StockMovement
    from inventory.services import stock as stock_service

    injections = [i for name, i in world.drugs.items() if 'Injection' in name]
    for day in _days(first, last):
        if not injections or world.rng.random() > 0.12:
            continue
        yield _at(day, world.rng.randint(9, 16), world.rng.randint(0, 59))
        item = world.rng.choice(injections)
        if stock_service.available_quantity(item, world.pharmacy) < 5:
            continue
        stock_service.issue(
            item=item, department=world.pharmacy, quantity=1,
            movement_type=StockMovement.Type.WASTAGE, performed_by=world.staff['pharmacist'][0],
            reason='Vial broken during handling', source_type=StockMovement.Source.MANUAL)
        world.counts['wastage'] += 1


def price_change_script(world, days_ago):
    """
    A price rise part-way through the period. Invoices raised before it keep
    their old price -- the frozen unit_price is what makes that true.
    """
    from inventory.services import stock as stock_service

    yield _at(world.clock.wall.astimezone(world.local).date() - _dt.timedelta(days=days_ago), 7, 30)
    for name in ('Amoxicillin 500mg Capsules', 'Paracetamol 500mg Tablets', 'Omeprazole 20mg Capsules'):
        item = world.drugs.get(name)
        if item and item.current_sale_price:
            new_price = (Decimal(item.current_sale_price) * Decimal('1.10')).quantize(Decimal('0.01'))
            stock_service.set_sale_price(item, new_price, created_by=world.admin)
            world.counts['price changes'] += 1


ANNOUNCEMENTS = [
    ('Administration', 'Staff meeting Friday 4pm', 'Boardroom. Rota and targets.'),
    ('Clinical Updates', 'New malaria protocol', 'Test every fever before treating.'),
    ('Pharmacy', 'Amoxicillin price change', 'New price applies from today.'),
    ('Laboratory', 'Chemistry analyser serviced', 'Cobas back in use from 10am.'),
    ('Administration', 'Fire drill on Wednesday', 'Assemble at the main gate.'),
    ('Clinical Updates', 'Hand hygiene audit', 'Results posted by the nurses desk'),
    ('Laboratory', 'Sample labelling reminder', 'Two identifiers on every tube.'),
    ('Pharmacy', 'Stock take this Saturday', 'Pharmacy closes at 1pm for count.'),
    ('Administration', 'Insurance claims cut-off', 'Submit all claims by the 25th.'),
    ('Clinical Updates', 'CME: managing pneumonia', 'Thursday 2pm, OPD conference room'),
    ('General', 'Welcome our new nurses', 'Please make them feel at home.'),
    ('General', 'Water interruption Sunday', 'Tanks will be filled on Saturday.'),
]

COMMENTS = ['Noted, thank you.', 'Will be there.', 'Received with thanks.',
            'Can we move it to 5pm?', 'Well done team!', 'Please share the slides.']


def announcements_script(world, first, last):
    from announcement.models import Announcement, Channel, Comment

    rng = world.rng
    authors = world.staff['sysadmin'] + world.staff['senior_nurse'] + world.staff['pharmacist'][:1] \
        + world.staff['labtech'][:1] + world.staff['doctor'][:2]
    readers = world.staff['nurse'] + world.staff['doctor'] + world.staff['receptionist']
    span = max((last - first).days, 1)
    for index, (channel_name, title, content) in enumerate(ANNOUNCEMENTS):
        day = first + _dt.timedelta(days=int(span * (index + 0.5) / len(ANNOUNCEMENTS)))
        yield _at(day, rng.randint(8, 16), rng.randint(0, 59))
        channel = Channel.objects.get_or_create(name=channel_name)[0]
        announcement = Announcement.objects.create(
            title=title[:45], content=content[:45], created_by=rng.choice(authors), channel=channel)
        for _ in range(rng.randint(0, 3)):
            Comment.objects.create(
                title='Re: ' + title[:40], content=rng.choice(COMMENTS),
                created_by=rng.choice(readers), announcement=announcement)
        world.counts['announcements'] += 1


def public_requests_script(world, first, last):
    """What arrives through the public site: bookings, lab requests, prescriptions, feedback."""
    from inventory.models import Item
    from laboratory.models import LabTestProfile, PublicLabTestRequest
    from patient.models import Patient, PrescribedDrug, PublicAppointment
    from pharmacy.models import DrugsFeedback, PublicPrescriptionRequest

    rng = world.rng
    appointment_items = list(world.consultations.values())
    profiles = list(LabTestProfile.objects.all()[:8])
    patients_with_accounts = list(Patient.objects.filter(user__isnull=False)[:12])
    span = max((last - first).days, 1)

    for index in range(14):
        day = first + _dt.timedelta(days=int(span * (index + 0.5) / 14))
        yield _at(day, rng.randint(7, 21), rng.randint(0, 59))
        first_name, second_name = rng.choice(KIN_NAMES), rng.choice(['Mwangi', 'Otieno', 'Wafula', 'Kilonzo'])
        when = world.clock.now + _dt.timedelta(days=rng.randint(1, 14), hours=rng.randint(0, 6))
        status = 'pending' if when > world.clock.wall else rng.choice(['confirmed', 'confirmed', 'cancelled'])
        PublicAppointment.objects.create(
            item=rng.choice(appointment_items) if appointment_items else None,
            first_name=first_name, second_name=second_name,
            email=f"{first_name}.{second_name}{index}@example.com".lower(),
            phone_number=f"07{rng.randint(10000000, 99999999)}",
            date_of_birth=_real_date(rng.randint(1960, 2004), rng.randint(1, 12), rng.randint(1, 28)),
            gender=rng.choice(['M', 'F']), appointment_date_time=when, status=status,
            reason=rng.choice(['General check-up', 'Follow-up visit', 'Dental review', 'Child immunisation']))
        world.counts['public appointments'] += 1

        if profiles and index % 2 == 0:
            collected = rng.random() < 0.5
            PublicLabTestRequest.objects.create(
                appointment_date=(when.astimezone(world.local)).date(),
                status='confirmed' if collected else 'pending',
                test_profile=rng.choice(profiles), sample_collected=collected,
                sample_id=f"PUB-{index:04d}" if collected else None)
            world.counts['public lab requests'] += 1

        if patients_with_accounts and index % 3 == 0:
            patient = rng.choice(patients_with_accounts)
            PublicPrescriptionRequest.objects.create(
                patient=patient, status=rng.choice(['pending', 'confirmed', 'cancelled']))
            world.counts['public prescription requests'] += 1

        dispensed = list(PrescribedDrug.objects.filter(is_dispensed=True).values_list('item_id', flat=True)[:30])
        if patients_with_accounts and dispensed and index % 2 == 1:
            patient = rng.choice(patients_with_accounts)
            DrugsFeedback.objects.create(
                user=patient.user, drug=Item.objects.get(pk=rng.choice(dispensed)),
                feedback=rng.choice([
                    'Worked well, symptoms gone in three days.',
                    'Mild nausea but manageable.',
                    'Easy to take, no side effects.',
                    'Made me drowsy, took it at night instead.']))
            world.counts['drug feedback'] += 1


QUOTE_CUSTOMERS = [
    ('Safaricom Staff Wellness', 'wellness@example.co.ke', 'Jane Mutiso'),
    ('Nairobi Academy Sick Bay', 'nurse@example.ac.ke', 'Peter Kimani'),
    ('Kenya Power Staff Clinic', 'clinic@example.co.ke', 'Alice Ndungu'),
]


def quotations_script(world, first, last):
    from inventory.models import Quotation, QuotationCustomer, QuotationItem

    rng = world.rng
    sellable = [i for i in world.drugs.values() if i.current_sale_price]
    span = max((last - first).days, 1)
    for index, (name, email, contact) in enumerate(QUOTE_CUSTOMERS * 2):
        day = first + _dt.timedelta(days=int(span * (index + 0.5) / 6))
        yield _at(day, rng.randint(9, 16), rng.randint(0, 59))
        customer = QuotationCustomer.objects.get_or_create(
            name=name, defaults={'email': email, 'contact_person': contact,
                                 'phone': f"020{rng.randint(1000000, 9999999)}",
                                 'address': 'Nairobi'})[0]
        status = rng.choice(['pending', 'approved', 'approved', 'rejected'])
        quotation = Quotation.objects.create(
            status=status, created_by=world.admin, customer2=customer,
            approved_by=world.admin if status == 'approved' else None)
        for item in rng.sample(sellable, min(4, len(sellable))):
            QuotationItem.objects.create(
                quotation=quotation, item=item, quantity=rng.choice([100, 200, 500]),
                quotation_price=(Decimal(item.current_sale_price) * Decimal('0.9')).quantize(Decimal('0.01')))
        world.counts['quotations'] += 1


# ---------------------------------------------------------------------------
# Putting it together
# ---------------------------------------------------------------------------

def _arrivals(world, patients, children, first, last):
    """Who comes in and when: busier on weekdays, quieter at the weekend."""
    rng = world.rng
    weights = [s['weight'] for s in SCENARIOS]
    child_scenarios = [s for s in SCENARIOS if s.get('child_ok')]
    scripts = []
    for day in _days(first, last):
        count = rng.randint(4, 7) if day.weekday() < 5 else (rng.randint(2, 3) if day.weekday() == 5 else rng.randint(1, 2))
        for _ in range(count):
            arrival = _at(day, 8, 0) + _dt.timedelta(minutes=rng.randint(0, 510))
            if children and rng.random() < 0.15:
                patient, scenario = rng.choice(children), rng.choice(child_scenarios)
            else:
                patient, scenario = rng.choice(patients), rng.choices(SCENARIOS, weights=weights)[0]
            scripts.append((visit_script(world, patient, scenario, arrival),
                            f"{scenario['key']} visit, {patient.first_name} {patient.second_name}, {day}"))
    return scripts


def seed_demo_world(clock, staff, days=DEMO_DAYS):
    """
    Standing set-up, then the simulated period itself. Returns the counts and
    the list of anything the real rules refused.
    """
    from patient.models import Patient

    rng = random.Random(DEMO_SEED)

    print("\n\U0001fa7a Setting up the clinic for its demo history...")
    accounts = seed_chart_of_accounts()
    seed_lab_setup()
    seed_pharmacy_reference()
    seed_patient_details(rng)
    seed_ward_nurses(staff)

    world = DemoWorld(clock, rng, staff, accounts)

    local_today = clock.wall.astimezone(world.local).date()
    first = local_today - _dt.timedelta(days=days)
    last = local_today

    patients = list(Patient.objects.prefetch_related('insurances').order_by('id'))
    children = [p for p in patients if _age(p) < 14]
    adults = [p for p in patients if _age(p) >= 14] or patients

    scripts = _arrivals(world, adults, children, first, last)
    scripts += [
        (procurement_script(world, world.pharmacy, staff['pharmacist'][0], first, last), 'pharmacy reorders'),
        (procurement_script(world, world.lab, staff['labtech'][0], first, last), 'lab reorders'),
        (lab_topup_script(world, first, last), 'lab top-ups'),
        (supplier_payment_script(world, first, last), 'supplier payments'),
        (insurer_settlement_script(world, first, last), 'insurer settlements'),
        (archive_housekeeping_script(world, first, last), 'archive housekeeping'),
        (wastage_script(world, first, last), 'wastage'),
        (stock_take_script(world, 45), 'stock take 45 days ago'),
        (stock_take_script(world, 15), 'stock take 15 days ago'),
        (stock_take_script(world, 0, post=False), 'stock take in progress'),
        (price_change_script(world, 20), 'price change'),
        (announcements_script(world, first, last), 'announcements'),
        (public_requests_script(world, first, last), 'public requests'),
        (quotations_script(world, first, last), 'quotations'),
    ]

    print(f"   Simulating {days} days: {first:%d %b} to {last:%d %b}, "
          f"{sum(1 for _, label in scripts if 'visit' in label)} visits booked in")
    run_scripts(clock, world, scripts)

    # What celery-beat does every half hour, which it could not do while the
    # history was being written: retire the holds prescriptions put on stock.
    from inventory.services import stock as stock_service
    world.counts['stale reservations expired'] = stock_service.expire_stale_reservations()

    for label, count in sorted(world.counts.items()):
        print(f"   - {label}: {count}")
    for reason in world.refused[:20]:
        print(f"   ! refused, rolled back: {reason}")
    if len(world.refused) > 20:
        print(f"   ! ...and {len(world.refused) - 20} more")

    return {'counts': dict(world.counts), 'refused': list(world.refused)}


__all__ = [
    'ADMIN_EMAIL', 'ADMIN_PASSWORD', 'DEMO_DAYS', 'DEMO_STAFF', 'STAFF_PASSWORD',
    'ClockDate', 'ClockDatetime', 'DemoClock', 'DemoRefused', 'DemoWorld',
    'demo_start', 'run_scripts', 'seed_demo_world', 'seed_staff', 'staff_email',
]
