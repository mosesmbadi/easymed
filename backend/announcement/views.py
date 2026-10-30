from django.shortcuts import render
from .models import (
    Channel,
    Announcement,
    Comment,
)

from authperms.permissions import (
    IsStaffUser,
    IsDoctorUser,
    IsLabTechUser,
    IsNurseUser,
    IsSystemsAdminUser
)

from rest_framework import viewsets

from .serializeers import (
      ChannelSerializer,
      AnnouncementSerializer,
      CommentSerializer,
)

class ChannelViewset(viewsets.ModelViewSet):
    queryset = Channel.objects.all()
    serializer_class = ChannelSerializer
    permission_classes = (IsDoctorUser | IsNurseUser | IsLabTechUser,)

class AnnouncementViewset(viewsets.ModelViewSet):
        queryset = Announcement.objects.all()
        serializer_class = AnnouncementSerializer
        permission_classes = (IsDoctorUser | IsNurseUser | IsLabTechUser,)


class CommentViewset(viewsets.ModelViewSet):
        queryset = Comment.objects.all()
        serializer_class = CommentSerializer
        permission_classes = (IsDoctorUser | IsNurseUser | IsLabTechUser,)        