from django.contrib import admin
from .models import Announcement, Channel, Comment

admin.site.register(Announcement)
admin.site.register(Channel)
admin.site.register(Comment)
