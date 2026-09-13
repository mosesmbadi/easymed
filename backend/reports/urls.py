from django.urls import path
from .views import (
    get_invoice_items_by_date_range,
    get_invoice_items_by_item_and_date_range,
    # get_total_by_payment_mode,
    PaymentReportView,
    GrossMarginView,
)

urlpatterns = [
    path('sale_by_date/', get_invoice_items_by_date_range, name='generate_pdf'),
    path('sale_by_item_and_date/', get_invoice_items_by_item_and_date_range, name='generate_pdf_by_item_and_date'),
    # path('total_payment_mode_amount/', get_total_by_payment_mode, name='total_payment_mode_amount'),
    path('total_payment_mode_amount/', PaymentReportView.as_view()),
    path('gross-margin/', GrossMarginView.as_view(), name='gross-margin'),
]
