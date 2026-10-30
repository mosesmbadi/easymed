import json

import pytest
from django.core.exceptions import ValidationError as DjangoValidationError

from inventory.models import Requisition, RequisitionItem, Item, Supplier
from inventory.serializers import RequisitionSerializer
from inventory.services import stock as stock_service

@pytest.fixture
def item2():
    return Item.objects.create(
        name="Test Item 2",
        desc="Test Description 2",
        category="General",
        units_of_measure="Unit",
        vat_rate=16.0,
        item_code="AyiC123",
    )

@pytest.fixture
def inventory2(item2, department):
    """Opening stock for item2, posted through the ledger."""
    return stock_service.receive(
        item=item2,
        department=department,
        quantity=10,
        unit_cost=10.0,
        lot_number="LOT-001",
    )


@pytest.mark.django_db
def test_requisition_successful_creation(requisition, item, item2, inventory2, inventory, supplier, authenticated_client, department):
    requisition_item1 = RequisitionItem.objects.create(
        quantity_requested=10,
        item=item,
        preferred_supplier=supplier,
        requisition=requisition
    )

    requisition_item2 = RequisitionItem.objects.create(
        quantity_requested=30,
        item=item2,  
        preferred_supplier=supplier,
        requisition=requisition
    )

    requisition.refresh_from_db()
    response = authenticated_client.get(f'/inventory/requisition/{requisition.id}/')
    assert response.status_code == 200
    assert len(response.data['items']) == 2  # Check if two items are returned in the response

@pytest.mark.django_db
def test_requsition_item_with_mising_supplier(requisition, user, supplier, inventory, authenticated_client, department, item):
    """
    Test that if a RequisitionItem is created without a preferred supplier,
    the first supplier in the database is automatically assigned via the serializer.
    """
    default_supplier = Supplier.objects.first()
    requisition_data = {
        "requested_by": user.id,
        "department": department.id,
        "items":[
            {
                "quantity_requested": 10,
                "item": item.id,  
                "requisition": requisition.id  
                # No 'preferred_supplier' provided (should default to the first supplier)
            }
        ]
    }

    serializer = RequisitionSerializer(data=requisition_data)
    assert serializer.is_valid(), serializer.errors  

    requisition = serializer.save()

    requisition.refresh_from_db()

    response = authenticated_client.get(f'/inventory/requisition/{requisition.id}/')
    assert response.status_code == 200
    # preferred_supplier reads back as the pk -- the purchase-order screen posts
    # it straight back as `supplier`. The name comes through its own field.
    assert response.data['items'][0]['preferred_supplier'] == default_supplier.id
    assert response.data['items'][0]['preferred_supplier_name'] == default_supplier.official_name


@pytest.mark.django_db
def test_creating_requisition_with_same_item_same_supplier(
    requisition, item, user, inventory, supplier, department, authenticated_client
):
    """
    Items with the same supplier and item should be combined into a single RequisitionItem.
    """
    supplier2 = Supplier.objects.create(
        official_name="Supplier 2", common_name="Supplier 2"
    )

    requisition_data = {
        "requested_by": user.id,
        "department": department.id,
        "items": [
            {
                "quantity_requested": 10,
                "item": item.id,
                "requisition": requisition.id,
            },
            {
                "quantity_requested": 10,
                "item": item.id,
                "requisition": requisition.id,
            },
            {
                "quantity_requested": 10,
                "item": item.id,
                "requisition": requisition.id,
                "preferred_supplier": supplier2.id,
            },
        ],
    }

    serializer = RequisitionSerializer(data=requisition_data)
    assert serializer.is_valid(), serializer.errors

    requisition = serializer.save()
    requisition.refresh_from_db()

    requisition_items = requisition.items.filter(requisition=requisition)

    response = authenticated_client.get(f'/inventory/requisition/{requisition.id}/')

    assert response.status_code == 200
    assert len(response.data['items']) == 2  # First two items should be combined

    # Cost per base unit now comes from the ledger's weighted average, not from
    # whichever inventory row happened to sort first.
    total_amount_requested = sum(
        line.quantity_requested * (line.item.current_cost or 0)
        for line in requisition_items
    )

    assert total_amount_requested == 300.00

@pytest.mark.django_db
def test_status_follows_the_approvals(requisition):
    """Status is read off the approval flags, not set by hand."""
    assert requisition.status == Requisition.Status.PENDING

    requisition.department_approved = True
    requisition.save()
    assert requisition.status == Requisition.Status.DEPARTMENT_APPROVED

    requisition.procurement_approved = True
    requisition.save()
    assert requisition.status == Requisition.Status.PROCUREMENT_APPROVED


