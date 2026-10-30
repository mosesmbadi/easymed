from django.contrib import admin
from .models import Invoice, InvoiceItem, PaymentMode, InvoicePayment


@admin.register(PaymentMode)
class PaymentModeAdmin(admin.ModelAdmin):
    list_display = ['payment_mode', 'payment_category', 'insurance', 'is_default']
    search_fields = ['payment_mode', 'payment_category', 'insurance__name']
    list_filter = ['payment_category', 'is_default']


admin.site.register(Invoice)
admin.site.register(InvoiceItem)
admin.site.register(InvoicePayment)

