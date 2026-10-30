from django.contrib.auth import authenticate
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.conf import settings

from authperms.models import Group
from .models import (
    CustomUser,
    PasswordReset,
    Doctor,
    Nurse,
    LabTech,
    Pharmacist,
    Receptionist,

)

from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework import serializers

User = get_user_model()

class CustomUserSerializer(serializers.ModelSerializer):
    age = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = ('id', 'email', 'first_name',
                  'last_name', 'role', 'profession', 'age', 'phone')

    def get_age(self, obj: CustomUser):
        if obj.age:
            return obj.age
        return None


class CustomUserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    group = serializers.PrimaryKeyRelatedField(
        queryset=Group.objects.all(),
        required=True,
        allow_null=False
    )

    class Meta:
        model = CustomUser
        fields = ('email', 'password', 'first_name',
                  'last_name', 'role', 'profession', 'group', 'phone')

    def create(self, validated_data: dict):
        
        user: CustomUser = CustomUser.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            role=validated_data['role'],
            profession=validated_data['profession'],
            group=validated_data["group"],
            phone=validated_data["phone"],
            is_staff=validated_data['role'] != 'patient',
        )
        return user


class CustomUserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data: dict):
        email = data.get('email')
        password = data.get('password')

        user = authenticate(request=self.context.get(
            'request'), email=email, password=password)

        if not user:
            raise serializers.ValidationError("Invalid email or password.")

        return {
            'user': user
        }



class ResetPasswordRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)

    def validate_email(self, email):
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError("User with this email does not exist")
        return email


class PasswordResetConfirmSerializer(serializers.Serializer):
    new_password = serializers.RegexField(
        regex=r'^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$',
        write_only=True,
        error_messages={'invalid': ('Password must be at least 8 characters long with at least one capital letter, one number, and one symbol.')}
    )

    confirm_password = serializers.CharField(write_only=True, required=True,)

    def validate(self, data):
        new_password = data.get('new_password')
        confirm_password = data.get('confirm_password')

        if new_password != confirm_password:
            raise serializers.ValidationError({'confirm_password': ['Passwords do not match.']})  # More specific error message

        return data


class DoctorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Doctor
        fields = "__all__"


class NurseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Nurse
        fields = "__all__"


class LabTechSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabTech
        fields = "__all__"


class ReceptionistSerializer(serializers.ModelSerializer):
    class Meta:
        model = Receptionist
        fields = "__all__"


class PharmacistSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pharmacist
        fields = "__all__"
