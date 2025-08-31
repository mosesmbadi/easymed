from rest_framework import serializers
from .models import TriageResult

class TriageResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = TriageResult
        fields = '__all__'
