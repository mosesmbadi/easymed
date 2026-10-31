# patient — patients and the clinical visit

`backend/patient/` · mounted at `/patients/`

The centre of the clinical flow. Holds patient records and the
`AttendanceProcess` — one visit — which every other module hangs its work on.

## Models

### `Patient`

| Field | Notes |
| --- | --- |
| `unique_id` | Patient number: the facility profile's `patient_id_prefix` (default `ESMED-`) + running number, e.g. `ESMED-1042`. Generated on first save |
| `first_name`, `second_name`, `date_of_birth`, `gender` (`M/F/O`) | Demographics |
| `email`, `phone` | Contact |
| `insurances` | M2M → `company.InsuranceCompany`: the patient's insurers and employer (credit accounts) |
| `date_of_birth_estimated` | The date was worked back from an age (`Patient.birth_date_for_age`), not given |
| `referred_from`, `external_id` | For someone known only through samples a clinic sent: that clinic's account and its own number for them, so the next sample finds the same patient |
| `user` | Optional one-to-one → `CustomUser` (patients who sign in) |

`age` is computed from the year of birth only.

`display_name` is the name to print: the full name, or for a coded patient
(`is_coded`: no name, sent by another facility under a number) the clinic and
its number, e.g. "Mama Lucy Clinic CCC 13939-01234". Use it rather than
joining `first_name` and `second_name`. Both are on `PatientSerializer`, with
`referred_from_name`.

The Patients screen hides patients with a `referred_from` unless "Show
patients from referred samples" is ticked or a search is typed; the API still
returns them, because the lab screens look names up from it.

### `ContactDetails`, `NextOfKin`

Next-of-kin (`patient.next_of_kin`) with name, relationship and a `ContactDetails`
row (`tel_no`, `email_address`, `residence`).

### `PublicAppointment`

A booking from the public landing page: personal details, `item` (the service
booked), `appointment_date_time`, `reason`, `status` (`pending/confirmed/cancelled`).
Confirmed bookings are meant to become visits.

### `AttendanceProcess` — the visit

| Field | Notes |
| --- | --- |
| `track_number` | `YYYYMMDD-NNNN`, unique, generated on create |
| `patient`, `patient_number` | `patient_number` copies `patient.unique_id` |
| `doctor`, `lab_tech`, `pharmacist` | Assigned staff |
| `reason` | Reason for visit |
| `track` | Current queue (see below) |
| `invoice` | One-to-one → `billing.Invoice` |
| `process_test_req` | One-to-one → `laboratory.ProcessTestRequest` |
| `prescription` | One-to-one → `Prescription` |
| `triage` | One-to-one → `Triage` |
| `created_at`, `created_by` | |

**On create** `save()` also creates, in this order: an `Invoice`
(`invoice_number = track_number`), a `ProcessTestRequest`
(`reference = track_number`), an empty `Triage`, and an empty `Prescription`.
Every visit therefore always has all four.

`track` values:

```
reception → triage → doctor → lab → awaiting result → added result
          → pharmacy → billing → complete
                     ↘ inpatient
```

Setting `track` to `reception`, `triage`, `doctor` or `inpatient` is refused by
the serializer when the facility type has that module off (see
[company.md](company.md)).

### `Triage`

Vitals for a visit: `temperature`, `height`, `weight`, `pulse`, `systolic`,
`diastolic`, `spo2`, `bmi`, `fee`, `notes`, `patient`, `created_by_user`.

### `TriageSettings` (singleton, `pk=1`)

Critical thresholds: `spo2_min`, `spo2_warning_level`, `systolic_min/max`,
`diastolic_min/max`, `temperature_min/max`, `pulse_min/max`, `is_active`.
`AttendanceProcessSerializer.has_critical_triage` compares a visit's triage
against these; the frontend mirrors the logic in `src/utils/triage-flags.js`.

### `Consultation`

Doctor's clinical note: `doctor`, `patient`, `diagnosis`, `doctors_note`,
`signs_and_symptoms`, `attendance_process` (one-to-one, reverse name
`clinical_note`).

### `Prescription` and `PrescribedDrug`

