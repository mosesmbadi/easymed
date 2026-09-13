"""
The demo data goes through the stock and billing rules rather than around them.

Every run of this project starts from a fresh database seeded by
generate_dummy_data, so the demo is the first thing anyone sees of those
rules. These tests pin down the parts of it everything else depends on: the
clock that backdates it, the scheduler that runs it in time order, the staff
who log in to look at it, and the stock and prices it runs on.
"""

import datetime as dt
import zoneinfo
from collections import Counter
from decimal import Decimal

import pytest
from django.conf import settings
from django.utils import timezone

from authperms.models import Group
from billing.models import Invoice, InvoiceItem, PaymentMode
from company.models import InsuranceCompany
from customuser.management.utils.data_generators import (
    LAB_COLLECTION_STOCK,
    consumable_item_names,
    create_insurance_price_list,
    create_item_consumables,
)
from customuser.management.utils.demo_activity import (
    ADMIN_EMAIL,
    STAFF_PASSWORD,
    DemoClock,
    DemoRefused,
    run_scripts,
    seed_staff,
)
from inventory.models import Department, InsuranceItemSalePrice, Item, ItemPrice
from inventory.services import stock as stock_service
from laboratory.models import LabTestRequest, Specimen
from reports.margins import margin_by_item, margin_totals

UTC = dt.timezone.utc


@pytest.fixture
def cash_mode(db):
    return PaymentMode.objects.create(
        payment_mode='Cash', payment_category='cash', is_default=True)


@pytest.fixture
def pharmacy(db):
    return Department.objects.create(name='Pharmacy')


@pytest.fixture
def lab(db):
    return Department.objects.create(name='Lab')


def internal_supply(name, unit='pieces'):
    """A consumable, created the way the pharmacy seeding creates it."""
    return Item.objects.create(
        name=name, desc=name, category='SurgicalEquipment', category_one='Internal',
        units_of_measure=unit, item_code=f"SUP-{name[:12]}")


class _World:
    """The slice of DemoWorld the scheduler touches."""

    def __init__(self):
        self.pending = []
        self.counts = Counter()
        self.refused = []

    def refuse(self, label, exc):
        self.refused.append(label)


# ---------------------------------------------------------------------------
# The clock
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_the_demo_clock_moves_every_kind_of_timestamp(
        pharmacy, process_test_request, lab_test_profile):
    """
    timezone.now(), `default=timezone.now`, auto_now_add, DateField's own
    date.today() and the price list's localdate() all have to agree, or a
    backdated visit comes out stamped half then and half now.
    """
    moment = dt.datetime(2026, 7, 1, 10, 30, tzinfo=UTC)
    with DemoClock(moment):
        assert timezone.now() == moment
        item = Item.objects.create(
            name='Paracetamol 500mg Tablets', desc='Painkiller', category='Drug',
            units_of_measure='tablets', item_code='DRG-CLK')
        stock_service.set_sale_price(item, Decimal('10.00'))
        movement = stock_service.receive(
            item=item, department=pharmacy, quantity=5, unit_cost=1, lot_number='C1')
        request = LabTestRequest.objects.create(
            process=process_test_request, test_profile=lab_test_profile)

    local_day = moment.astimezone(zoneinfo.ZoneInfo(settings.TIME_ZONE)).date()
    assert movement.occurred_at == moment          # default=timezone.now
    assert movement.posted_at == moment            # auto_now_add
    assert request.created_on == local_day         # DateField(auto_now_add)
    assert ItemPrice.objects.get(item=item).effective_from == local_day

    # And it lets go afterwards.
    assert abs(timezone.now() - dt.datetime.now(UTC)) < dt.timedelta(minutes=1)


