import django_filters

#models
from .models import (
    Group,
)

class GroupFilter(django_filters.FilterSet):
    name = django_filters.CharFilter(lookup_expr='iexact')
    class Meta:
        model = Group
        fields = ("name",)