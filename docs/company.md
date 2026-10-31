# company — the facility profile, branches, credit accounts and modules

`backend/company/` · mounted at `/company/`

One deployment serves one facility. Its details live in the **facility
profile**: a single `Company` row. Any other organisation the facility deals
with is **not** a `Company`:

| Organisation | Model |
| --- | --- |
| Insurer, employer, clinic that sends samples | `InsuranceCompany` (credit account) |
| Supplier | `inventory.Supplier` |

## Models

### `Company`: the facility profile

| Field | Who sets it | Notes |
| --- | --- | --- |
| `name`, `address1/2`, `phone1/2`, `email1/2`, `logo` | facility admin | Printed on PDFs |
| `patient_id_prefix` | facility admin | Prefix for patient numbers, e.g. `ESMED-` (see [patient.md](patient.md)) |
| `kra_pin` | facility admin | Printed on invoices; the KRA PIN eTIMS uses unless `ETIMS_PIN` is set |
| `facility_type` | platform (Django admin) | `hospital`, `standalone_lab` or `custom`. Read-only through the API |
| `enabled_modules` | platform (Django admin) | Switchable modules the facility has. Set from the facility type unless it is `custom` |

- **There is only one.** `save()` refuses a second row, and Django admin offers
  no Add once it exists and no Delete. Nothing should call
  `Company.objects.first()`. Use `Company.current()`, which returns `None`
  before the profile is set up.
- `disabled_modules` and `module_enabled(module)` are derived from `enabled_modules`.

**Facility type presets.** A type other than `custom` overwrites
`enabled_modules` on every save. That includes `save(update_fields=['facility_type'])`,
which also writes the modules.

| Facility type | Modules on |
| --- | --- |
| `hospital` | `reception`, `triage`, `doctor`, `inpatient`, `radiology` |
| `standalone_lab` | none |
| `custom` | whatever is ticked, e.g. a lab that also does imaging: `radiology` |

Patients, lab, pharmacy, billing, finance, inventory and reports are on everywhere.

### `CompanyBranch`

`name`, `company`, `address`, `phone`, `email`, `logo`. `company` is always the
facility profile: the API sets it and won't take it from the client.

### `InsuranceCompany`: credit accounts

Someone other than the patient who is billed for the patient's care and
settles later. `account_type` is one of:

| Type | Unagreed price | Lines at the till |
| --- | --- | --- |
| `insurer` | the patient pays cash | wait for the cashier |
| `corporate` (employer) | the account pays the price list | billed on raising (`bills_on_account`) |
| `facility` (referring clinic) | the account pays the price list | billed on raising |

Also: `contact_person`, `email`, `phone`, `address`.

- **Payment mode.** Creating an account creates its `billing.PaymentMode`
  (`payment_category='insurance'` for every type), and renaming the account
  renames the mode.
- **Patients and prices.** Patients link to insurers and employers through
  `Patient.insurances`. Agreed prices live in `inventory.InsuranceItemSalePrice`.
- **Statements.** Monthly statements are in `billing.statements`
  (see [billing.md](billing.md)).

## Module switching (`facility.py`)

Two halves keep a switched-off module off:

**Backend: `FacilityModuleMiddleware`.** For any non-safe method
(`POST/PUT/PATCH/DELETE`) it matches the path against:

| Path prefix | Module |
| --- | --- |
| `/inpatient/` | `inpatient` |
| `/patients/triage/` | `triage` |
| `/patients/consultations/` | `doctor` |
| `/patients/referrals/` | `doctor` |

and returns `403 {"detail": "<Module> is not switched on for this facility."}`.

- **Reads still work,** so a lab screen can render an empty triage on a visit.
- **Before the profile exists** (a fresh install), nothing is blocked.
- **Radiology** has no backend yet, so it has nothing to guard.
- **Why a middleware:** some inpatient views evaluate their `permission_classes`
  with `any()`, so an extra permission class there would be bypassed.

**Frontend: `useFacility()`.** Reads `GET /company/facility/`, hides menu items
tagged with a `module`, and blocks those routes. If that request fails, every
module shows and the request is retried. See
[frontend.md](frontend.md#facility-gating).

`TRACK_MODULES` maps `AttendanceProcess.track` values to modules.
`patient.serializers.AttendanceProcessSerializer.validate_track` uses it to
refuse moving a visit onto a disabled module's queue.

## Endpoints

| Method & path | View | Access |
| --- | --- | --- |
| `GET facility/` | `FacilityView` | any signed-in user. Returns `{facility_type, enabled_modules, disabled_modules, module_labels}` |
| `GET profile/` | `FacilityProfileView` | any signed-in user. 404 before it is set up |
| `PATCH/PUT profile/` | `FacilityProfileView` | `IsSystemsAdminUser`. The first save creates it; `facility_type` and `enabled_modules` are ignored |
| `company-branch/` (router) | `CompanyBranchViewSets` | default |
| `insurance-companies/` (router) | `InsuranceCompanyViewSet` | default. `?account_type=` filters |

## Known issues

- `Company.logo` accepts `pdf` and `img` extensions, which won't render as an image.
- The middleware reads the facility profile on every write request. That's
  cheap, but it could be cached.
