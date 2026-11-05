"""
Transfers between the facility's own accounts: the money moves, the total
doesn't, and the record stays.
"""
from datetime import timedelta
from decimal import Decimal

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from billing.models import AccountTransfer, MainAccount, SubAccount
from billing.transfers import TransferError, make_transfer, reverse_transfer


def api(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def equity(db):
    bank = MainAccount.objects.create(name='Bank Accounts')
    return SubAccount.objects.create(main_account=bank, name='Equity', opening_bal=Decimal('20000.00'))


@pytest.fixture
def mpesa(db):
    mobile = MainAccount.objects.create(name='Mobile Money')
    return SubAccount.objects.create(main_account=mobile, name='Mpesa', opening_bal=Decimal('500.00'))


def transfer_10k(equity, mpesa, **kwargs):
    return make_transfer(from_account=equity, to_account=mpesa, amount=Decimal('10000.00'), **kwargs)


def test_a_transfer_moves_the_money_between_balances(equity, mpesa):
    transfer_10k(equity, mpesa)

    assert equity.balance == Decimal('10000.00')
    assert mpesa.balance == Decimal('10500.00')


def test_the_whole_balance_can_be_transferred(equity, mpesa):
    make_transfer(from_account=equity, to_account=mpesa, amount=Decimal('20000.00'))

    assert equity.balance == 0


def test_a_transfer_cant_take_more_than_the_account_has(equity, mpesa):
    with pytest.raises(TransferError, match='only has'):
        make_transfer(from_account=equity, to_account=mpesa, amount=Decimal('20000.01'))

    assert not AccountTransfer.objects.exists()


def test_an_account_cant_transfer_to_itself(equity):
    with pytest.raises(TransferError, match='different account'):
        make_transfer(from_account=equity, to_account=equity, amount=Decimal('1.00'))


@pytest.mark.parametrize('amount', [Decimal('0'), Decimal('-5.00')])
def test_the_amount_must_be_positive(equity, mpesa, amount):
    with pytest.raises(TransferError, match='more than zero'):
        make_transfer(from_account=equity, to_account=mpesa, amount=amount)


def test_a_transfer_defaults_to_today_and_can_be_backdated(equity, mpesa):
    today = timezone.localdate()
    yesterday = today - timedelta(days=1)

    assert transfer_10k(equity, mpesa, transfer_date=None).transfer_date == today
    assert make_transfer(
        from_account=equity, to_account=mpesa, amount=Decimal('1.00'), transfer_date=yesterday,
    ).transfer_date == yesterday


def test_a_transfer_cant_be_dated_in_the_future(equity, mpesa):
    with pytest.raises(TransferError, match='future'):
        transfer_10k(equity, mpesa, transfer_date=timezone.localdate() + timedelta(days=1))


@pytest.mark.parametrize('inactive', ['source', 'destination'])
def test_an_inactive_account_cant_take_part(equity, mpesa, inactive):
    account = equity if inactive == 'source' else mpesa
    account.active = False
    account.save()

    with pytest.raises(TransferError, match='not active'):
        transfer_10k(equity, mpesa)


def test_reversing_puts_the_money_back_and_keeps_both_records(equity, mpesa):
    original = transfer_10k(equity, mpesa)

    reversal = reverse_transfer(original)

    assert equity.balance == Decimal('20000.00')
    assert mpesa.balance == Decimal('500.00')
    assert reversal.reversal_of == original
    assert reversal.from_account == mpesa and reversal.to_account == equity
    assert AccountTransfer.objects.count() == 2


def test_a_transfer_can_only_be_reversed_once(equity, mpesa):
    original = transfer_10k(equity, mpesa)
    reverse_transfer(original)

    with pytest.raises(TransferError, match='already been reversed'):
        reverse_transfer(original)


def test_a_reversal_cant_itself_be_reversed(equity, mpesa):
    reversal = reverse_transfer(transfer_10k(equity, mpesa))

    with pytest.raises(TransferError, match='already a reversal'):
        reverse_transfer(reversal)


def test_a_transfer_cant_be_reversed_once_the_money_has_moved_on(equity, mpesa):
    original = transfer_10k(equity, mpesa)
    make_transfer(from_account=mpesa, to_account=equity, amount=Decimal('10000.00'))

    with pytest.raises(TransferError, match='only has'):
        reverse_transfer(original)


def test_only_an_admin_can_make_a_transfer(equity, mpesa, nurse, admin_user):
    payload = {'from_account': equity.id, 'to_account': mpesa.id, 'amount': '10000.00'}

    assert api(nurse).post('/billing/account-transfers/', payload, format='json').status_code == 403
    assert not AccountTransfer.objects.exists()

    response = api(admin_user).post('/billing/account-transfers/', payload, format='json')

    assert response.status_code == 201
    assert response.data['from_account_name'] == 'Equity'
    assert response.data['to_account_name'] == 'Mpesa'
    assert response.data['created_by'] == admin_user.id


def test_a_refused_transfer_answers_with_the_reason(equity, mpesa, admin_user):
    response = api(admin_user).post(
        '/billing/account-transfers/',
        {'from_account': equity.id, 'to_account': mpesa.id, 'amount': '20000.01'},
        format='json')

    assert response.status_code == 400
    assert 'only has' in response.data['detail']


def test_only_an_admin_can_reverse_a_transfer(equity, mpesa, nurse, admin_user):
    original = transfer_10k(equity, mpesa)
    url = f'/billing/account-transfers/{original.id}/reverse/'

    assert api(nurse).post(url).status_code == 403

    response = api(admin_user).post(url)

    assert response.status_code == 201
    assert response.data['reversal_of_reference'] == original.reference


def test_the_transfer_list_shows_what_reversed_what(equity, mpesa, nurse):
    original = transfer_10k(equity, mpesa)
    reversal = reverse_transfer(original)

    response = api(nurse).get('/billing/account-transfers/')

    assert response.status_code == 200
    rows = {row['id']: row for row in response.data}
    assert rows[original.id]['reversed_by_reference'] == reversal.reference
    assert rows[reversal.id]['reversal_of_reference'] == original.reference


def test_the_transfer_list_filters_by_date(equity, mpesa, nurse):
    today = timezone.localdate()
    make_transfer(
        from_account=equity, to_account=mpesa, amount=Decimal('1.00'),
        transfer_date=today - timedelta(days=5))
    recent = make_transfer(from_account=equity, to_account=mpesa, amount=Decimal('2.00'))

    response = api(nurse).get(
        '/billing/account-transfers/',
        {'transfer_date__gte': (today - timedelta(days=1)).isoformat()})

    assert [row['id'] for row in response.data] == [recent.id]


def test_transfers_cant_be_edited_or_deleted(equity, mpesa, admin_user):
    url = f'/billing/account-transfers/{transfer_10k(equity, mpesa).id}/'
    client = api(admin_user)

    assert client.patch(url, {'amount': '1.00'}, format='json').status_code == 405
    assert client.delete(url).status_code == 405


def test_an_account_with_transfers_cant_be_deleted(equity, mpesa, admin_user):
    transfer_10k(equity, mpesa)
    client = api(admin_user)

    assert client.delete(f'/billing/sub-accounts/{equity.id}/').status_code == 409
    assert client.delete(f'/billing/main-accounts/{equity.main_account_id}/').status_code == 409
    assert SubAccount.objects.filter(pk=equity.pk).exists()


def test_the_accounting_summary_counts_both_sides(equity, mpesa, admin_user):
    transfer_10k(equity, mpesa)

    data = api(admin_user).get('/billing/accounting-summary/').data

    totals = {row['sub_account']: row for row in data['sub_account_totals']}
    assert totals['Equity']['total_credited'] == 10000
    assert totals['Equity']['net_balance'] == -10000
    assert totals['Mpesa']['total_debited'] == 10000
    assert totals['Mpesa']['net_balance'] == 10000
    assert {row['action'] for row in data['transactions']} == {'Transfer In', 'Transfer Out'}


def test_the_accounting_summary_respects_its_dates(equity, mpesa, admin_user):
    today = timezone.localdate()
    transfer_10k(equity, mpesa, transfer_date=today - timedelta(days=5))

    data = api(admin_user).get(
        '/billing/accounting-summary/',
        {'start_date': (today - timedelta(days=1)).isoformat()}).data

    assert data['transactions'] == []
