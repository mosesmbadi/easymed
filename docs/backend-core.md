# Backend core (`backend/easymed`)

The Django project package: settings, the root URLconf, Celery and ASGI wiring.

## Layout

| File | Purpose |
| --- | --- |
| `settings/base.py` | All real configuration |
| `settings/development.py`, `settings/production.py` | Import `base`, set `DEBUG=True`, `ALLOWED_HOSTS=["*"]` (currently identical) |
| `settings/testing.py` | In-memory SQLite, eager Celery, logging off; used by `pytest.ini` |
| `urls.py` | Root URLconf |
| `celery.py` | Celery app (`easymed`), autodiscovers `tasks.py` in each app |
| `asgi.py` | HTTP + WebSocket routing (Channels) |
| `wsgi.py` | WSGI entry point |
| `helpers.py` | Dose-scheduling helpers (duplicate of `pharmacy/helpers.py`, see Known issues) |

## Installed apps

Third-party: `rest_framework`, `drf_spectacular`, `rest_framework_simplejwt`
(+ token blacklist), `weasyprint`, `django_filters`, `corsheaders`, `channels`,
`django_extensions`, `django_celery_beat`, `django_prometheus`.

Local: `authperms`, `customuser`, `patient`, `pharmacy`, `inventory`,
`laboratory`, `receptions`, `billing`, `announcement`, `inpatient`, `company`,
`reports`, `roby`.

## Middleware

Standard Django stack plus:

- `corsheaders.middleware.CorsMiddleware` — origins `localhost:3000`, `127.0.0.1:3000`, `192.168.100.46:3000`.
- `company.facility.FacilityModuleMiddleware` — refuses writes to modules the
  facility type has switched off. See [company.md](company.md).
- `django_prometheus` before/after middleware — request metrics at `/metrics`.

## Key settings

| Setting | Value / source |
| --- | --- |
| `AUTH_USER_MODEL` | `customuser.CustomUser` |
| `TIME_ZONE` / `CELERY_TIMEZONE` | `Africa/Nairobi` |
| `DATABASES` | Postgres from env: `DB_ENGINE`, `POSTGRES_DB/USER/PASSWORD/HOST/PORT` |
| `REST_FRAMEWORK` | Default `IsAuthenticated`, `JWTAuthentication`, spectacular schema |
| `SIMPLE_JWT` | Access 30 min, refresh 7 days, rotate + blacklist on refresh |
| `EASYMED_CURRENCY_*` | `CURRENCY_CODE` (default `KES`), `CURRENCY_SYMBOL`, `CURRENCY_FRACTION_DIGITS` |
| `MEDIA_URL` / `MEDIA_ROOT` | `/images/` → `easymed/static/images` |
| `STATIC_ROOT` | `easymed/staticfiles` |
| `CHANNEL_LAYERS` | Redis at `redis:6379` |
| `CELERY_BROKER_URL` / `RESULT_BACKEND` | env, default `redis://redis:6379/0` |
| `EMAIL_*` | All from env; required at import time |
| `PASSWORD_RESET_TIMEOUT` | 600 s |

## Root URLs

| Prefix | App |
| --- | --- |
| `admin/` | Django admin |
| `announcement/` | [announcement](announcement.md) |
| `patients/` | [patient](patient.md) |
| `lab/` | [laboratory](laboratory.md) |
| `billing/` | [billing](billing.md) |
| `inventory/` | [inventory](inventory.md) |
| `authperms/` | [authperms](authperms.md) |
| `users/` | [customuser](customuser.md) |
| `reports/` | [reports](reports.md) |
| `pharmacy/` | [pharmacy](pharmacy.md) |
| `company/` | [company](company.md) |
| `inpatient/` | [inpatient](inpatient.md) (namespace `inpatient`) |
| `roby/` | [roby](roby.md) |
| `''` | Prometheus (`/metrics`) |
| `api/schema/`, `docs/`, `docs/swagger/` | OpenAPI schema, ReDoc, Swagger UI |