@pytest.mark.django_db
def test_status_follows_how_many_lines_are_ordered(
    requisition, item, item2, supplier, django_capture_on_commit_callbacks
):
    """
    Ordering the lines is what moves an approved requisition along.

    The status is refreshed from an on_commit hook -- deliberately, so a
    purchase order that rolls back does not leave the status advanced -- which
    means these tests have to run the callbacks themselves.
    """
    requisition.department_approved = True
    requisition.procurement_approved = True
    requisition.save()

    with django_capture_on_commit_callbacks(execute=True):
        first = RequisitionItem.objects.create(
            requisition=requisition, item=item, preferred_supplier=supplier,
            quantity_requested=5, quantity_approved=5)
        second = RequisitionItem.objects.create(
            requisition=requisition, item=item2, preferred_supplier=supplier,
            quantity_requested=5, quantity_approved=5)

    requisition.refresh_from_db()
    assert requisition.status == Requisition.Status.PROCUREMENT_APPROVED

    with django_capture_on_commit_callbacks(execute=True):
        first.ordered = True
        first.save()
    requisition.refresh_from_db()
    assert requisition.status == Requisition.Status.PARTIALLY_ORDERED

    with django_capture_on_commit_callbacks(execute=True):
        second.ordered = True
        second.save()
    requisition.refresh_from_db()
    assert requisition.status == Requisition.Status.ORDERED

    # Derived, not latched: undoing the order walks the status back.
    with django_capture_on_commit_callbacks(execute=True):
        second.ordered = False
        second.save()
    requisition.refresh_from_db()
    assert requisition.status == Requisition.Status.PARTIALLY_ORDERED


@pytest.mark.django_db
def test_lines_awaiting_approval_do_not_count_as_orderable(
    requisition, item, item2, supplier, django_capture_on_commit_callbacks
):
    """A line approved for zero can never be ordered, so it must not hold the
    requisition open forever."""
    requisition.department_approved = True
    requisition.procurement_approved = True
    requisition.save()

    with django_capture_on_commit_callbacks(execute=True):
        RequisitionItem.objects.create(
            requisition=requisition, item=item, preferred_supplier=supplier,
            quantity_requested=5, quantity_approved=5, ordered=True)
        declined = RequisitionItem.objects.create(
            requisition=requisition, item=item2, preferred_supplier=supplier,
            quantity_requested=5)

    # A new line always starts approved for what was requested, so procurement
    # declining it is an edit down to zero afterwards.
    with django_capture_on_commit_callbacks(execute=True):
        declined.quantity_approved = 0
        declined.save()

    requisition.refresh_from_db()
    assert requisition.status == Requisition.Status.ORDERED


@pytest.mark.django_db
def test_status_is_not_writable_through_the_api(requisition, authenticated_client):
    """It is reported, never accepted -- otherwise it drifts from the facts."""
    response = authenticated_client.patch(
        f'/inventory/requisition/{requisition.id}/',
        data=json.dumps({'status': Requisition.Status.ORDERED}),
        content_type='application/json')

    assert response.status_code == 200
    requisition.refresh_from_db()
    assert requisition.status == Requisition.Status.PENDING


@pytest.mark.django_db
def test_deleting_a_requisition_does_not_trip_the_status_signal(
    requisition, item, supplier, django_capture_on_commit_callbacks
):
    """Cascade delete fires post_delete for each line after the parent row has
    gone; refreshing its status must not blow up."""
    RequisitionItem.objects.create(
        requisition=requisition, item=item, preferred_supplier=supplier,
        quantity_requested=5, quantity_approved=5)

    with django_capture_on_commit_callbacks(execute=True):
        requisition.delete()  # must not raise


@pytest.mark.django_db
def test_rejecting_closes_the_requisition_and_records_who_and_why(requisition, user):
    requisition.close(Requisition.Status.REJECTED, reason="No budget", by=user)

    requisition.refresh_from_db()
    assert requisition.status == Requisition.Status.REJECTED
    assert requisition.is_closed
    assert requisition.closed_reason == "No budget"
    assert requisition.closed_by == user
    assert requisition.closed_at is not None


@pytest.mark.django_db
def test_a_closed_requisition_stays_closed_through_later_saves(requisition, user):
    """The terminal state has to outrank the derivation or approving it later
    would quietly bring a rejected requisition back to life."""
    requisition.close(Requisition.Status.CANCELLED, reason="Ordered elsewhere", by=user)

    requisition.department_approved = True
    requisition.procurement_approved = True
    requisition.save()

    requisition.refresh_from_db()
    assert requisition.status == Requisition.Status.CANCELLED


