# pharmacy — drugs, public prescriptions and pharmacy metrics

`backend/pharmacy/` · mounted at `/pharmacy/`

A thin module. Drug **stock and prices** live in [inventory](inventory.md) (items
with `category='Drug'`) and drug **orders** in [patient](patient.md)
(`PrescribedDrug`); dispensing happens when the drug's invoice line is billed
([billing](billing.md#billing-and-stock)). This app adds drug classification,
public prescription uploads, feedback, the pharmacy dashboard and the ward
medication WebSocket.

## Models

| Model | Key fields |
| --- | --- |
| `Drug` | `item` (1:1 → inventory `Item`, reverse `drug_details`), `category`, `mode`, `state` |
| `DrugCategory` | `name` (unique), `description` |
| `DrugMode` | `name` (unique) — route of administration |
| `DrugState` | `name` (unique) — e.g. tablet, syrup |
| `PublicPrescriptionRequest` | `patient`, uploaded `public_prescription` file (pdf/png/jpg), `status` (`pending/confirmed/cancelled`) |
| `DrugsFeedback` | `user`, `drug` (Item), `feedback` |

## Endpoints (`/pharmacy/...`)

| Path | Purpose |
| --- | --- |
| `drugs/`, `drug-categories/`, `drug-modes/`, `drug-states/` | Drug metadata CRUD |
| `public-prescription-requests/` | Uploaded prescriptions |
| `GET public-prescription/by_patient_id/<patient_id>/` | A patient's uploads |
| `drugs-feedback/` | Feedback CRUD |
| `GET pharmacy-dashboard-metrics/` | Dashboard numbers |
| `GET print-pharmacy-report/` | Dashboard PDF |

## Helpers (`helpers.py`)

Used by the inpatient medication task:

- `get_active_prescriptions(end_time)` — prescriptions attached to a visit with
  `start_date <= end_time`.
- `get_due_doses(drug, start, end)` — dose times in the window, from integer
  `frequency` (doses/day) and `duration` (days), starting at the prescription's
  `date_created`.

## WebSocket

`ws/pharmacy_notifications/<ward_id>/` → `MedicationNotificationConsumer`.
Clients join `ward_<ward_id>_notifications` and receive
`{"type": "notification", "message": ...}` from
`inpatient.tasks.send_ward_websocket_task`.

## Frontend

Pages under `/dashboard/phamarcy/` (sic): dashboard, pharmacy inventory,
create invoice, create requisition, public prescriptions, settings.

## Known issues

- No viewset sets `permission_classes`; all use the default `IsAuthenticated`.
- `get_active_prescriptions` compares a `DateField` (`start_date`) with a
  datetime, and prescriptions with a null `start_date` (the default for visit
  prescriptions) are never returned.
- `get_due_doses` treats any non-integer `frequency`/`duration` (e.g. `"BD"`,
  `"5 days"`) as invalid and skips the drug.
- The route and folder are spelled `phamarcy` in the frontend.
