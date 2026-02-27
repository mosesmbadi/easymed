from rest_framework import viewsets, generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from django.db.models import F
from company.models import Company
from inventory.models import Inventory, Item

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


class PharmacyDashboardMetricsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        now = timezone.now()
        today = now.date()
        date_limit = today + timedelta(days=90)

        # 1. Short Expiries for Drugs (90-day window)
        short_expiries_count = Inventory.objects.filter(
            item__category='Drug',
            expiry_date__lte=date_limit,
            expiry_date__gt=today
        ).count()

        # 2. Re-order Levels for Drugs
        reorder_count = Inventory.objects.filter(
            item__category='Drug',
            quantity_at_hand__lte=F('re_order_level')
        ).count()

        return Response({
            'short_expiries': short_expiries_count,
            'reorder_levels': reorder_count
        })


def print_pharmacy_report(request):
    report_type = request.GET.get('type')
    company = Company.objects.first()
    today = timezone.now()
    company_logo_url = request.build_absolute_uri(company.logo.url) if (company and getattr(company, 'logo', None)) else None
    
    data = {
        'company': company,
        'company_logo_url': company_logo_url,
        'today': today,
        'report_type': report_type,
    }
    
    template_name = 'pharmacy_inventory_report.html'
    
    if report_type == 'expiry':
        date_limit = today.date() + timedelta(days=90)
        items = Inventory.objects.filter(
            item__category='Drug',
            expiry_date__lte=date_limit,
            expiry_date__gt=today.date()
        ).select_related('item')
        data['title'] = "Pharmacy Short Expiry Report"
        data['items'] = items
        
    elif report_type == 'reorder':
        items = Inventory.objects.filter(
            item__category='Drug',
            quantity_at_hand__lte=F('re_order_level')
        ).select_related('item')
        data['title'] = "Pharmacy Re-order Level Report"
        data['items'] = items

    else:
        from django.http import JsonResponse
        return JsonResponse({"error": "Invalid report type"}, status=400)

    from django.template.loader import render_to_string
    from weasyprint import HTML
    import tempfile
    from django.http import HttpResponse

    html_string = render_to_string(template_name, data)
    html = HTML(string=html_string, base_url=request.build_absolute_uri())
    
    with tempfile.NamedTemporaryFile(delete=True) as output:
        html.write_pdf(target=output.name)
        output.seek(0)
        response = HttpResponse(output.read(), content_type='application/pdf')
        filename = f"pharmacy_{report_type}_report_{today.strftime('%Y%m%d')}.pdf"
        response['Content-Disposition'] = f'inline; filename="{filename}"'
        return response