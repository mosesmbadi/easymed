# company — tenant, branches, insurers and facility type

`backend/company/` · mounted at `/company/`

One deployment serves one tenant. The tenant's details live in a single
`Company` row, and its **facility type** decides which modules exist.

## Models

### `Company`

| Field | Notes |
| --- | --- |
| `name`, `address1/2`, `phone1/2`, `email1/2`, `logo` | Printed on PDFs |
| `patient_id_prefix` | Prefix for patient numbers, e.g. `ESMED-` (see [patient.md](patient.md)) |
| `facility_type` | `hospital` (default) or `standalone_lab`. Set at onboarding; read-only via the API |

- `Company.current()` — the tenant (`objects.first()`).
- `disabled_modules` / `module_enabled(module)` — derived from `DISABLED_MODULES`.

| Facility type | Disabled modules |
| --- | --- |
| `hospital` | none |
| `standalone_lab` | `reception`, `triage`, `doctor`, `inpatient`, `radiology` |

Patients, lab, pharmacy, billing, finance, inventory and reports are on everywhere.

### `CompanyBranch`

`name`, `company`, `address`, `phone`, `email`, `logo`.

### `InsuranceCompany`

`name`. Creating one automatically creates a matching `billing.PaymentMode`
(`payment_category='insurance'`, `insurance=<this>`); deleting it deletes that
mode. Patients link to insurers through `Patient.insurances`; per-item insurer
prices live in `inventory.InsuranceItemSalePrice`.

## Module switching (`facility.py`)

Two halves keep a switched-off module off:

**Backend — `FacilityModuleMiddleware`.** For any non-safe method
(`POST/PUT/PATCH/DELETE`) it matches the path against:

| Path prefix | Module |
| --- | --- |
| `/inpatient/` | `inpatient` |
| `/patients/triage/` | `triage` |
| `/patients/consultations/` | `doctor` |
| `/patients/referrals/` | `doctor` |

and returns `403 {"detail": "The <module> module is not available to a <facility>."}`
if the module is disabled. Reads still work, so a lab screen can render an empty
triage on a visit. With no `Company` row (fresh install) nothing is blocked.

It is a middleware rather than a permission class because some inpatient views
evaluate their `permission_classes` with `any()`, so an extra class there would
be bypassed.

**Frontend — `useFacility()`.** Reads `GET /company/facility/`, hides menu items
tagged with a `module`, and blocks those routes. See
[frontend.md](frontend.md#facility-gating).

`TRACK_MODULES` maps `AttendanceProcess.track` values to modules.
`patient.serializers.AttendanceProcessSerializer.validate_track` uses it to
refuse moving a visit onto a disabled module's queue.

## Endpoints

| Method & path | View | Access |
| --- | --- | --- |
| `GET facility/` | `FacilityView` | any signed-in user. Returns `{facility_type, disabled_modules}` |
| `company/` (router) | `CompanyViewSets` | `IsSystemsAdminUser` **and** `IsNurseUser` |
| `company-branch/` (router) | `CompanyBranchViewSets` | default |
| `insurance-companies/` (router) | `InsuranceCompanyViewSet` | default |

## Known issues

- `CompanyViewSets.permission_classes = (IsSystemsAdminUser, IsNurseUser)` requires
  **both** to pass. Combined with the `IsSystemsAdminUser` bug (see
  [authperms.md](authperms.md#known-issues)) only superusers can reach it. It was
  probably meant to be `IsSystemsAdminUser | IsNurseUser`, or sysadmin only.
- `Company.logo` accepts `pdf` and `img` extensions, which won't render as an image.
