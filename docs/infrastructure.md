# Infrastructure and operations

How EasyMed is run locally, built into images and backed up. This repo holds no
deployment: see [Deployments](#deployments-one-repo-per-hospital).

## Local development (`docker-compose-local.yml`)

The only compose file in this repo. Builds the backend from
`backend/Dockerfile.local`. The frontend service is commented out — run it with
`npm run dev`.

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

Built into the `easymed-nginx` image and used by the hospital deployments. The
image holds no host name: `templates/default.conf.template` is rendered when the
container starts, from the deployment's `NGINX_SERVER_NAME` (host names) and
`NGINX_CERT_DOMAIN` (the Let's Encrypt directory).

- Port 80 serves `/.well-known/acme-challenge/` for Certbot and redirects the rest to HTTPS.
- Port 443 terminates TLS and proxies `/` to `frontend:3000`.

The backend is reached by the frontend's server-side proxy routes, not directly
by the browser.

## Monitoring

`django_prometheus` exposes `/metrics` on the backend. Running a Prometheus
server to scrape it is up to each deployment.

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

## CI (`.github/workflows/ci-cd.yml`)

This repo tests EasyMed and publishes its images. **It does not deploy.**

On push to `main` or `standalone-lab`:

1. **test-backend** — build `backend/Dockerfile`, run `manage.py check` and
   `pytest --ds=easymed.settings.testing` with dummy env vars (SQLite, in-memory
   Celery).
2. **build-and-push** — one matrix job per image (`backend`, `frontend`, `nginx`,
   `backup`). Builds on the GitHub runner with layer caching and pushes
   `<namespace>/easymed-<name>` to Docker Hub with these tags:

   | Tag | Moves? | Use |
   | --- | --- | --- |
   | full commit SHA | never | What a deployment pins |
   | branch name (e.g. `standalone-lab`) | with the branch | Trying a branch on a test server |
   | `latest` | with `main` only | Never pin a hospital to it |

   The frontend build includes `next lint` and the production build, so a lint
   error or compile failure fails CI and no image is published.

Required GitHub settings:

| Kind | Name | Purpose |
| --- | --- | --- |
| Secret | `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN` | Push to Docker Hub (access token with Read & Write) |
| Variable (optional) | `DOCKERHUB_NAMESPACE` | Docker Hub user/org for the images; default `mosesmbadi` |
| Variable (optional) | `NEXT_PUBLIC_BACKEND_URL`, `NEXT_PUBLIC_HMIS_VERSION` | Baked into the frontend image; defaults `http://api:8080/`, `v0.0.1` |

Because one frontend image serves every hospital, anything baked into it must
hold for all of them. The backend is always reached as `api` on the
deployment's compose network.

## Deployments (one repo per hospital)

Each hospital that runs EasyMed has its own deployment repo, e.g.
`afurqan-deployment` for Afurqan Hospital. It contains only:

- `docker-compose.yml`: pulls the images above at `EASYMED_TAG`. It builds nothing.
- `.github/workflows/deploy.yml`: SSHes to that hospital's server, then pulls and starts.
- `sample.env`: the template for the server's `.env` (secrets, domain, integrations).

To roll a hospital forward or back, run its deploy workflow with an easymed
commit SHA, or change its `EASYMED_TAG` repository variable. To onboard a new
hospital, copy an existing deployment repo and change its names, domain and
secrets.

## Known issues

- `.env.sample` declares `DEMO_FACILITY_TYPE` twice and `NETWORK_*` twice.
