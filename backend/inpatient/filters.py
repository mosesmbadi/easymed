import django_filters

from .models import Ward


class WardFilter(django_filters.FilterSet):
    class Meta:
        model = Ward
        fields = ["gender"]
