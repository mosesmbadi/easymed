from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import download_invoice_pdf
from django.conf.urls.static import static

from django.conf import settings


from .views import (
    InvoiceViewset,
    InvoiceItemViewset,
    PaymentModeViewset,
    InvoicesByPatientId,
    InvoiceItemsByInvoiceId,
    InvoiceItemsByInsuranceCompany,
    PaymentBreakdownView,
    InvoicePaymentViewset
)

router = DefaultRouter()

router.register(r'invoices', InvoiceViewset)
router.register(r'invoice-items', InvoiceItemViewset)
router.register(r'payment-modes', PaymentModeViewset)
router.register(r'invoice-payments', InvoicePaymentViewset)

urlpatterns = [
    path('', include(router.urls)),
    path('download_invoice_pdf/<int:invoice_id>/', download_invoice_pdf, name='download_invoice_pdf'),
    path('invoices/patient/<int:patient_id>/', InvoicesByPatientId.as_view()),
    path('invoices/items/<int:invoice_id>/', InvoiceItemsByInvoiceId.as_view()),
    path('invoice-items-by-insurance-company/', InvoiceItemsByInsuranceCompany.as_view(), name='invoice-items-by-insurance-company'),
    path('payment-modes-breakdown/', PaymentBreakdownView.as_view(), name='payment-breakdown'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)