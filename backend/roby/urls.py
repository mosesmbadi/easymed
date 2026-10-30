from django.urls import path
from .views import TriageRequestView, TriageResultView

urlpatterns = [
    path('triage/request/<int:patient_id>/', TriageRequestView.as_view(), name='triage-request'),
    path('triage/results/<int:patient_id>/', TriageResultView.as_view(), name='triage-results'),
]
