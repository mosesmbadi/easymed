
from rest_framework.generics import ListAPIView
from rest_framework import status
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework.permissions import AllowAny
from django_filters.rest_framework import DjangoFilterBackend

# permissions
from .permissions import (
    # IsSystemsAdminUser,
    IsStaffUser,
)

# swagger
from drf_spectacular.utils import (
    extend_schema,
)

# view
from rest_framework.views import APIView
# serializers
from .serializers import (
    GroupsSerializer,
    AddGroupSerializer,
    EditGroupNameSerializer,
    AddUserToGroupsSerializer,
    RemoveUserFromGroupSerializer,
    GroupSerializer,
    PermissionsSerializer,
    PermissionSerializer,
    AddPermissionSerializer,
    RemovePermissionsFromUserSerializer,
    ChangeUserRoleSerializer,
    AddPermissionToGroupSerializer
)

# models
from authperms.models import (
    Group,
    Permission,
)
from customuser.models import (
    CustomUser,
    DoctorProfile,
    LabTechProfile,
    NurseProfile,
    SysadminProfile,
)

# filters
from .filters import (
    GroupFilter,
)


# Group Endpoint

class GroupsAPIView(ListAPIView):
    permission_classes = (AllowAny,)
    queryset = Group.objects.all()
    serializer_class = GroupsSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = GroupFilter

    # @extend_schema(
    #     responses=GroupsSerializer,
    # )
    # def get(self, request: Request, *args, **kwargs: dict):
    #     groups = Group.objects.all()
    #     serializer = GroupsSerializer(groups, many=True)

    #     return Response(serializer.data, status=status.HTTP_200_OK)


class GroupAPIView(APIView):
    permission_classes = (IsStaffUser,)

    def get_object(self, id: int):
        try:
            return Group.objects.get(pk=id)
        except Group.DoesNotExist:
            return None

    @extend_schema(
        responses=GroupSerializer,
    )
    def get(self, request: Request, group_id: int = None, *args, **kwargs: dict):
        if group_id is None:
            return Response({"error_message": "Provide the group id"}, status=status.HTTP_400_BAD_REQUEST)

        group = self.get_object(group_id)
        if group is None:
            return Response({"error_message": "Group id doesn't exist"}, status=status.HTTP_400_BAD_REQUEST)

        serializer = GroupSerializer(group)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AddGroupAPIView(APIView):
    permission_classes = (IsStaffUser,)

    @extend_schema(
        request=AddGroupSerializer,
        responses=AddGroupSerializer,
    )
    def post(self, request: Request, *args, **kwargs: dict):
        data: dict = request.data
        serializer = AddGroupSerializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.error_messages, status=status.HTTP_400_BAD_REQUEST)

        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class EditGroupNameAPIView(APIView):
    permission_classes = (IsStaffUser,)

    def get_object(self, name: str):
        try:
            return Group.objects.get_by_natural_key(name)
        except Group.DoesNotExist:
            return None

    @extend_schema(
        request=EditGroupNameSerializer,
        responses=EditGroupNameSerializer,
    )
    def put(self, request: Request, group_name: str = None, *args, **kwargs: dict):
        data = request.data
        instance = self.get_object(group_name.upper())
        if instance is None:
            return Response({"error_message": f"Group {group_name} doesn't exist"}, status=status.HTTP_404_NOT_FOUND)

        serializer = EditGroupNameSerializer(instance, data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)