@pytest.mark.django_db
def test_reopening_returns_it_to_where_it_had_got_to(requisition, user):
    requisition.department_approved = True
    requisition.save()
    requisition.close(Requisition.Status.REJECTED, reason="Mistake", by=user)
    assert requisition.status == Requisition.Status.REJECTED

    requisition.reopen()

    requisition.refresh_from_db()
    assert requisition.status == Requisition.Status.DEPARTMENT_APPROVED
    assert not requisition.is_closed
    assert requisition.closed_reason == ''
    assert requisition.closed_by is None


@pytest.mark.django_db
def test_cannot_close_a_requisition_twice(requisition, user):
    requisition.close(Requisition.Status.REJECTED, reason="No budget", by=user)

    with pytest.raises(DjangoValidationError):
        requisition.close(Requisition.Status.CANCELLED, reason="again", by=user)


@pytest.mark.django_db
def test_cannot_close_once_a_line_has_been_ordered(requisition, item, supplier, user):
    """A purchase order is a commitment to a supplier; cancelling the
    requisition underneath it would leave that commitment unexplained."""
    RequisitionItem.objects.create(
        requisition=requisition, item=item, preferred_supplier=supplier,
        quantity_requested=5, quantity_approved=5, ordered=True)

    with pytest.raises(DjangoValidationError):
        requisition.close(Requisition.Status.CANCELLED, reason="too late", by=user)


@pytest.mark.django_db
def test_cannot_reopen_something_that_is_not_closed(requisition):
    with pytest.raises(DjangoValidationError):
        requisition.reopen()


@pytest.mark.django_db
def test_close_rejects_a_status_that_is_not_terminal(requisition, user):
    with pytest.raises(DjangoValidationError):
        requisition.close(Requisition.Status.ORDERED, reason="nope", by=user)


@pytest.mark.django_db
def test_reject_and_cancel_endpoints(requisition, authenticated_client):
    response = authenticated_client.post(
        f'/inventory/requisition/{requisition.id}/reject/',
        data=json.dumps({'reason': 'Budget not available'}),
        content_type='application/json')

    assert response.status_code == 200
    assert response.data['status'] == Requisition.Status.REJECTED
    assert response.data['closed_reason'] == 'Budget not available'
    assert response.data['is_closed'] is True

    # Closing an already closed requisition is a 400, not a crash.
    again = authenticated_client.post(
        f'/inventory/requisition/{requisition.id}/cancel/',
        data=json.dumps({'reason': 'also this'}),
        content_type='application/json')
    assert again.status_code == 400

    reopened = authenticated_client.post(
        f'/inventory/requisition/{requisition.id}/reopen/',
        data=json.dumps({}), content_type='application/json')
    assert reopened.status_code == 200
    assert reopened.data['status'] == Requisition.Status.PENDING


@pytest.mark.django_db
def test_closure_fields_cannot_be_patched_directly(requisition, user, authenticated_client):
    requisition.close(Requisition.Status.REJECTED, reason="No budget", by=user)

    response = authenticated_client.patch(
        f'/inventory/requisition/{requisition.id}/',
        data=json.dumps({'closed_as': None, 'closed_reason': 'tampered',
                         'status': Requisition.Status.ORDERED}),
        content_type='application/json')

    assert response.status_code == 200
    requisition.refresh_from_db()
    assert requisition.status == Requisition.Status.REJECTED
    assert requisition.closed_reason == "No budget"


@pytest.mark.django_db
def test_a_service_item_cannot_be_requisitioned(requisition, user, department, supplier):
    """
    Caught at the requisition, not at goods receipt.

    A service item used to survive the whole chain -- requisition, approval,
    purchase order, invoice, GRN -- and only fail on the last step, leaving all
    that paperwork behind with no stock to show for it.
    """
    service = Item.objects.create(
        name="Consultation Fee", desc="Service", category="Lab Test",
        units_of_measure="test", item_code="SVC-REQ-1")
    assert service.is_stock_tracked is False

    serializer = RequisitionSerializer(data={
        "requested_by": user.id,
        "department": department.id,
        "items": [{"quantity_requested": 5, "item": service.id,
                   "preferred_supplier": supplier.id}],
    })

    assert not serializer.is_valid()
    assert 'cannot be requisitioned' in str(serializer.errors)


@pytest.mark.django_db
def test_correcting_a_miscategorised_item_makes_it_stockable_again():
    """Filing a physical item as a service by mistake must be undoable."""
    item = Item.objects.create(
        name="Gloves", desc="Box of gloves", category="Lab Test",
        units_of_measure="pairs", item_code="GLV-001")
    assert item.is_stock_tracked is False

    item.category = "LabConsumable"
    item.save()
    item.refresh_from_db()

    assert item.is_stock_tracked is True
