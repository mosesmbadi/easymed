from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from .models import PatientAdmission, Ward, Bed, WardNurseAssignment
from .serializers import PatientAdmissionSerializer, WardSerializer, BedSerializer, WardNurseAssignmentSerializer
from authperms.permissions import IsDoctorUser, IsNurseUser

# Create your views here.
class PatientAdmissionViewSet(viewsets.ModelViewSet):
    queryset = PatientAdmission.objects.all()
    serializer_class = PatientAdmissionSerializer
    permission_classes = [IsAuthenticated, IsDoctorUser]  # Restrict to authenticated doctors

    def get_queryset(self):
        # Optional: Restrict nurses to see only patients in their wards (later enhancement)
        return super().get_queryset()

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Validation is now handled in the serializer, so we proceed directly
        bed = serializer.validated_data['bed']
        bed.status = 'occupied'
        bed.save()

        # Save admission with the doctor as admitted_by
        serializer.save(admitted_by=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class WardViewSet(viewsets.ModelViewSet):
    queryset = Ward.objects.all()
    serializer_class = WardSerializer
    permission_classes = [IsAuthenticated]

class BedViewSet(viewsets.ModelViewSet):
    queryset = Bed.objects.all()
    serializer_class = BedSerializer
    permission_classes = [IsAuthenticated]

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

