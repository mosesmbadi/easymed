import logging
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db.models import Prefetch
from django_filters.rest_framework import DjangoFilterBackend
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied


from authperms.permissions import IsDoctorUser, IsSeniorNurseUser, IsSystemsAdminUser

from .utils import (generate_discharge_summary_pdf)
from .filters import WardFilter, PatientAdmissionFilter, WardNurseAssignmentFilter
from .models import (Bed, PatientAdmission, PatientDischarge, Ward, WardNurseAssignment)
from .serializers import (BedSerializer, PatientAdmissionSerializer,
                        PatientDischargeSerializer,
                        WardNurseAssignmentSerializer, WardSerializer)


logger = logging.getLogger(__name__)


class PatientAdmissionViewSet(viewsets.ModelViewSet):
    queryset = PatientAdmission.objects.all()
    serializer_class = PatientAdmissionSerializer
    permission_classes = [IsDoctorUser]
    filter_backends = [DjangoFilterBackend] 
    filterset_class = PatientAdmissionFilter

    def get_queryset(self):
        return PatientAdmission.objects.all()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        bed = serializer.validated_data.get("bed")

        try:
            if bed:
                bed.status = "occupied"
                bed.save()
            instance = serializer.save(admitted_by=request.user)
            return Response(self.get_serializer(instance).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response(
                {"Cannot admit patient": str(e)}, status=status.HTTP_400_BAD_REQUEST
            )

    def perform_create(self, serializer):
        serializer.save(referred_by=self.request.user)

    
class WardNurseAssignmentViewSet(viewsets.ModelViewSet):
    queryset = WardNurseAssignment.objects.all()
    serializer_class = WardNurseAssignmentSerializer
    permission_classes = [IsSeniorNurseUser | IsDoctorUser | IsSystemsAdminUser]
    filter_backends = [DjangoFilterBackend]
    filterset_class = WardNurseAssignmentFilter

    def create(self, request, *args, **kwargs):
        if not any([perm().has_permission(request, self) for perm in self.permission_classes]):
            return Response(
                {"detail": "Only a senior nurse, doctor, or super admin can assign a nurse to a ward."},
                status=status.HTTP_403_FORBIDDEN
            )
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        if not any([perm().has_permission(request, self) for perm in self.permission_classes]):
            return Response(
                {"detail": "Only a senior nurse, doctor, or super admin can update nurse assignments."},
                status=status.HTTP_403_FORBIDDEN
            )
        instance = self.get_object() 
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            instance.assigned_by = request.user  
            instance.assigned_at = timezone.now()
            instance.save()
            self.perform_update(serializer)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class WardViewSet(viewsets.ModelViewSet):
    queryset = Ward.objects.all()
    serializer_class = WardSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = WardFilter

    def update(self, request, *args, **kwargs):
        instance = self.get_object() 
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            self.perform_update(serializer)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class BedViewSet(viewsets.ModelViewSet):
    serializer_class = BedSerializer

    def get_queryset(self):
        ward_id = self.kwargs.get('ward_pk')
        queryset = Bed.objects.select_related('ward').prefetch_related(
            Prefetch(
                'current_patient',
                queryset=PatientAdmission.objects.filter(discharge__isnull=True).select_related('patient', 'admitted_by')
            )
        )
        if ward_id:
            return queryset.filter(ward_id=ward_id)
        return queryset

    def create(self, request, *args, **kwargs):
        ward = get_object_or_404(Ward, pk=kwargs.get("ward_pk"))
        existing_beds_count = Bed.objects.filter(ward=ward).count()
        if existing_beds_count >= ward.capacity:
            return Response(
                {"error": f"Ward {ward.name} has reached its capacity of {ward.capacity} beds."},
                status=status.HTTP_400_BAD_REQUEST,
                )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            serializer.save(ward=ward)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response(
                {"Cannot create bed": str(e)}, status=status.HTTP_400_BAD_REQUEST
                )


class PatientDischargeViewset(viewsets.ModelViewSet):
    queryset = PatientDischarge.objects.all()
    serializer_class = PatientDischargeSerializer
    permission_classes = [IsDoctorUser]

    def create(self, request, *args, **kwargs):
        """
        Create a discharge record for a patient admission.
        """
        admission = get_object_or_404(PatientAdmission, pk=kwargs.get("admission_pk"))
        if hasattr(admission, 'discharge'):
            return Response({"error": "Patient is already discharged"},  status=status.HTTP_400_BAD_REQUEST)
        try:
            serializer = self.get_serializer(data=request.data, context={'request': request, 'admission': admission})
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f"Failed to discharge patient: {str(e)}", exc_info=True)
            return Response({"error": f"Failed to discharge patient: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)


class DownloadDischargeSummaryView(APIView):
    def get(self, request, admission_id):
        pdf_file, error = generate_discharge_summary_pdf(admission_id, request)
        if error:
            return Response(error, status=404)
        response = HttpResponse(pdf_file, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename=\"discharge_summary_{admission_id}.pdf\"'
        return response