class DeleteGroupAPIView(APIView):
    permission_classes = (IsStaffUser,)

    def get_object(self, group_name: str):
        try:
            return Group.objects.get_by_natural_key(group_name)
        except Group.DoesNotExist:
            return None

    @extend_schema()
    def delete(self, request: Request, group_name: str = None, *args, **kwargs: dict):
        instance = self.get_object(group_name)
        if instance is None:
            return Response({"error_message": f"Group {group_name} doesn't exist"}, status=status.HTTP_404_NOT_FOUND)

        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserGroupsAPIView(APIView):
    permission_classes = (IsStaffUser,)

    def get_object(self, user_id: int):
        try:
            return CustomUser.objects.get(pk=user_id)
        except CustomUser.DoesNotExist:
            return None

    @extend_schema(
        responses=GroupsSerializer,
    )
    def get(self, request: Request, user_id: int = None, *args, **kwargs: dict):
        user = self.get_object(user_id)
        if user is None:
            return Response({"error_message": f"user id {user_id} doesn't exist"}, status=status.HTTP_404_NOT_FOUND)

        groups = user.groups.all()
        serializer = GroupsSerializer(groups, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AddUserToGroupAPIView(APIView):
    permission_classes = (IsStaffUser,)

    def get_object(self, user_id: int, group_id: int):
        try:
            Group.objects.get(pk=group_id)
            return CustomUser.objects.get(pk=user_id)
        except CustomUser.DoesNotExist:
            return None
        except Group.DoesNotExist as e:
            print(e)
            return None
        except Exception as e:
            print(e)
            return None

    @extend_schema()
    def put(self, request: Request, group_id: int = None, user_id: int = None, *args, **kwargs: dict):
        if user_id is None or group_id is None:
            return Response({"error_message": "Provide the user id"}, status=status.HTTP_400_BAD_REQUEST)
        print(group_id)
        user = self.get_object(user_id, group_id)

        if user is None:
            return Response({"error_message": "User id or group id doesn't exist"}, status=status.HTTP_400_BAD_REQUEST)

        print(f"user {user}")
        group = Group.objects.get(pk=group_id)
        user.groups.add(group)
        return Response({"message": {"user_id": user.pk, "group_id": group.pk}}, status=status.HTTP_201_CREATED)


class RemoveUserFromGroupAPIView(APIView):
    permission_classes = (IsStaffUser,)

    def get_object(self, user_id: int, group_name: str):
        try:
            Group.objects.get(name=group_name)
            return CustomUser.objects.get(pk=user_id)
        except CustomUser.DoesNotExist:
            return None
        except Group.DoesNotExist:
            return None

    @extend_schema()
    def post(self, request: Request, user_id: int = None, group_name: str = None, *args, **kwargs: dict):
        if user_id is None or group_name is None:
            return Response({"error_message": "Provide both the user id and group id"}, status=status.HTTP_400_BAD_REQUEST)

        user = self.get_object(user_id, group_name)
        if user is None:
            return Response({"error_message": f"User id or group id doesn't exist"}, status=status.HTTP_400_BAD_REQUEST)

        group = Group.objects.get(name=group_name)
        user.groups.remove(group)

        return Response({"message": f"user id {user_id} successfully removed from group {group_name}"}, status=status.HTTP_200_OK)

# permissions


class PermissionsAPIView(APIView):
    permission_classes = (IsStaffUser,)

    @extend_schema(
        responses=PermissionsSerializer,
    )
    def get(self, request: Request, *args, **kwargs: dict):
        permissions = Permission.objects.all()
        serializer = PermissionsSerializer(permissions, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class PermissionAPIView(APIView):
    permission_classes = (IsStaffUser,)

    def get_object(self, id: int):
        try:
            return Permission.objects.get(id=id)
        except Permission.DoesNotExist:
            return None

    @extend_schema(
        responses=PermissionSerializer,
    )
    def get(self, request: Request, permission_id: int = None, *args, **kwargs: dict):
        if permission_id is None:
            return Response({"error_message": "Provide the permission id"}, status=status.HTTP_400_BAD_REQUEST)

        permission = self.get_object(permission_id)
        if permission is None:
            return Response({"error_message": "Permission id doesn't exist"}, status=status.HTTP_400_BAD_REQUEST)

        serializer = PermissionSerializer(permission)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AddPermissionAPIView(APIView):
    permission_classes = (IsStaffUser,)

    @extend_schema(
        request=AddPermissionSerializer,
        responses=AddPermissionSerializer,
    )
    def post(self, request: Request, *args, **kwargs: dict):
        data = request.data
        serializer = AddPermissionSerializer(data=data)

        if not serializer.is_valid():
            return Response(serializer.error_messages, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class EditPermissionAPIView(APIView):
    permission_classes = (IsStaffUser,)

    def put(self, request: Request, *args, **kwargs: dict):
        pass


class DeletePermissionAPIView(APIView):
    permission_classes = (IsStaffUser,)

    def get_object(self, permission_id: int):
        try:
            return Permission.objects.get(id=permission_id)
        except Permission.DoesNotExist:
            return None

    @extend_schema()
    def delete(self, request: Request, permission_id: str = None, *args, **kwargs: dict):
        permission = self.get_object(permission_id)
        if permission is None:
            return Response({"error_message": f"Permission id {permission_id} doesn't exist"}, status=status.HTTP_404_NOT_FOUND)
        permission.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserPermissionsAPIView(APIView):
    permission_classes = (AllowAny,)

    def get_object(self, user_id: int):
        try:
            return CustomUser.objects.get(id=user_id)
        except CustomUser.DoesNotExist:
            return None

    def get(self, request: Request, user_id: int = None, *args, **kwargs: dict):
        user = self.get_object(user_id)

        if user is None:
            return Response({"error_message": f"user id {user_id} doesn't exist"})

        group = user.group
        permissions = [
            permission.name for permission in group.permissions.all()]
        print(permissions)
        return Response(permissions, status=status.HTTP_200_OK)


class AddPermissionsToUserAPIView(APIView):
    permission_classes = (IsStaffUser,)

    def post(self, request: Request, *args, **kwargs: dict):
        pass


class RemovePermissionsFromUserAPIView(APIView):
    permission_classes = (IsStaffUser,)

    def get_object(self, user_id: int):
        try:
            return CustomUser.objects.get(pk=user_id)
        except CustomUser.DoesNotExist:
            return None

    @extend_schema(
        request=RemovePermissionsFromUserSerializer,
    )
    def post(self, request: Request, user_id: int = None, *args, **kwargs: dict):
        data = request.data
        user = self.get_object(user_id)
        if user is None:
            return Response({"error_message": "provide the user id"}, status=status.HTTP_400_BAD_REQUEST)

        serializer = RemovePermissionsFromUserSerializer(data=data)
        serializer.is_valid(raise_exception=True)

        permissions: list[str] = serializer.validated_data.get("group_name")
        for permission_id in permissions:
            group = Permission.objects.get(id=permission_id)
            user.user_permissions.remove(group)

        return Response({"message": "permissions successfully removed"}, status=status.HTTP_200_OK)


class ChangeUserRoleAPIView(APIView):
    permission_classes = (IsStaffUser,)

    def get_object(self, user_id: int):
        try:
            return CustomUser.objects.get(pk=user_id)
        except CustomUser.DoesNotExist:
            return None

    @extend_schema(
        request=ChangeUserRoleSerializer,
    )
    def put(self, request: Request, user_id: int = None, *args, **kwargs):
        data = request.data
        serializer = ChangeUserRoleSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        user = self.get_object(user_id)
        if user is None:
            return Response({"error_message": "provide the user id"}, status=status.HTTP_400_BAD_REQUEST)

        user.role = serializer.validated_data.get("role", user.role)
        user.group = serializer.validated_data.get("group", user.group)
        user.save()
        return Response({"message": f"changed {user.first_name}'s role to {user.role}"}, status=status.HTTP_200_OK)


class AddPermissionToGroupAPIView(APIView):
    permission_classes = (IsStaffUser,)

    def get_object(self, group_id: int):
        try:
            return Group.objects.get(pk=group_id)
        except Group.DoesNotExist:
            return None

    @extend_schema(
        request=AddPermissionToGroupSerializer,
        responses=AddPermissionToGroupSerializer,
    )
    def put(self, request: Request, group_id: int = None, *args, **kwargs):
        group = self.get_object(group_id)
        if group is None:
            return Response({"error_message": f"Group {group_id} doesn't exist"})

        data = request.data
        serializer = AddPermissionToGroupSerializer(group, data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)
