# EasyMed HMIS — Module Documentation

EasyMed (Make-Easy HMIS) is a hospital management information system. It runs a
patient's visit end to end (registration, triage, consultation, lab, pharmacy,
billing, admission) and the back office behind it (inventory, procurement,
accounts receivable and payable, reports).

The same codebase also serves a **standalone lab**: a deployment whose
`Company.facility_type` is `standalone_lab` has the clinical modules (reception
check-in, triage, doctor, inpatient, radiology) switched off. See
[company.md](company.md).

## Stack

| Layer | Technology |
| --- | --- |
| Backend API | Django 4.2 + Django REST Framework, JWT auth (SimpleJWT), drf-spectacular |
| Async work | Celery worker + Celery beat (DB scheduler), Redis broker |
| Realtime | Django Channels over Redis (WebSocket notifications) |
| Database | PostgreSQL 15 |
| PDFs | WeasyPrint, from Django templates |
| Frontend | Next.js 14 (pages router), Redux Toolkit, MUI, DevExtreme, Tailwind |
| Lab machines | `hl7-astm-parser` (LIS server) container |
| Ops | Docker Compose, Nginx + Certbot, Prometheus, pg_dump backup container, GitHub Actions, Terraform (AWS Lightsail) |

## How the pieces fit

```
Browser ──► Next.js (3000)
              │  pages/        UI
              │  pages/api/    thin proxy routes ─────────┐
              │                                          ▼
              └──────────── WebSocket ─────────► Django (8080)
                                                   │  REST apps (patient, lab, billing, ...)
                                                   │  Channels consumers (ws/...)
                                                   ├──► PostgreSQL
                                                   └──► Redis ◄── Celery worker / beat
LIS server (9091) ◄──► lab analysers; posts results back to the backend
```

## The visit, in one paragraph

A visit is an `AttendanceProcess` (patient app). Creating one also creates the
visit's `Invoice`, its `ProcessTestRequest` (lab container), an empty `Triage`
and an empty `Prescription`. The visit moves through `track` values
(`reception → triage → doctor → lab → pharmacy → billing → complete`, or
`inpatient`). Doctors order lab tests (`LabTestRequest` / `LabTestRequestPanel`)
and drugs (`PrescribedDrug`); each becomes an `InvoiceItem`. Marking an invoice
line **billed** prices it once and issues stock through the inventory ledger.
Payments are allocated against invoice lines.

## Module index

### Backend (`backend/`)

| Doc | App | Purpose |
| --- | --- | --- |
| [backend-core.md](backend-core.md) | `easymed` | Settings, root URLs, Celery, ASGI/WebSockets, beat schedule |
| [customuser.md](customuser.md) | `customuser` | User model, roles, login/JWT, password reset, demo-data generator |
| [authperms.md](authperms.md) | `authperms` | Groups, named permissions, DRF role permission classes |
| [company.md](company.md) | `company` | Tenant (company), branches, insurers, facility type & module switching |
| [patient.md](patient.md) | `patient` | Patients, visits (AttendanceProcess), triage, consultation, prescriptions, referrals |
| [billing.md](billing.md) | `billing` | Invoices, invoice lines & pricing, payments, allocation, accounts |
| [inventory.md](inventory.md) | `inventory` | Item catalogue, prices, stock ledger, procurement, supplier payments |
| [laboratory.md](laboratory.md) | `laboratory` | Test catalogue, requests, samples, results, reagents, archive, walk-ins |
| [inpatient.md](inpatient.md) | `inpatient` | Wards, beds, admissions, schedules, discharge, nurse assignment |
| [pharmacy.md](pharmacy.md) | `pharmacy` | Drug metadata, public prescriptions, feedback, pharmacy metrics |
| [reports.md](reports.md) | `reports` | Sales PDFs, payment-mode report, gross margin |
| [roby.md](roby.md) | `roby` | AI triage assistant (Google Gemini) |
| [announcement.md](announcement.md) | `announcement` | Internal channels, announcements, comments |
| [receptions.md](receptions.md) | `receptions`, `utils` | Legacy / stub reception endpoints and small helpers |

### Frontend and operations

| Doc | Covers |
| --- | --- |
| [frontend.md](frontend.md) | Next.js app: routing, auth, permissions, facility gating, Redux, API proxy |
| [infrastructure.md](infrastructure.md) | Docker Compose files, env vars, Nginx, Prometheus, backups, CI/CD, Terraform, LIS |

### Existing deep-dive references

These predate this set and go deeper on specific topics:

- [backend/docs/BILLING_AMOUNTS.md](../backend/docs/BILLING_AMOUNTS.md) — what each money field on an invoice line means
- [backend/docs/INVENTORY_FLOW.md](../backend/docs/INVENTORY_FLOW.md) — item → requisition → LPO → goods receipt → stock
- [backend/docs/INVENTORY_UNITS_OF_MEASURE.md](../backend/docs/INVENTORY_UNITS_OF_MEASURE.md) — base units and pack sizes
- [backend/docs/LAB_REAGENTS_SETUP.md](../backend/docs/LAB_REAGENTS_SETUP.md) — reagents, collection consumables, test panels
- [backend/docs/DEMO_DATA.md](../backend/docs/DEMO_DATA.md) — the demo data generator
- [backup/README.md](../backup/README.md) — backup and restore

## Conventions used across the backend

- **Auth**: every endpoint requires a JWT (`Authorization: Bearer <access>`) unless
  it sets `AllowAny`. Role checks use the classes in `authperms.permissions`.
- **Routers**: most apps expose DRF `ModelViewSet`s through a `DefaultRouter`, so
  each resource gets list/create/retrieve/update/destroy at `/<app>/<resource>/`.
- **API browser**: Swagger at `/docs/swagger/`, ReDoc at `/docs/`, raw schema at
  `/api/schema/`.
- **Stock**: only `inventory.services.stock` writes stock. Everything else calls it.
- **Money**: an invoice line is priced when it is billed and never repriced.
- **Fresh DB**: the project is unshipped; the DB is rebuilt and reseeded with demo
  data on each run (`GENERATE_DEMO_DATA`).