- `Prescription`: `date_created`, `start_date`, `created_by`.
- `PrescribedDrug` (reverse `prescription.attendance_prescribed_drugs`):
  `item` (inventory Item), `dosage`, `frequency`, `duration`, `quantity`, `note`,
  `is_dispensed`, `is_billed`. Unique per `(prescription, item)`.

`frequency` and `duration` are free text but the inpatient dose scheduler
parses them as integers (doses/day, days).

### `Referral`

`service` (general, dentist, cardiologist, ...), `type` (`internal/external`),
`referred_by` (required), `reffered_doctor`, `preferred_provider`,
`provider_email_contact`, `note`, `patient`, `attendance_process`
(one-to-one, reverse `referral`).

## Signals (`signals.py`)

| Signal | Effect |
| --- | --- |
| `pre_save AttendanceProcess` | When `doctor` changes, pushes a message to the `doctor_notifications` WebSocket group |
| `post_save PrescribedDrug` (created) | Reserves stock for the drug at the Pharmacy location for 24 h (`inventory.services.stock.reserve`). Insufficient stock is logged, not raised — billing is where the hard stop is |

Stock actually leaves when the drug's invoice line is billed; see
[billing.md](billing.md#billing-and-stock).

## Endpoints (`/patients/...`)

Router resources (full CRUD):

| Path | ViewSet | Notes |
| --- | --- | --- |
| `patients/` | `PatientViewSet` | `IsReceptionistUser`; filter by `first_name`, `second_name`, `gender`, `user_id__id` |
| `contact-details/` | `ContactDetailsViewSet` | |
| `next-of-kin/` | `NextOfKinViewSet` | |
| `publicappointments/` | `PublicAppointmentViewSet` | |
| `prescriptions/` | `PrescriptionViewSet` | |
| `prescribed-drugs/` | `PrescribedDrugViewSet` | filter `prescription`, `item_ID__id` |
| `consultations/` | `ConsultationViewSet` | writes blocked when `doctor` module is off |
| `referrals/` | `ReferralViewSet` | writes blocked when `doctor` module is off |
| `triage/` | `TriageViewSet` | writes blocked when `triage` module is off |
| `initiate-attendance-process/` | `AttendanceProcessViewSet` | Visits. `?track=`, `?search=` over patient, staff, diagnosis, tests and drugs. `created_by` set from the request |

Other paths:

| Path | Purpose |
| --- | --- |
| `GET patient-profile/`, `GET patients/<user_id>/` | Patient record for a user |
| `GET prescribed-drugs/by_patient_id/<patient_id>/` | A patient's prescribed drugs |
| `GET prescribed-drugs/by-prescription/<prescription_id>/` | Drugs on one prescription |
| `GET/PATCH triage-settings/` | Read/update `TriageSettings` |
| `GET reports/download_prescription_pdf/<prescription_id>/` | Prescription PDF (`templates/prescription.html`) |
| `GET reports/lab-tests/` | Lab tests report PDF |

`AttendanceProcessSerializer` returns, besides model fields: `patient_name`,
`insurances`, `invoice_items`, `assigned_doctor`, `referral`, `clinical_note`,
`has_critical_triage`, `has_approved_lab_results`.

## WebSocket

`ws/doctor_notifications/` → `DoctorAppointmentNotificationConsumer`. All
connected clients join one group and receive `{"message": ...}`.

## Management command

`export_patients` — export patient records.

## Tests

`patient/tests/test_patient_signals.py`.

## Known issues

- `Patient.email` is declared twice; the second (`EmailField(null=True)`, not
  unique) wins. `PublicAppointment` likewise declares `email` twice and has both
  `phone` and `phone_number`.
- `unique_id` generation reads the latest patient and adds one, with no lock, so
  two concurrent registrations can collide on the unique constraint.
- The doctor notification message is literally `"Dr. doctor_name, ..."`: the name
  lookup is commented out and the placeholder is a string.
- `ConsultationViewSet` is defined twice in `views.py`; the second definition
  (without `ConsultationFilter`) wins.
- `Patient.age` ignores month/day, so it is off by one before the birthday.
