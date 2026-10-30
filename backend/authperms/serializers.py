from rest_framework import serializers

# models
from .models import Group, Permission
from customuser.models import CustomUser


class GroupsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ("id", "name", )


class GroupSerializer(serializers.ModelSerializer):
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = Group
        fields = ("name", "permissions")

    def get_permissions(self, obj: Group):
        permissions_list = obj.permissions.all()
        return [{"name": permission.name} for permission in permissions_list]


class AddGroupSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=50)

    def validate_name(self, value: str):
        group_name_exists = Group.objects.filter(name=value).exists()
        if group_name_exists:
            raise serializers.ValidationError(
                "Group with this name already exists")

        return value.upper()

    def create(self, validated_data: dict):
        try:
            return Group.objects.create(**validated_data)
        except Exception as e:
            raise serializers.ValidationError(e)


class EditGroupNameSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ("id", "name",)
        read_only_fields = ("id",)

    def validate_name(self, value: str):
        group_name_exists = Group.objects.filter(name=value).exists()
        if group_name_exists:
            raise serializers.ValidationError(
                "Group with this name already exists")

        return value.upper()

    def update(self, instance: Group, validated_data: dict):
        instance.name = validated_data.get("name", instance.name)
        instance.save()
        return instance
    
class AddPermissionToGroupSerializer(serializers.ModelSerializer):
    permissions = serializers.PrimaryKeyRelatedField(
        queryset=Permission.objects.all(),
        required=True,
        many=True,
    )
    class Meta:
        model = Group
        fields = ("name", "permissions")
        read_only_fields = ("name",)


    def update(self, instance: Group, validated_data: dict):
        permissions = validated_data.get("permissions")
        for permission in permissions:
            instance.permissions.add(permission)
            instance.save()

        return instance

    

class AddUserToGroupsSerializer(serializers.ModelSerializer):
    user_id = serializers.SerializerMethodField()
    group = serializers.PrimaryKeyRelatedField(
        queryset=Group.objects.all(),
        required=True,
    )

    class Meta:
        model = CustomUser
        fields = ("user_id", "group",)

    def get_user_id(self, obj: CustomUser):
        return obj.pk

    def validate(self, attrs: dict):
        group_id: int = attrs.get("group")
        if group_id is None:
            raise serializers.ValidationError("Provide a group id")
            # iterate over a group ids and remove those where the group id doesn't exist
        try:
            Group.objects.get(id=group_id)
        except Group.DoesNotExist:
            raise serializers.ValidationError(f"group id {group_id} doesn't exist")
        except Exception as e:
            raise serializers.ValidationError(e)
        return super().validate(attrs)

    def update(self, instance: CustomUser, validated_data: dict):
        group_id: int = validated_data.get("group")

        group = Group.objects.get(id=group_id)
        instance.group = group

        return instance


class RemoveUserFromGroupSerializer(serializers.Serializer):
    group_name = serializers.CharField(max_length=50)

    def validate(self, attrs: dict):
        group_name: str = attrs.get("group_name", None)
        if group_name is None:
            raise serializers.ValidationError("group_name field is required")

        try:
            Group.objects.get_by_natural_key(group_name)
        except Group.DoesNotExist:
            raise serializers.ValidationError("group_name field doesn't exist")

        return super().validate(attrs)


class PermissionsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ("id", "name",)


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ("id", "name",)


class AddPermissionSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=50)

    def validate(self, attrs: dict):
        name:str = attrs.get("name", None)
        # validate name and codename uniqueness
        # permission name and codename must be unique together
        if name is None:
            return serializers.ValidationError("permissions name is required")

        if Permission.objects.filter(name=name.upper()).exists():
            return serializers.ValidationError("Permission already exists")
            
        attrs["name"] = name.upper()

        return super().validate(attrs)

    def create(self, validated_data: dict):
        try:
            return Permission.objects.create(**validated_data)
        except Exception as e:
            return serializers.ValidationError(e)


class EditPermissionNameSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ("name",)

    def update(self, instance: Permission, validated_data: dict):
        instance.name = validated_data.get("name", instance.name)
        instance.save()
        return instance


class RemovePermissionsFromUserSerializer(serializers.Serializer):
    permissions = serializers.ListField(
        child=serializers.IntegerField(),)

    def validate(self, attrs: dict):
        permissions: list[int] = attrs.get("permissions")
        if permissions is None or len(permissions)<1:
            raise serializers.ValidationError("permissions field is required")

        permissions_list = permissions.copy()
        for permission_id in permissions_list:
            try:
                Permission.objects.get(id=permission_id)
            except Permission.DoesNotExist:
                permissions.remove(permission_id)

        attrs["permissions"] = permissions
        return super().validate(attrs)


class ChangeUserRoleSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=CustomUser.ROLE_CHOICES)
    group = serializers.PrimaryKeyRelatedField(
        queryset = Group.objects.all(),
        required = True,
        allow_null = False,
    )
    