from django.urls import path, include
from rest_framework.routers import DefaultRouter
from django.conf.urls.static import static

from django.conf import settings


from .views import (
    ChannelViewset,
    AnnouncementViewset,
    CommentViewset,
)

router = DefaultRouter()

router.register(r'channels', ChannelViewset)
router.register(r'announcements', AnnouncementViewset)
router.register(r'comments', CommentViewset)

urlpatterns = [
    path('', include(router.urls)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)