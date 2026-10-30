# receptions and utils — legacy helpers

## receptions (`backend/receptions/`)

Installed in `INSTALLED_APPS` but **not mounted** in `easymed/urls.py`, so none of
its endpoints are reachable. It has no models (`models.py` is empty).

`urls.py` declares:

| Path | View | State |
| --- | --- | --- |
| `assign/patient-doctor` | `AssignPatientToDoctorAPIView` | Implemented via `AssignPatientToDoctorSerializer.assign_doctor()` |
| `convert-bookings/<booking_id>` | `ConvertAppointmentBookingToPatientAPIView` | stub (`pass`) |
| `discharge/patient/<patient_id>` | `DischargePatientsAPIView` | stub |
| `invoices/<invoice_id>/print` | `PrintInvoiceAPIView` | stub |
| `receipt/<receipt_id>/print` | `PrintReceiptAPIView` | stub |

`views.py` imports `patient.models.Appointment`, which no longer exists, so
mounting this app as-is would fail at import.

Reception work today is done through:

- patient registration — `POST /patients/patients/` ([patient.md](patient.md));
- check-in — `POST /patients/initiate-attendance-process/`;
- doctor assignment — `PATCH` the visit's `doctor` (triggers the doctor
  WebSocket notification);
- walk-in lab — `POST /lab/walk-in-requests/` ([laboratory.md](laboratory.md#walk-in-visits-walk_inpy)).

**Recommendation:** delete the app, or remove the dead views and the broken
import, so it stops suggesting endpoints that don't exist.

## utils (`backend/utils/`)

| File | Contents |
| --- | --- |
| `group_perms.py` | `user_in_group(user, group_name)` — uses Django's `auth.Group`/`user.groups`, which this project disables; always returns `False`. Imported by `customuser/views.py` but never called |
| `patient_/patient_helpers.py` | `get_patient_details(patient)` → dict of first/second name, age, gender |
