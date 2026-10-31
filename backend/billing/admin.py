from django.contrib import admin
from .models import (
    EtimsSubmission, Invoice, InvoiceItem, InvoicePayment, MpesaPaymentRequest, PaymentMode,
)


@admin.register(PaymentMode)
class PaymentModeAdmin(admin.ModelAdmin):
    list_display = ['payment_mode', 'payment_category', 'insurance', 'is_default']
    search_fields = ['payment_mode', 'payment_category', 'insurance__name']
    list_filter = ['payment_category', 'is_default']


admin.site.register(Invoice)
admin.site.register(InvoiceItem)
admin.site.register(InvoicePayment)


@admin.register(EtimsSubmission)
class EtimsSubmissionAdmin(admin.ModelAdmin):
    list_display = ['invoice', 'status', 'attempts', 'receipt_number', 'sent_at']
    list_filter = ['status']
    search_fields = ['invoice__invoice_number', 'receipt_number']
    readonly_fields = [f.name for f in EtimsSubmission._meta.fields]
    actions = ['send_now']

    @admin.action(description="Send to eTIMS now")
    def send_now(self, request, queryset):
        from .etims import submit

        sent = sum(1 for submission in queryset if submit(submission))
        self.message_user(request, f"{sent} of {queryset.count()} accepted by KRA.")


@admin.register(MpesaPaymentRequest)
class MpesaPaymentRequestAdmin(admin.ModelAdmin):
    list_display = ['invoice', 'phone', 'amount', 'status', 'mpesa_receipt_number', 'created_at']
    list_filter = ['status']
    search_fields = ['phone', 'mpesa_receipt_number', 'invoice__invoice_number']
    readonly_fields = [f.name for f in MpesaPaymentRequest._meta.fields]
