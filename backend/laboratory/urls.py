from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    LabReagentViewSet,
    LabTestRequestViewSet,
    LabTestProfileViewSet,
    LabEquipmentViewSet,
    PublicLabTestRequestViewSet,
    LabTestProfileViewSet,
    LabTestRequestByPatientIdAPIView,
    LabTestPanelViewSet,
    LabTestRequestPanelViewSet,
    LabTestRequestPanelByLabTestRequestId,
    download_labtestresult_pdf,
    ProcessTestRequestViewSet,
    LabTestRequestByProcessId,
    PatientSampleByProcessId,
    PatientSampleViewSet,
    LabTestRequestPanelBySampleView,
    SpecimenViewSet,
    ReferenceValueViewSet,
    TestKitViewSet,
    TestKitCounterViewSet,
    ReagentConsumptionLogViewSet,
    LowStockReagentViewSet,
    LabTestInterpretationViewSet
)

router = DefaultRouter()
router.register(r'lab-reagents', LabReagentViewSet)
router.register(r'lab-test-profile', LabTestProfileViewSet)
router.register(r'lab-test-panel', LabTestPanelViewSet)
router.register(r'lab-test-requests', LabTestRequestViewSet)
router.register(r'lab-test-requests-panel', LabTestRequestPanelViewSet)
router.register(r'lab-equipment', LabEquipmentViewSet)
router.register(r'public-lab-test-request', PublicLabTestRequestViewSet)
router.register(r'process-test-request', ProcessTestRequestViewSet)
router.register(r'patient-samples', PatientSampleViewSet)
router.register(r'specimens', SpecimenViewSet)
router.register(r'reference-values', ReferenceValueViewSet)
router.register(r'lab-test-interpretations', LabTestInterpretationViewSet)
router.register(r'testkits', TestKitViewSet)
router.register(r'testkitcounters', TestKitCounterViewSet)
router.register(r'reagent-consumption', ReagentConsumptionLogViewSet, basename='reagent-consumption')
router.register(r'low-stock-reagents', LowStockReagentViewSet, basename='low-stock-reagents')



urlpatterns = [
    path('', include(router.urls)),
    path('lab-test-request-by-patient-id/<int:patient_id>/', LabTestRequestByPatientIdAPIView.as_view()),
    path('lab-test-request-panels-by-lab-test-request-id/<int:lab_test_request_id>/', LabTestRequestPanelByLabTestRequestId.as_view(), name='lab-test-request-panels'),
    path('lab-test-request-by-process-id/<int:process_id>/', LabTestRequestByProcessId.as_view(), name='lab-process-request'),
    
    path('labtestpanels-byprofile-id/<int:profile_id>/', LabTestPanelViewSet.as_view({'get': 'by_test_profile'}), name='labtestpanels-byprofile-id'),
    path('labtestrequestpanels/sample/<str:patient_sample_code>/', LabTestRequestPanelBySampleView.as_view(), name='labtestrequestpanel-by-sample'),

    path('patient-samples-by-process-id/<int:process_id>/', PatientSampleByProcessId.as_view(), name='patient-samples'),
    path('download_labtestresult_pdf/<int:processtestrequest_id>/', download_labtestresult_pdf, name='download_labtestresult_pdf'),



]

