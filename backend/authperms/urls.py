from django.urls import path

# views
from .views import (
    GroupsAPIView,
    AddGroupAPIView,
    EditGroupNameAPIView,
    DeleteGroupAPIView,
    RemoveUserFromGroupAPIView,
    GroupAPIView,
    UserGroupsAPIView,
    AddUserToGroupAPIView,
    PermissionsAPIView,
    PermissionAPIView,
    AddPermissionAPIView,
    DeletePermissionAPIView,
    AddPermissionsToUserAPIView,
    EditPermissionAPIView,
    UserPermissionsAPIView,
    RemovePermissionsFromUserAPIView,
    ChangeUserRoleAPIView,
    AddPermissionToGroupAPIView
)

urlpatterns = [
    # groups
    path("groups", GroupsAPIView.as_view(), name="groups"),
    path("groups/<int:group_id>", GroupAPIView.as_view(), name="group"),
    path("groups/add", AddGroupAPIView.as_view(), name="add-group"),
    path("groups/<str:group_name>/edit", EditGroupNameAPIView.as_view(), name="edit-group"),
    path("groups/<str:group_name>/delete", DeleteGroupAPIView.as_view(), name="delete-group"),
    path("groups/<int:group_id>/add/user/<int:user_id>", AddUserToGroupAPIView.as_view(), name="add-user-to-group"),
    path("groups/user/<int:user_id>", UserGroupsAPIView.as_view(), name="user-groups"),
    path("groups/<str:group_name>/remove/user/<int:user_id>", RemoveUserFromGroupAPIView.as_view(), name="remove-user-from-group"),
    path("groups/change-role/user/<int:user_id>", ChangeUserRoleAPIView.as_view(), name="change-user-role"),
    path("groups/permissions/add/<int:group_id>/", AddPermissionToGroupAPIView.as_view(), name="add-perm-to-group"),
    # permissions
    path("permissions", PermissionsAPIView.as_view(), name="permissions"),
    path("permissions/<int:permission_id>", PermissionAPIView.as_view(), name="permission"),
    path("permissions/add", AddPermissionAPIView.as_view(), name="add-permission"),
    path("permissions/<int:permission_id>/delete", DeletePermissionAPIView.as_view(), name="delete-permission"),
    path("permissions/user/<int:user_id>/", UserPermissionsAPIView.as_view(), name="user-permissions"),
]