Top-level PDF shortcuts (also reachable inside their apps):

| Path | View |
| --- | --- |
| `download_invoice_pdf/<invoice_id>/` | `billing.views.download_invoice_pdf` |
| `download_requisition_pdf/<requisition_id>/` | `inventory.views.download_requisition_pdf` |
| `download_labtestresult_pdf/<processtestrequest_id>/` | `laboratory.views.download_labtestresult_pdf` |
| `download_prescription_pdf/<prescription_id>/` | `patient.views.download_prescription_pdf` |
| `download_purchase_order_pdf/<purchaseorder_id>/` | `inventory.views.download_purchaseorder_pdf` |
| `download_receipt_note_pdf/<purchase_order_id>/` | `inventory.views.download_goods_receipt_note_pdf` |
| `sale_by_date/`, `sale_by_date/pdf/`, `serve_sales_by_item_id_pdf/` | `reports.views` |

The `receptions` app is installed but **not** mounted.

## WebSockets (`asgi.py`)

Wrapped in `AuthMiddlewareStack` (session auth — JWT is not checked on sockets).

| Path | Consumer | Group |
| --- | --- | --- |
| `ws/doctor_notifications/` | `patient.consumers.DoctorAppointmentNotificationConsumer` | `doctor_notifications` |
| `ws/inventory_notifications/` | `inventory.consumers.InventoryNotificationConsumer` | inventory alerts |
| `ws/pharmacy_notifications/<ward_id>/` | `pharmacy.consumers.MedicationNotificationConsumer` | `ward_<id>_notifications` |

Sockets need an ASGI server. `requirements.txt` has `uvicorn` but not `daphne`,
and the local compose runs `manage.py runserver` (WSGI), so WebSocket endpoints
are only served if the backend is started with the commented-out
`uvicorn ... easymed.asgi:application` command instead.

## Celery beat schedule

`CELERY_BEAT_SCHEDULER` is the database scheduler, so these defaults are seeded
into `django_celery_beat` and can be edited in the admin.

| Name | Task | Schedule |
| --- | --- | --- |
| `check_inventory_reorder_levels` | `inventory.tasks.check_inventory_reorder_levels` | `crontab(minute='*/600')` |
| `write_off_expired_stock` | `inventory.tasks.write_off_expired_stock` | daily 01:00 |
| `expire_stale_stock_reservations` | `inventory.tasks.expire_stale_reservations` | every 30 min |
| `reconcile_stock_balances` | `inventory.tasks.reconcile_stock_balances` | daily 02:00 |
| `check-medication-notifications` | `inpatient.tasks.check_medication_notifications` | `crontab(minute='*/60')` |

## Testing

`backend/pytest.ini` sets `DJANGO_SETTINGS_MODULE = easymed.settings.testing`,
`--reuse-db --nomigrations`. Tests live in `<app>/tests/` (billing, customuser,
inpatient, inventory, laboratory, patient). Run inside the backend container:

```
docker exec easymed-backend pytest
```

## Known issues

- `crontab(minute='*/600')` and `crontab(minute='*/60')`: minute steps above 59
  only ever match minute 0, so both run **hourly**, not every 10 h / 60 min as
  the names suggest.
- `DEBUG = True` and `ALLOWED_HOSTS = ["*"]` are hard-coded in `base.py` and in
  `production.py`; the `DEBUG` env var in `.env.sample` is never read.
- `asgi.py` defaults `DJANGO_SETTINGS_MODULE` to `easymed.settings` (a package
  with an empty `__init__`), while `celery.py` defaults to `easymed.settings.base`.
  Both rely on the env var being set by compose.
- `STATICFILES_DIRS` lists `frontend/build/static`, which does not exist.
- `easymed/helpers.py` is an older copy of `pharmacy/helpers.py` (it filters on
  `attendanceprocess__in`, which is not the reverse accessor name). Only the
  pharmacy copy is imported.
