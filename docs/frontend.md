# Frontend (`front-end/`)

Next.js 14 (pages router) app. Staff use the `/dashboard` area; patients use the
landing page, booking pages and `/patient-overview`.

## Stack

Next.js 14.2, React, Redux Toolkit + react-redux, MUI 5 (+ date pickers),
DevExtreme (data grids), Tailwind, Formik + Yup, axios, jwt-decode,
react-toastify, jsPDF/html2canvas. Built with `output: "standalone"` for Docker.

## Running

```
npm install
npm run dev          # or: npm run build && npm start
```

Environment (`.env` next to `src/` when run outside Docker):

| Variable | Use |
| --- | --- |
| `NEXT_PUBLIC_BACKEND_URL` | Django base URL, used by the server-side proxy routes and media rewrites |
| `NEXT_PUBLIC_HMIS_VERSION` | Shown in the UI |
| `NEXT_PUBLIC_CURRENCY_CODE`, `_SYMBOL`, `_LOCALE`, `_FRACTION_DIGITS`, `_DISPLAY` | Money formatting (`src/functions/money.js`) |

`next.config.js` rewrites `/backend-media/:path*` → `${NEXT_PUBLIC_BACKEND_URL}/images/:path*`
so the browser never needs the Docker-internal backend hostname for uploads.

## Directory layout (`src/`)

| Path | Contents |
| --- | --- |
| `pages/` | Routes (see below) |
| `pages/api/` | Server-side proxy routes to Django |
| `components/` | UI, grouped by area (`dashboard/<module>`, `layout`, `landing-page`, `patient-profile`, `common`, ...) |
| `components/use-context/` | `AuthProvider` — login, logout, token state, permission loading |
| `redux/features/<area>/` | Slices + thunks |
| `redux/service/<area>/` | axios calls used by the thunks |
| `assets/api-endpoints.js` | `API_URL` (backend paths) and `APP_API_URL` (proxy paths) |
| `assets/backend-axios-instance/` | axios instance with `baseURL = NEXT_PUBLIC_BACKEND_URL` (server side) |
| `assets/hooks/` | `use-auth`, `use-axios`, `use-permission`, `use-facility`, form hooks |
| `assets/hoc/` | `AuthGuard`, `ProtectedRoute`, `NotAuthorized`, `patient-confirmed` |
| `assets/menu.js` | Sidebar definition and dashboard card definitions |
| `functions/` | `money.js`, `inventory.js`, `tables.js` helpers |
| `utils/` | `triage-flags.js` (critical-vitals logic), `lab-items.js` |
| `styles/` | `globals.css`, MUI theme, DevExtreme overrides |

## Request path

```
Component → redux thunk → redux/service/* → UseAxios(auth)  ──►  /api/<area>/<route>  (Next.js API route)
                                                                     │ forwards Authorization header
                                                                     ▼
                                                     backendAxiosInstance → Django  API_URL.<NAME>
```

- `API_URL` holds Django paths (e.g. `WALK_IN_LAB_REQUESTS`).
- `APP_API_URL` holds the matching Next.js proxy paths.
- Each file in `pages/api/` checks the method, requires an `Authorization`
  header, forwards the request, and passes the backend's status and body back.
- Proxy areas: `ai-triage`, `announcement`, `appointment`, `auth`, `billing`,
  `company`, `doctor`, `groups`, `inpatient`, `insurance`, `inventory`,
  `laboratory`, `nurses`, `nursing`, `order-bills`, `patient`, `patient-profile`,
  `pdf`, `pharmacy`, `register`, `reports`, `user`, `fetch-rss`.

Adding a backend endpoint to the UI therefore means: add to `API_URL`, add a
proxy route under `pages/api/`, add to `APP_API_URL`, add a service function and
(usually) a thunk.

## Authentication

`components/use-context/index.js` (`AuthProvider`):

1. `loginUser(email, password)` posts to the login proxy, stores `access` and
   `refresh` in `localStorage` (`token`, `refresh`), decodes the access token into
   the context `user` (`user_id`, role, ...).
2. Loads the user's permission names into Redux `auth.userPermissions`.
3. `isTokenValid(token)` checks JWT `exp`.
4. `logoutUser()` clears storage and redirects.

`assets/hooks/use-axios.js` builds an axios instance with the bearer token. On
a `401` it refreshes once through the proxy, stores the new tokens, fires the
`easymed:token-refreshed` window event (the context listens and swaps its token),
and retries; if the refresh fails it clears storage and sends the user to
`/auth/login`.

Page guards, applied through each page's `getLayout`:

```jsx
Page.getLayout = (page) => (
  <ProtectedRoute permission="CAN_ACCESS_LABORATORY_DASHBOARD">
    <AuthGuard>
      <DashboardLayout>{page}</DashboardLayout>
    </AuthGuard>
  </ProtectedRoute>
);
```

- `AuthGuard` redirects to `/auth/login` when there is no user.
- `ProtectedRoute` renders `NotAuthorized` unless the token is valid **and** the
  user has the named permission.
