"""
Who is allowed to move stock inwards.

Receiving goods, entering opening stock and adjusting a balance all mint
inventory out of nothing as far as the ledger is concerned, so they are held
to a tighter rule than the rest of the module: a sysadmin, the head of the
department the stock lands in, or somebody granted the right by hand.

Reading stock stays open to any authenticated user -- a nurse needs to see
whether there are syringes without being able to invent some.
"""

from rest_framework.permissions import SAFE_METHODS, BasePermission

from customuser.models import CustomUser
from inventory.models import Department


def _department_ids_from(payload):
    """
    Every department id a write payload is trying to touch.

    Receipts name `department`, transfers name `to_department` (the inward
    leg -- the outward leg takes stock away, which this rule is not about),
    and a bulk goods receipt carries them on its lines.
    """
    if not isinstance(payload, dict):
        return set()

    ids = set()
    for key in ('department', 'to_department'):
        value = payload.get(key)
        if value not in (None, ''):
            ids.add(str(value))

    for line in payload.get('items') or payload.get('lines') or []:
        if isinstance(line, dict):
            value = line.get('department')
            if value not in (None, ''):
                ids.add(str(value))

    return ids


def _payload_department_ids(request):
    '''
    Reading the body can itself fail -- an unparseable content type raises
    rather than returning nothing -- and a permission check is the wrong place
    to turn that into a 415. Fall back to "no department named" and let the
    view answer for the request shape.
    '''
    try:
        return _department_ids_from(request.data)
    except Exception:
        return set()


def can_manage_inventory(user, department_ids=()):
    """
    True when `user` may bring stock in.

    A departmental head is trusted for their own department only; the other
    two routes are not department-scoped.
    """
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser or user.role == CustomUser.SYS_ADMIN:
        return True
    if getattr(user, 'can_manage_inventory', False):
        return True

    headed = Department.objects.filter(head=user)
    if not headed.exists():
        return False
    if not department_ids:
        # No department named in the payload: a head still qualifies, and the
        # service layer resolves the default location from there.
        return True
    headed_ids = {str(pk) for pk in headed.values_list('id', flat=True)}
    return set(department_ids).issubset(headed_ids)


class CanManageInventory(BasePermission):
    """Read for anyone signed in; inward writes for the three trusted routes."""

    message = (
        "Only a systems administrator, the departmental head, or a user granted "
        "inventory rights may update stock inwards."
    )

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return bool(request.user and request.user.is_authenticated)
        return can_manage_inventory(request.user, _payload_department_ids(request))

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return bool(request.user and request.user.is_authenticated)
        department_id = getattr(obj, 'department_id', None)
        return can_manage_inventory(
            request.user, {str(department_id)} if department_id else set())


__all__ = ['CanManageInventory', 'can_manage_inventory']
