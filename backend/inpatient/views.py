from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.response import Response

from authperms.permissions import IsDoctorUser, IsNurseUser

from .filters import WardFilter
from .models import (Bed, PatientAdmission, PatientDischarge, Ward,
                     WardNurseAssignment)
from .serializers import (BedSerializer, PatientAdmissionSerializer,
                          PatientDischargeSerializer,
                          WardNurseAssignmentSerializer, WardSerializer)


class PatientAdmissionViewSet(viewsets.ModelViewSet):
    queryset = PatientAdmission.objects.all()
    serializer_class = PatientAdmissionSerializer
    permission_classes = [IsDoctorUser]

    def get_queryset(self):
        # Optional: Restrict nurses to see only patients in their wards (later enhancement)
        return super().get_queryset()

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            bed = serializer.validated_data["bed"]
            bed.status = "occupied"
            bed.save()
            serializer.save(admitted_by=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response(
                {"Cannot admitt patient": str(e)}, status=status.HTTP_400_BAD_REQUEST
            )


class WardViewSet(viewsets.ModelViewSet):
    queryset = Ward.objects.all()
    serializer_class = WardSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = WardFilter


class BedViewSet(viewsets.ModelViewSet):
    queryset = Bed.objects.all()
    serializer_class = BedSerializer


class PatientDischargeViewset(viewsets.ModelViewSet):
    queryset = PatientDischarge.objects.all()
    serializer_class = PatientDischargeSerializer
    permission_classes = [IsDoctorUser]

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """
        Create a discharge record for a patient admission.
        """
        admission_id = kwargs.get("admission_pk")
        if not admission_id:
            return Response(
                {"error": "Admission ID is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            admission = PatientAdmission.objects.get(id=admission_id)

            if admission.discharged_at:
                return Response(
                    {"error": "Patient is already discharged."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            serializer = self.get_serializer(
                data={
                    "admission": admission.id,
                    "discharge_notes": request.data.get("discharge_notes", ""),
                }
            )
            serializer.is_valid(raise_exception=True)
            discharge = serializer.save(discharged_by=request.user)

            admission.discharged_at = discharge.discharged_at
            admission.save()

            bed = admission.bed
            if bed:
                bed.status = "available"
                bed.save()

            response_data = serializer.data
            response_data["message"] = "Patient discharged successfully"
            return Response(response_data, status=status.HTTP_201_CREATED)

        except PatientAdmission.DoesNotExist:
            return Response(
                {"error": "Admission not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            return Response(
                {"error": f"An error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class WardNurseAssignmentViewSet(viewsets.ModelViewSet):
    queryset = WardNurseAssignment.objects.all()
    serializer_class = WardNurseAssignmentSerializer
    permission_classes = [IsDoctorUser]

    def get_queryset(self):
        user = self.request.user
        if user:
            return self.queryset.filter(assigned_by=user)
        return self.queryset.none()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            return Response(
                serializer.data, status=status.HTTP_201_CREATED, headers=headers
            )
        except Exception as e:
            return Response(
                {"error": f"cannot assign nurse to ward: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
