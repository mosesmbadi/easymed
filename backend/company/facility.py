"""
Which modules this tenant has, and the guard that keeps the switched-off ones
switched off.

A standalone lab has no triage, doctor or ward, so nothing should be able to
create work there -- not just have its menu hidden. The guard lives here as a
middleware rather than as a permission class on each view: the inpatient views
evaluate their own permission_classes with any(), so a module check appended
there would quietly satisfy them and skip the role check.
"""
from django.http import JsonResponse

from .models import MODULE_LABELS, Company


# URL prefix -> module. Only writes are refused: a lab screen that reads the
# (empty) triage attached to a visit should still render. Radiology has no
# backend of its own yet, so nothing to guard there.
MODULE_URL_PREFIXES = (
    ('/inpatient/', 'inpatient'),
    ('/patients/triage/', 'triage'),
    ('/patients/consultations/', 'doctor'),
    ('/patients/referrals/', 'doctor'),
)

SAFE_METHODS = ('GET', 'HEAD', 'OPTIONS')

# AttendanceProcess.track values that hand a visit to a module.
TRACK_MODULES = {
    'reception': 'reception',
    'triage': 'triage',
    'doctor': 'doctor',
    'inpatient': 'inpatient',
}


def current_company():
    return Company.current()


def module_enabled(module):
    company = current_company()
    # No company configured yet (fresh install) means nothing is restricted.
    return company is None or company.module_enabled(module)


def module_disabled_message(module):
    label = MODULE_LABELS.get(module, module)
    return f"{label} is not switched on for this facility."


class FacilityModuleMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method not in SAFE_METHODS:
            for prefix, module in MODULE_URL_PREFIXES:
                if request.path.startswith(prefix) and not module_enabled(module):
                    return JsonResponse(
                        {'detail': module_disabled_message(module)}, status=403)
        return self.get_response(request)
