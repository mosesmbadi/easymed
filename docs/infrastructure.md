# Infrastructure and operations

How EasyMed is run locally, deployed, monitored and backed up.

## Compose files

| File | Use | Notes |
| --- | --- | --- |
| `docker-compose-local.yml` | Local development | Builds backend from `backend/Dockerfile.local`. Frontend service is commented out — run it with `npm run dev` |
| `docker-compose.yml` | Prod using published images | `mosesmbadi/easymedbackend`, `mosesmbadi/easymedfrontend` |
| `docker-compose-cloud.yml` | The deployed server (used by CI) | Pulls CI-built images `${IMAGE_NAMESPACE}/easymed-{backend,frontend,nginx,backup}:${IMAGE_TAG}`; adds Nginx, Certbot, Prometheus |
| `docker-compose-demo.yml` | Demo instance | Published images |

### Local services (`docker-compose-local.yml`)

| Service | Container | Port (host:container) | Command |
| --- | --- | --- | --- |
| `postgres` | `easymed-postgres` | 5433:5432 | Postgres 15 |
| `redis` | `easymed-redis` | 6379:6379 | `redis-server --appendonly yes` |
| `backend` | `easymed-backend` | 8080:8080 | `python manage.py runserver 0.0.0.0:8080` |
| `worker` | `easymed-celery-worker` | — | `celery -A easymed worker` |
| `celery-beat` | `easymed-celery-beat` | — | `celery -A easymed beat --scheduler django_celery_beat.schedulers:DatabaseScheduler` |
| `lis_server` | `easymed-lis-server` | 9091:9091 | `mosesmbadi/hl7-astm-parser` |
| `backup` | `easymed-backup` | — | cron `pg_dump` |

```
docker compose -f docker-compose-local.yml up
docker exec easymed-backend python manage.py <command>
```

Swagger: `http://127.0.0.1:8080/docs/swagger/`.

### Backend container start-up (`backend/entrypoint.sh`)

1. `collectstatic --no-input`
2. `migrate`
3. `generate_dummy_data` unless `GENERATE_DEMO_DATA` is false/0/no
4. `exec` the service command

## Environment variables (`.env` at repo root, from `.env.sample`)

| Group | Variables |
| --- | --- |
| Django | `SECRET_KEY`, `DJANGO_SETTINGS_MODULE` |
| Email | `EMAIL_BACKEND`, `EMAIL_USE_TLS`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `DEFAULT_FROM_EMAIL` (all required at start-up) |
| Celery | `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND` |
| Database | `DB_ENGINE`, `POSTGRES_HOST`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT` |
| Demo | `GENERATE_DEMO_DATA`, `DEMO_FACILITY_TYPE` (`hospital` / `standalone_lab`) |
| Currency | `CURRENCY_CODE`, `CURRENCY_SYMBOL`, `CURRENCY_FRACTION_DIGITS`, and `NEXT_PUBLIC_CURRENCY_*` for the frontend |
| Frontend | `NEXT_PUBLIC_BACKEND_URL`, `NEXT_PUBLIC_HMIS_VERSION` |
| AI | `GEMINI_API_KEY` ([roby](roby.md)) |
| LIS | `EQUIPMENT_<n>_ID/IP/PORT/TYPE/NAME/COM_MODE`, `BACKEND_USERNAME`, `BACKEND_PASSWORD`, `RESULTS_ENDPOINT`, `AUTH`, `NETWORK_*` |
| AWS (unused by Django) | `S3_BUCKET_NAME`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION` |

Inside compose, hosts are service names (`postgres`, `redis`, `backend`).

## LIS server

