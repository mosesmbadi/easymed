# authperms — groups, permissions and role checks

`backend/authperms/` · mounted at `/authperms/`

EasyMed uses its own lightweight permission system instead of Django's
`auth.Group`/`auth.Permission`. There are two layers:

1. **Named permissions on groups** — strings such as
   `CAN_ACCESS_LABORATORY_DASHBOARD`. A user belongs to one group
   (`CustomUser.group`) and inherits its permissions. The frontend uses these to
   build the sidebar and guard pages.
2. **Role permission classes** — DRF `BasePermission` classes that check
   `CustomUser.role`. Views use these to guard the API.

## Models

| Model | Fields |
| --- | --- |
| `Permission` | `name` |
| `Group` | `name` (unique), `permissions` (M2M → `Permission`) |

Users link via `CustomUser.group` (FK) and `CustomUser.user_permissions` (M2M).

## Named permissions in use

Seeded by `create_permissions_and_groups()` in the demo generator and checked by
the frontend menu:

```
CAN_ACCESS_ADMIN_DASHBOARD        CAN_ACCESS_INVENTORY_DASHBOARD
CAN_ACCESS_AI_ASSISTANT_DASHBOARD CAN_ACCESS_LABORATORY_DASHBOARD
CAN_ACCESS_ANNOUNCEMENT_DASHBOARD CAN_ACCESS_NURSING_DASHBOARD
CAN_ACCESS_BILLING_DASHBOARD      CAN_ACCESS_PATIENTS_DASHBOARD
CAN_ACCESS_DOCTOR_DASHBOARD       CAN_ACCESS_PHARMACY_DASHBOARD
CAN_ACCESS_GENERAL_DASHBOARD      CAN_ACCESS_RECEPTION_DASHBOARD
CAN_RECEIVE_INVENTORY_NOTIFICATIONS   (backend: re-order alerts)
```

## Permission classes (`permissions.py`)

Superusers pass every class except where noted.

| Class | Passes when |
| --- | --- |
| `IsStaffUser` | `is_staff` |
| `IsDoctorUser` | staff and role `doctor` |
| `IsNurseUser` | staff and role `nurse` |
| `IsSeniorNurseUser` | staff and role `senior_nurse` |
| `IsLabTechUser` | staff and role `labtech` |
| `IsReceptionistUser` | staff and role `receptionist` |
| `IsPatientUser` | role `patient` |
| `IsSystemsAdminUser` | see Known issues |
| `HasAnyNamedPermission(*names)` | factory: user's group holds any of `names` |

Combine with DRF operators: `permission_classes = (IsDoctorUser | IsNurseUser,)`.
A tuple of several classes means **all** must pass.

## Endpoints

### Groups

| Method & path | Purpose | Access |
| --- | --- | --- |
| `GET groups` | List groups (filterable, `GroupFilter`) | public |
| `GET groups/<group_id>` | One group with its permissions | staff |
| `POST groups/add` | Create a group | staff |
| `PUT groups/<group_name>/edit` | Rename | staff |
| `DELETE groups/<group_name>/delete` | Delete | staff |
| `PUT groups/<group_id>/add/user/<user_id>` | Put user in group | staff |
| `POST groups/<group_name>/remove/user/<user_id>` | Remove user from group | staff |
| `GET groups/user/<user_id>` | A user's group | staff |
| `PUT groups/change-role/user/<user_id>` | Change a user's role | staff |
| `PUT groups/permissions/add/<group_id>/` | Set permissions on a group | staff |

### Permissions

| Method & path | Purpose | Access |
| --- | --- | --- |
| `GET permissions` | All permissions | staff |
| `GET permissions/<permission_id>` | One permission | staff |
| `POST permissions/add` | Create | staff |
| `DELETE permissions/<permission_id>/delete` | Delete | staff |
| `GET permissions/user/<user_id>/` | Permission names for a user (via group) | public |

`EditPermissionAPIView`, `AddPermissionsToUserAPIView` and
`RemovePermissionsFromUserAPIView` exist in `views.py` but are not routed.

## Setting up access for a new deployment

1. Create permissions (or let the demo generator seed them).
2. Create a group per job function, e.g. `LAB`, and attach permissions.
3. Create users with the right `role` and assign the group.

Role decides what the **API** allows; the group decides what the **UI** shows.
Both must line up for a user to work a screen.

## Known issues

- `IsSystemsAdminUser` checks `role == CustomUser.BASE_ROLE`, and `BASE_ROLE` is
  `patient`. So it admits **staff users whose role is `patient`** (not sysadmins)
  plus superusers. It should compare against `CustomUser.SYS_ADMIN`.
- `GroupsAPIView` and `UserPermissionsAPIView` are `AllowAny`: anyone can list
  groups or read any user's permissions by id.
- `utils/group_perms.user_in_group()` uses Django's `auth.Group` and
  `user.groups`, which this project disables; it always returns `False`.
