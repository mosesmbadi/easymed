from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend

from .models import (
    PatientAdmission, 
    PatientDischarge,
    Ward, 
    Bed,
    WardNurseAssignment
)
from .serializers import (
    PatientAdmissionSerializer,
    WardSerializer,
    BedSerializer,
    WardNurseAssignmentSerializer,
    PatientDischargeSerializer
)
from authperms.permissions import IsDoctorUser
from .filters import WardFilter


class PatientAdmissionViewSet(viewsets.ModelViewSet):
    queryset = PatientAdmission.objects.all()
    serializer_class = PatientAdmissionSerializer
    permission_classes = [IsAuthenticated, IsDoctorUser]  

    def get_queryset(self):
        # Optional: Restrict nurses to see only patients in their wards (later enhancement)
        return super().get_queryset()

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        bed = serializer.validated_data['bed']
        bed.status = 'occupied'
        bed.save()

        serializer.save(admitted_by=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class WardViewSet(viewsets.ModelViewSet):
    queryset = Ward.objects.all()
    serializer_class = WardSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_class = WardFilter

class BedViewSet(viewsets.ModelViewSet):
    queryset = Bed.objects.all()
    serializer_class = BedSerializer
    permission_classes = [IsAuthenticated]

class PatientDischargeViewset(viewsets.ModelViewSet):
    queryset = PatientDischarge.objects.all()
    serializer_class = PatientDischargeSerializer
    permission_classes = [IsAuthenticated, IsDoctorUser]

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """
        Create a discharge record for a patient admission.
        Expects the admission ID in the URL (via pk).
        """
        admission_id = kwargs.get('admission_pk')  
        if not admission_id:
            return Response(
                {"error": "Admission ID is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            admission = PatientAdmission.objects.get(id=admission_id)
        except PatientAdmission.DoesNotExist:
            return Response(
                {"error": "Admission not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        if admission.discharged_at:
            return Response(
                {"error": "Patient is already discharged."},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = self.get_serializer(data={
            'admission': admission.id,
            'discharge_notes': request.data.get('discharge_notes', '')
        })
        serializer.is_valid(raise_exception=True)
        discharge = serializer.save(discharged_by=request.user)

        admission.discharged_at = discharge.discharged_at
        admission.save()

        bed = admission.bed
        if bed:
            bed.status = 'available'
            bed.save()

        response_data = serializer.data
        response_data['message'] = 'Patient discharged successfully'
        return Response(response_data, status=status.HTTP_201_CREATED)

class WardNurseAssignmentViewSet(viewsets.ModelViewSet):
    queryset = WardNurseAssignment.objects.all()
    serializer_class = WardNurseAssignmentSerializer
    permission_classes = [IsAuthenticated, IsDoctorUser]

    def get_queryset(self):
        user = self.request.user
        if user:
            return self.queryset.filter(assigned_by=user)
        return self.queryset.none()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

