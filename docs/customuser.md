# customuser — users, roles and authentication

`backend/customuser/` · mounted at `/users/`

Owns the user model (`AUTH_USER_MODEL = customuser.CustomUser`), login and token
refresh, registration, password reset, and the `generate_dummy_data` management
command that seeds a demo deployment.

## Models

### `CustomUser`

Email-login user (`USERNAME_FIELD = "email"`), built on `AbstractBaseUser` +
`PermissionsMixin`.

| Field | Notes |
| --- | --- |
| `email` | Unique, login identifier |
| `first_name`, `last_name`, `phone`, `profession`, `date_of_birth` | Profile |
| `role` | One of the roles below; default `patient` |
| `is_active`, `is_staff`, `date_joined` | `save()` forces `is_staff=True` for non-patient roles |
| `signature` | Image, printed on reports |
| `registration_number` | Professional registration (e.g. KMLTTB, KMPDC), printed under APPROVED BY on lab results the user approves |
| `can_manage_inventory` | Per-user grant to receive/adjust stock (see [inventory.md](inventory.md#permissions)) |
| `group` | FK to `authperms.Group` — **one** group per user |
| `user_permissions` | M2M to `authperms.Permission` |

Django's own `groups` relation is disabled (`groups = None`); the app uses its
own `authperms` models instead.

Roles (`CustomUser.ROLE_CHOICES`):

| Constant | Value |
| --- | --- |
| `PATIENT` | `patient` (`BASE_ROLE`) |
| `DOCTOR` | `doctor` |
| `NURSE` | `nurse` |
| `SENIOR_NURSE` | `senior_nurse` |
| `LAB_TECH` | `labtech` |
| `PHARMACIST` | `pharmacist` |
| `RECEPTIONIST` | `receptionist` |
| `SYS_ADMIN` | `sysadmin` |

Helpers: `age` property, `get_fullname()`.

### Role proxies

`Doctor`, `Nurse`, `LabTech`, `Pharmacist`, `Receptionist`, `PatientUser` are
proxy models with managers filtered to their role, e.g. `Doctor.objects.all()`.

### Profiles

`DoctorProfile`, `NurseProfile`, `SysadminProfile`, `LabTechProfile`,
`ReceptionistProfile` (UUID pk), `PharmacistProfile` — one-to-one with the user,
created by the `post_save` signal in `signals.py` according to role. They hold no
extra fields yet.

### Password tracking

- `PasswordReset` — user + token + `created_at`.
- `PasswordHistory` — prior password hashes, newest first. `utils.check_recent_passwords()`
  rejects reuse of any of the last five.

## Endpoints (`/users/...`)

| Method & path | View | Access | Purpose |
| --- | --- | --- | --- |
| `POST login/` | `LoginAPIView` | public | Returns `{access, refresh}`. Refresh token carries `email`, `first_name`, `role` claims |
| `POST token/refresh/` | SimpleJWT `TokenRefreshView` | public | Rotate tokens |
| `POST register/` | `RegistrationAPIView` | public for `patient`; superuser sysadmin otherwise | Create a user |
| `POST password-reset/request/` | `PasswordResetRequestView` | public | Emails a reset link |
| `POST password-reset/confirm/<uidb64>/<token>/` | `PasswordResetConfirmView` | public | Sets the new password |
| `POST users/admin-reset-password/` | `AdminInitiatePasswordResetByEmailView` | `IsAdminUser` | Send reset email for a given address |
| `POST users/<user_id>/admin-change-password/` | `AdminInitiatePasswordResetView` | `IsAdminUser` | Admin sets a user's password |
| `GET doctors/`, `nurses/`, `labtechs/`, `pharmacists/`, `receptionists` | role list views | `IsStaffUser` | Staff pickers |
| `users/` (router) | `UserListViewSet` | default | CRUD on users |

Login flow: the frontend posts credentials to its own proxy
(`/api/auth/...`), stores `access` and `refresh` in `localStorage`, decodes the
access token for the user id/role, then loads the user's permission names from
`/authperms/permissions/user/<id>/`. See [frontend.md](frontend.md#authentication).

### Password reset email

`utils.send_password_reset_email()` builds
`http://127.0.0.1:3000/auth/reset/<uidb64>/<token>` and sends it with
`fail_silently=True`. The link expires after `PASSWORD_RESET_TIMEOUT` (10 min).

## Demo data — `generate_dummy_data`

```
docker exec easymed-backend python manage.py generate_dummy_data
```

Run automatically by `entrypoint.sh` unless `GENERATE_DEMO_DATA` is false.

- `management/utils/data_generators.py` builds the catalogue: units, users,
  companies/branches, insurers and insurance price lists, departments,
  suppliers, items, consumables, lab profiles/panels/reference values/
  interpretations, wards/beds, permissions and groups.
- `management/utils/demo_activity.py` simulates history. Everything runs inside
  a `DemoClock` that starts `DEMO_DAYS` before today and walks forward day by
  day, creating visits, lab work, billing and stock movements, so dashboards
  and reports have realistic dated data.
- `DEMO_FACILITY_TYPE` (`hospital` or `standalone_lab`) sets the demo company's
  facility type.

Details: [backend/docs/DEMO_DATA.md](../backend/docs/DEMO_DATA.md).

## Tests

`customuser/tests/test_password_reset.py`.

## Known issues

- The reset link host is hard-coded to `http://127.0.0.1:3000`; it is wrong for
  any deployed environment.
- The frontend's `PASSWORD_RESET`, `CHANGE_PASSWORD` and `ADMIN_CHANGE_PASSWORD`
  constants point at `/customuser/...`, but this app is mounted at `/users/`.
- `create_superuser` checks `role is not CustomUser.SYS_ADMIN` (identity, not
  equality). It works only because the default is the same interned string.
- `ReceptionistAPIView` is routed as `receptionists` with no trailing slash,
  unlike its siblings.
