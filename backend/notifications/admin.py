from django.contrib import admin

from .models import OutboundMessage


@admin.register(OutboundMessage)
class OutboundMessageAdmin(admin.ModelAdmin):
    list_display = ['created_at', 'channel', 'recipient', 'subject', 'status', 'attempts']
    list_filter = ['channel', 'status']
    search_fields = ['recipient', 'subject', 'body']
    readonly_fields = [f.name for f in OutboundMessage._meta.fields]
    actions = ['send_now']

    @admin.action(description="Send now")
    def send_now(self, request, queryset):
        from .services import deliver

        sent = sum(1 for message in queryset if deliver(message))
        self.message_user(request, f"{sent} of {queryset.count()} sent.")
