from rest_framework import viewsets
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .models import (
    PublicPrescriptionRequest, 
    DrugsFeedback,
    DrugCategory,
    DrugMode,
    DrugState,
    Drug
)
from .serializers import (
    PublicPrescriptionRequestSerializer, 
    DrugsFeedbackSerializer,
    DrugCategorySerializer,
    DrugModeSerializer,
    DrugStateSerializer,
    DrugSerializer
)

class PublicPrescriptionRequestViewSet(viewsets.ModelViewSet):
    queryset = PublicPrescriptionRequest.objects.all()
    serializer_class = PublicPrescriptionRequestSerializer 


class PublicPrescriptionRequestByPatientIDView(generics.ListAPIView):
    serializer_class = PublicPrescriptionRequestSerializer 
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        patient_id = self.kwargs['patient_id']
        queryset = PublicPrescriptionRequest.objects.filter(patient_id=patient_id)
        return queryset
    

class DrugsFeedbackViewSet(viewsets.ModelViewSet):
    queryset = DrugsFeedback.objects.all()
    serializer_class = DrugsFeedbackSerializer

class DrugCategoryViewSet(viewsets.ModelViewSet):
    queryset = DrugCategory.objects.all()
    serializer_class = DrugCategorySerializer

class DrugModeViewSet(viewsets.ModelViewSet):
    queryset = DrugMode.objects.all()
    serializer_class = DrugModeSerializer

class DrugStateViewSet(viewsets.ModelViewSet):
    queryset = DrugState.objects.all()
    serializer_class = DrugStateSerializer

class DrugViewSet(viewsets.ModelViewSet):
    queryset = Drug.objects.all()
    serializer_class = DrugSerializer