def test_the_clock_runs_tasks_inline_whatever_the_settings_say():
    """
    A task queued while the clock is backdated runs on the worker, at the real
    time, and before the step that queued it has committed -- the demo's
    reagent deductions all went missing that way. Celery reads its settings
    under the CELERY_ prefix first, so that is the name the clock must change.
    """
    from easymed.celery import app

    before = app.conf['CELERY_TASK_ALWAYS_EAGER']
    app.conf['CELERY_TASK_ALWAYS_EAGER'] = False     # as in base settings
    try:
        with DemoClock(dt.datetime(2026, 1, 1, tzinfo=UTC)):
            assert app.conf.task_always_eager is True
        assert app.conf.task_always_eager is False
    finally:
        app.conf['CELERY_TASK_ALWAYS_EAGER'] = before


def test_the_clock_never_runs_ahead_of_the_wall():
    """Nothing in the demo can be dated in the future."""
    clock = DemoClock(dt.datetime(2026, 1, 1, tzinfo=UTC))
    with clock:
        clock.set(clock.wall + dt.timedelta(days=3))
        assert timezone.now() == clock.wall


# ---------------------------------------------------------------------------
# The scheduler
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_steps_run_in_time_order_and_future_steps_never_run():
    """
    Interleaved visits have to post in the order they happened, or the
    ledger's running balances stop reading top to bottom. And a step due
    after the wall clock is what "still in progress today" means -- it must
    not run.
    """
    start = dt.datetime(2026, 8, 1, 8, 0, tzinfo=UTC)
    seen = []

    def script(name, offsets):
        for minutes in offsets:
            yield start + dt.timedelta(minutes=minutes)
            seen.append((name, minutes))

    clock = DemoClock(start)
    with clock:
        run_scripts(clock, _World(), [
            (script('a', [0, 30, 90]), 'a'),
            (script('b', [10, 20]), 'b'),
            (script('late', [0, 60 * 24 * 365]), 'late'),
        ])

    assert seen == [('a', 0), ('late', 0), ('b', 10), ('b', 20), ('a', 30), ('a', 90)]


@pytest.mark.django_db
def test_a_scripts_last_step_is_kept():
    """
    A script ends by running off the end of its generator. That raised
    StopIteration inside the step's transaction and rolled the step back, so
    whatever a script did last never happened -- which, for a visit, was the
    patient paying.
    """
    start = dt.datetime(2026, 8, 1, 8, 0, tzinfo=UTC)

    def script():
        yield start
        Department.objects.create(name='Written by the last step')

    clock = DemoClock(start)
    with clock:
        run_scripts(clock, _World(), [(script(), 'last')])

    assert Department.objects.filter(name='Written by the last step').exists()


@pytest.mark.django_db
def test_a_refused_step_ends_only_its_own_script():
    start = dt.datetime(2026, 8, 1, 8, 0, tzinfo=UTC)
    seen = []

    def refused():
        yield start
        raise DemoRefused('the rules said no')

    def fine():
        yield start + dt.timedelta(minutes=1)
        seen.append('fine')

    world = _World()
    clock = DemoClock(start)
    with clock:
        run_scripts(clock, world, [(refused(), 'refused'), (fine(), 'fine')])

    assert world.refused == ['refused']
    assert seen == ['fine']


# ---------------------------------------------------------------------------
# Staff
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_staff_get_the_group_their_dashboards_need():
    """
    Menus are gated on group permissions, so an account with a role and no
    group logs in to nothing. And with no administrator anywhere else in the
    project, a fresh database gets one here or nobody can log in at all.
    """
    for name in ('SYS_ADMIN', 'PATIENT', 'DOCTOR', 'PHARMACIST', 'RECEPTIONIST', 'LAB_TECH', 'NURSE'):
        Group.objects.create(name=name)

    staff = seed_staff()

    doctor = staff['doctor'][0]
    assert doctor.group.name == 'DOCTOR'
    assert doctor.is_staff
    assert doctor.check_password(STAFF_PASSWORD)

    admin = staff['sysadmin'][0]
    assert admin.is_superuser
    assert admin.email == ADMIN_EMAIL
    assert admin.group.name == 'SYS_ADMIN'


