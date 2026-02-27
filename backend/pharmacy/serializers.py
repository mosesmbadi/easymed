from rest_framework import serializers

from .models import (
    PublicPrescriptionRequest, 
    DrugsFeedback, 
    DrugCategory, 
    DrugMode, 
    DrugState, 
    Drug
)

class PublicPrescriptionRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = PublicPrescriptionRequest
        fields = '__all__'


class DrugsFeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = DrugsFeedback
        fields = '__all__'

class DrugCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = DrugCategory
        fields = '__all__'

class DrugModeSerializer(serializers.ModelSerializer):
    class Meta:
        model = DrugMode
        fields = '__all__'

class DrugStateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DrugState
        fields = '__all__'

class DrugSerializer(serializers.ModelSerializer):
    item_name = serializers.ReadOnlyField(source='item.name')
    category_name = serializers.ReadOnlyField(source='category.name')
    mode_name = serializers.ReadOnlyField(source='mode.name')
    state_name = serializers.ReadOnlyField(source='state.name')

    class Meta:
        model = Drug
        fields = [
            'id', 
            'item', 
            'item_name', 
            'category', 
            'category_name', 
            'mode', 
            'mode_name', 
            'state', 
            'state_name'
        ]