- `usePermission`, `useAnyPermission`, `useAllPermissions` gate smaller pieces of UI.

Permissions come from the user's group; see [authperms.md](authperms.md).

## Facility gating

`assets/hooks/use-facility.js` reads `store.company.facility`
(`GET /company/facility/`).

- `MODULE_ROUTES` maps modules to route prefixes:
  `reception` → `/dashboard/reception*`, `triage` → `/dashboard/nursing-station`,
  `doctor` → `/dashboard/doctor-desk`, `inpatient` → `/dashboard/admit`,
  `radiology` → `/dashboard/radiology`.
- The sidebar hides menu entries whose `module` is disabled.
- `DashboardLayout` blocks a page whose route belongs to a disabled module.
- While the facility is loading, switchable modules read as **off**, so a lab
  never sees hospital menus flash up.
- If the request **fails**, they read as **on**, so a hospital never loses
  Doctor Desk to a network blip. `DashboardLayout` then retries with backoff
  (5s, 10s, 20s... up to six times). The backend still refuses writes to a
  module that really is off.
- `isLabFirst` (no check-in module) switches the home page to the lab shortcuts.
  It depends on the modules, not on the facility type, so a `custom` facility
  without check-in gets them too.

The backend enforces the same rule on writes; see [company.md](company.md).

## Redux store

Slices (`redux/store.js`): `auth`, `patient`, `inventory`, `insurance`,
`appointment`, `doctor`, `laboratory`, `billing`, `prescription`, `user`,
`announcement`, `menu`, `company`, `inpatient`.

## Routes

### Public / patient

| Route | Purpose |
| --- | --- |
| `/` | Landing page |
| `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset/...` | Auth |
| `/book-appointment` | Public appointment / lab service booking |
| `/patient-overview/...` | Signed-in patient: profile, bookings, lab requests, prescriptions |
| `/account/profile`, `/account/announcements` | Own account |

### Staff dashboard (`/dashboard/...`)

| Route | Module | Permission |
| --- | --- | --- |
| `patients/`, `patients/prescribe/[patient_id]`, `patients/referrals` | Patients | `CAN_ACCESS_PATIENTS_DASHBOARD` |
| `reception/check-in`, `reception-interface/...` | Reception | `CAN_ACCESS_RECEPTION_DASHBOARD` |
| `nursing-station/`, `nursing-station/settings` | Triage | `CAN_ACCESS_NURSING_DASHBOARD` |
| `doctor-desk/`, `doctor-desk/[process_id]/[prescription_id]` | Doctor | `CAN_ACCESS_DOCTOR_DASHBOARD` |
| `laboratory/` — requests, results, add-results, patient-sample, sample-archive, lab-inventory, lab-settings, public-lab-requests, walk-in | Lab | `CAN_ACCESS_LABORATORY_DASHBOARD` |
| `phamarcy/` — inventory, create-invoice, create-requisition, public-prescriptions, settings | Pharmacy | `CAN_ACCESS_PHARMACY_DASHBOARD` |
| `radiology/` | Radiology | — |
| `admit/` — patients, wards, admission detail, settings | Inpatient | — |
| `billing/` — create-invoice, invoices, payments, overdue, report, settings | Billing | `CAN_ACCESS_BILLING_DASHBOARD` |
| `finance/` — accounts-receivable, accounts-payable (requisitions, purchase orders, receive items, supplier invoices, payments, aging), cash-equivalents | Finance | — |
| `inventory/` — items, add-inventory, requisitions, purchase orders, incoming items, supplier invoices, stock movements, report | Inventory | `CAN_ACCESS_INVENTORY_DASHBOARD` |
| `announcements/` | Announcements | `CAN_ACCESS_ANNOUNCEMENT_DASHBOARD` |
| `ai-assistant/` | AI triage ([roby](roby.md)) | `CAN_ACCESS_AI_ASSISTANT_DASHBOARD` |
| `admin-interface/`, `admin-interface/docs` | Users, groups, permissions | `CAN_ACCESS_ADMIN_DASHBOARD` |

The permission column is what `assets/menu.js` requires; individual pages set
their own `ProtectedRoute` permission.

## Known issues

- Tokens are kept in `localStorage`, readable by any script on the page.
- `AuthProvider` creates a `SimpleCrypto` instance with a hard-coded key in the
  bundle; anything "encrypted" with it is not secret.
- `AuthProvider.loginUser` logs the full login response (including tokens) to the
  console.
- `API_URL` still contains endpoints the backend no longer has (e.g.
  `/patients/appointments/`, `/patients/services/`) and password-reset paths
  under `/customuser/` instead of `/users/`.
- `APP_API_URL.BASE_URL` defaults to `http://localhost:8000`, but the backend
  listens on 8080.
- `react`, `react-dom`, `eslint`, `tailwindcss` etc. are pinned to `latest`,
  so builds are not reproducible.
- `pages/api/hello.js` is the Next.js scaffold example.
