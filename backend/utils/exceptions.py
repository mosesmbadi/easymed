from django.db.models import ProtectedError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler


def api_exception_handler(exc, context):
    """A delete refused to keep records intact is a conflict, not a server error."""
    if isinstance(exc, ProtectedError):
        return Response(
            {"error_message": "This can't be deleted because other records depend on it."},
            status=status.HTTP_409_CONFLICT,
        )
    return exception_handler(exc, context)