`mosesmbadi/hl7-astm-parser` connects to lab analysers over TCP (HL7 or ASTM),
configured by the `EQUIPMENT_*` variables, and posts results to the backend at
`RESULTS_ENDPOINT` using `BACKEND_USERNAME`/`BACKEND_PASSWORD`. Analysers are also
registered in the backend as `laboratory.LabEquipment`. See
[laboratory.md](laboratory.md#analyser-integration).

## Nginx (`nginx/`)

Used by `docker-compose-cloud.yml`:

- Port 80 serves `/.well-known/acme-challenge/` for Certbot and redirects the rest to HTTPS.
- Port 443 terminates TLS for `easymed.proto-typesolutions.com` and proxies `/`
  to `frontend:3000`.

The backend is reached by the frontend's server-side proxy routes, not directly
by the browser.

## Monitoring (`prometheus/`)

`django_prometheus` exposes `/metrics` on the backend.

`prometheus.yml` scrapes `backend:8080`, `celery:8080`, `front-end:3000` and
itself every 15 s. `rules.yml` alerts: `BackendDown`, `HighCPUUsage`,
`HighLatency`, `HighTraffic`, `HighErrorRate`, `HighSaturation`.

## Backups (`backup/`)

A container running cron `pg_dump` every 4 hours into `./backup/data/`
(`easymed_db_YYYY-MM-DD_HH-MM-SS.sql.gz`, plus `latest.sql.gz`), keeping 30 days
(`BACKUP_RETENTION_DAYS`).

```
docker compose -f docker-compose-local.yml exec backup /backup.sh         # now
docker compose -f docker-compose-local.yml exec backup /list-backups.sh
docker compose -f docker-compose-local.yml exec -it backup /restore.sh    # latest
```

Full instructions: [backup/README.md](../backup/README.md).

## CI/CD (`.github/workflows/ci-cd.yml`)

On push to `main` or `standalone-lab`:

1. **test-backend** — build `backend/Dockerfile`, run `manage.py check` and
   `pytest --ds=easymed.settings.testing` with dummy env vars (SQLite, in-memory
   Celery).
2. **build-and-push** — one matrix job per image (`backend`, `frontend`, `nginx`,
   `backup`). Builds on the GitHub runner with layer caching and pushes
   `<namespace>/easymed-<name>:<commit sha>` and `:latest` to Docker Hub. The
   frontend build includes `next lint` and the production build, so a lint
   error or compile failure stops the pipeline here, before anything is deployed.
3. **deploy** — SSH to the staging server (`STAGING_DO_SERVER_*` secrets),
   `git reset --hard <commit sha>` in `~/easymed` (for the compose file and
   mounted configs), then with `IMAGE_TAG=<commit sha>`:
   `docker compose -f docker-compose-cloud.yml pull`, `up -d --remove-orphans`,
   and remove unused images older than a week. Only one deploy runs at a time.

Required GitHub settings:

| Kind | Name | Purpose |
| --- | --- | --- |
| Secret | `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN` | Push to Docker Hub (use an access token with Read & Write) |
| Secret | `STAGING_DO_SERVER_PRIVATE_KEY`, `STAGING_DO_SERVER_IP`, `STAGING_DO_SERVER_USERNAME` | SSH deploy |
| Variable (optional) | `DOCKERHUB_NAMESPACE` | Docker Hub user/org for the images; default `mosesmbadi` |
| Variable (optional) | `NEXT_PUBLIC_BACKEND_URL`, `NEXT_PUBLIC_HMIS_VERSION` | Baked into the frontend image; defaults `http://api:8080/`, `v0.0.1` |

**Rolling back** on the server:

```
cd ~/easymed
IMAGE_TAG=<older commit sha> docker compose -f docker-compose-cloud.yml pull
IMAGE_TAG=<older commit sha> docker compose -f docker-compose-cloud.yml up -d
```

Images from the last week are kept on the server, so a recent rollback doesn't
need to download anything.

## Terraform (`demo-deploy/`)

Provisions a demo on AWS Lightsail:

| Module | Resources |
| --- | --- |
| `modules/persistent` | 50 GB Lightsail disk for Postgres, key pair |
| `modules/app` | Ubuntu 22.04 `micro_2_0` instance, disk attachment, key pair, open ports 22, 80, 3000, 8000, 8080, 9090, 9091; `init.sh` bootstraps the host |

Inputs: `aws_region`, `aws_access_key`, `aws_secret_key`, `postgres_disk_name`.

## Known issues

- Prometheus scrapes `celery:8080` and `front-end:3000`; neither host name
  matches a compose service, and Celery does not expose metrics.
- The Lightsail instance opens 8000, 8080, 9090 and 9091 to the internet,
  exposing the backend, Prometheus and the LIS server without the Nginx/TLS front.
- The deploy step uses `git reset --hard` on the server, discarding any local
  changes there.
- `.env.sample` declares `DEMO_FACILITY_TYPE` twice and `NETWORK_*` twice.