# ---------------------------------------------------------------------------
# Stock and prices the history runs on
# ---------------------------------------------------------------------------

def test_the_draw_kit_is_named_as_consumables():
    """One definition, so the seeding and the linking can never disagree."""
    assert {
        'Syringes 5ml', 'Blood Collection Tubes EDTA', 'Urine Collection Containers',
    } <= consumable_item_names()


@pytest.mark.django_db
def test_the_lab_gets_its_own_collection_stock(pharmacy, lab):
    """
    Collection issues from Lab. Seeded into Pharmacy alone, every demo draw
    would have been recorded short.
    """
    syringe = internal_supply('Syringes 5ml')
    stock_service.receive(
        item=syringe, department=pharmacy, quantity=1000, unit_cost=2, lot_number='S1')
    Specimen.objects.create(name='Blood')

    stats = create_item_consumables()

    assert stats['lab_items_stocked'] == 1
    assert stock_service.available_quantity(syringe, lab) == LAB_COLLECTION_STOCK
    assert stock_service.available_quantity(syringe, pharmacy) == 1000 - LAB_COLLECTION_STOCK


@pytest.mark.django_db
def test_the_pharmacy_keeps_at_least_half(pharmacy, lab):
    """It still needs syringes of its own for the injections it dispenses."""
    syringe = internal_supply('Syringes 5ml')
    stock_service.receive(
        item=syringe, department=pharmacy, quantity=100, unit_cost=2, lot_number='S1')
    Specimen.objects.create(name='Blood')

    create_item_consumables()

    assert stock_service.available_quantity(syringe, lab) == 50
    assert stock_service.available_quantity(syringe, pharmacy) == 50


@pytest.mark.django_db
def test_insurers_agree_the_cash_price_split_different_ways(patient):
    """
    The patient fixture carries two insurers. The first agrees the price with
    no co-pay, the second has the patient carry a tenth -- and both add back up
    to the cash price, because an insurance price is a split, not a discount.
    """
    drug = Item.objects.create(
        name='Amoxicillin 500mg Capsules', desc='Antibiotic', category='Drug',
        units_of_measure='capsules', item_code='DRG-AMX')
    stock_service.set_sale_price(drug, Decimal('100.00'))
    reagent = Item.objects.create(
        name='ALT Reagent', desc='ALT/AST', category='LabReagent',
        units_of_measure='tests', item_code='LAB-ALT')

    create_insurance_price_list()

    first, second = InsuranceCompany.objects.order_by('id')[:2]
    no_copay = InsuranceItemSalePrice.objects.get(item=drug, insurance_company=first)
    tenth = InsuranceItemSalePrice.objects.get(item=drug, insurance_company=second)

    assert (no_copay.sale_price, no_copay.co_pay) == (Decimal('100.00'), Decimal('0'))
    assert (tenth.sale_price, tenth.co_pay) == (Decimal('90.00'), Decimal('10'))
    assert not InsuranceItemSalePrice.objects.filter(item=reagent).exists()


@pytest.mark.django_db
def test_a_consultation_at_zero_cost_is_not_flagged(cash_mode, patient, pharmacy):
    """
    Every demo visit bills a consultation. It consumes nothing, and flagging
    it as "billed with no recorded cost" would make that warning fire on every
    visit and stop meaning anything.
    """
    consultation = Item.objects.create(
        name='General Appointment', desc='Consultation', category='General Appointment',
        units_of_measure='visit', item_code='APP-GEN')
    stock_service.set_sale_price(consultation, Decimal('1000.00'))
    invoice = Invoice.objects.create(patient=patient)
    line = InvoiceItem.objects.create(invoice=invoice, item=consultation, quantity=1)
    line.status = 'billed'
    line.save()

    today = timezone.localdate()
    rows = margin_by_item(today, today)

    assert rows[0]['cost_expected'] is False
    assert margin_totals(rows)['items_without_cost'] == 0
