from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from patient.models import Patient
from .signals import triage_request_signal
from .models import TriageResult
from .serializers import TriageResultSerializer

class TriageRequestView(APIView):
    def post(self, request, patient_id):
        patient = get_object_or_404(Patient, id=patient_id)
        triage_request_signal.send(sender=self.__class__, patient_id=patient.id)
        return Response({"message": "Triage request initiated.", "patient_id": patient.id}, status=status.HTTP_202_ACCEPTED)

class TriageResultView(APIView):
    def get(self, request, patient_id):
        patient = get_object_or_404(Patient, id=patient_id)
        try:
            triage_result = TriageResult.objects.filter(patient=patient).latest('timestamp')
            serializer = TriageResultSerializer(triage_result)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except TriageResult.DoesNotExist:
            return Response({"message": "No triage results found for this patient."}, status=status.HTTP_404_NOT_FOUND)