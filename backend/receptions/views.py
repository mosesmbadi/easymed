
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response

from rest_framework.views import APIView

from rest_framework.permissions import (
    AllowAny,
    IsAdminUser,
)

# swagger
from drf_spectacular.utils import (
    extend_schema,
)


# models
from customuser.models import Doctor
from patient.models import (
    Appointment,
)

# serializers
from .serializers import (
    AssignPatientToDoctorSerializer,
)


class AssignPatientToDoctorAPIView(APIView):

    @extend_schema(
        request =AssignPatientToDoctorSerializer,
    )
    def post(self, request: Request, *args, **kwargs):
        data: dict = request.data
        serializer = AssignPatientToDoctorSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        message = serializer.assign_doctor()
        return Response({"message": message}, status=status.HTTP_200_OK)


class RegisterWalkInPatientsAPIView(APIView):
    permission_classes = ()

    def post(self, request: Request, *args, **kwargs):
        pass


class ConvertAppointmentBookingToPatientAPIView(APIView):
    def post(self, request: Request, *args, **kwargs):
        pass


class DischargePatientsAPIView(APIView):
    def post(self, request: Request, *args, **kwargs):
        pass


class PrintInvoiceAPIView(APIView):
    def post(self, request: Request, *args, **kwargs):
        pass


class PrintReceiptAPIView(APIView):
    def post(self, request: Request, *args, **kwargs):
        pass
