# inpatient — wards, beds, admissions and discharge

`backend/inpatient/` · mounted at `/inpatient/` (namespace `inpatient`)

Admitted-patient care: wards and beds, admissions tied to a visit, ward rounds
(inpatient triage), medication and lab schedules, nurse-to-ward assignment and
discharge.

Disabled for `standalone_lab` facilities: every write under `/inpatient/` gets
`403` from `FacilityModuleMiddleware` (see [company.md](company.md)).

## Models

| Model | Key fields |
| --- | --- |
| `Ward` | `name` (unique), `ward_type` (`general`, `maternity`, `pediatrics`, `amenity`), `gender` (`male/female`), `capacity` |
| `Bed` | `ward`, `bed_number`, `bed_type` (`manual`, `semi_electric`, `fully_electric`, `bariatric`), `status` (`available/occupied`) |
| `PatientAdmission` | `attendance_process`, `patient`, `admission_id` (`IP-<patient unique_id>-<timestamp>`), `ward`, `bed` (1:1), `reason_for_admission`, `admitted_by`, `admitted_at`, `discharged`, `schedules` (1:1 → `Schedule`) |
| `Schedule` | Container for an admission's planned care |
| `ScheduledDrug` | `prescription_schedule`, `prescribed_drug` + timing |
| `ScheduledLabTest` | `schedule`, `lab_test_profile` / `lab_test_request` + timing |
| `InPatientTriage` | Vitals recorded during the stay, per admission |
| `PatientDischarge` | `admission` (1:1), `discharged_by`, `discharge_types` (`normal`, `referral`, `deceased`), `referral`, `discharge_notes` |
| `WardNurseAssignment` | `ward`, `nurse` (1:1 — a nurse is on one ward), `assigned_by` |

Behaviour:

- `PatientAdmission.save()` generates `admission_id`, checks the bed belongs to
  the ward, and creates a `Schedule` on first save.
- `PatientDischarge.save()` (atomic) frees the bed, clears ward/bed on the
  admission and sets `discharged=True`. `clean()` requires a `referral` for
  referral discharges and forbids it otherwise.
- `pre_delete PatientAdmission` signal frees the bed.
- Schedules are explicit: prescribing a drug does **not** create a schedule.

## Endpoints (`/inpatient/...`)

| Path | ViewSet | Access |
| --- | --- | --- |
| `patient-admissions/` | `PatientAdmissionViewSet` | doctor |
| `patient-admissions/<id>/triages/` | `InPatientTriageViewSet` | doctor, senior nurse, sysadmin\* |
| `patient-admissions/<id>/schedules/` | `ScheduleViewSet` | doctor, senior nurse, sysadmin\* |
| `patient-admissions/<id>/scheduled_drug/` | `ScheduledDrugViewSet` | doctor, senior nurse, sysadmin\* |
| `patient-admissions/<id>/scheduled_lab_test/` | `ScheduledLabTestViewSet` | doctor, senior nurse, sysadmin\* |
| `patient-admissions/<id>/discharge/` | `PatientDischargeViewset` | doctor |
| `wards/` | `WardViewSet`; `GET wards/<id>/nurses/` lists assigned nurses | default |
| `wards/<id>/beds/`, `beds/` | `BedViewSet` | default |
| `ward-nurse-assignments/` | `WardNurseAssignmentViewSet` | senior nurse, doctor, sysadmin\* |
| `discharge-summary/<admission_id>/` | `DownloadDischargeSummaryView` | Discharge summary PDF |

\* see the `IsSystemsAdminUser` issue in [authperms.md](authperms.md#known-issues).

## Background tasks

| Task | Trigger | Does |
| --- | --- | --- |
| `check_medication_notifications` | beat (hourly) | Finds undispensed drugs on prescriptions of admitted patients with doses due in the next hour and sends a per-ward message |
| `send_ward_websocket_task(ward_id, message)` | from the above | Pushes to group `ward_<id>_notifications` |
| `generate_and_email_discharge_summary(admission_id, email)` | on demand | Renders the discharge PDF (`utils.generate_discharge_summary_pdf`) and emails it |
| `celery_tasks.set_bed_status_occupied(bed_id)` | on demand | Marks a bed occupied |

Dose times come from `pharmacy.helpers.get_due_doses()`: `frequency` = doses per
day, `duration` = days, spaced evenly from the prescription's creation time.

Nurses listen on `ws/pharmacy_notifications/<ward_id>/` (consumer lives in the
pharmacy app).

## Tests

`inpatient/tests/test_admissions.py`, `inpatient/tests/test_nurse_assignments.py`.

## Known issues

- `check_medication_notifications` iterates `prescription.prescribeddrug_set`, but
  `PrescribedDrug.prescription` has `related_name="attendance_prescribed_drugs"`.
  The attribute does not exist, the task raises, is caught, and retries — so
  **medication notifications are never sent** for any prescription that reaches
  that loop.
- The same task reads `admission.bed.bed_number`; an admission without a bed
  would raise.
- `generate_admission_id()` has unreachable code after its first `return`.
- `PatientDischarge.save()` only updates the admission when it has a bed; an
  admission without a bed is never marked `discharged`.
