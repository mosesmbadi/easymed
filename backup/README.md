# EasyMed Database Backup & Restore

The backup service runs as a Docker container alongside PostgreSQL. It automatically creates compressed database dumps every 4 hours and stores them in `./backup/data/` on the host.

## Automated Backups

Backups run automatically via cron every 4 hours (`0 */4 * * *`). Each backup:

- Creates a gzip-compressed `pg_dump` of the full database
- Names the file `easymed_db_YYYY-MM-DD_HH-MM-SS.sql.gz`
- Updates a `latest.sql.gz` symlink to the newest backup
- Deletes backups older than 30 days (configurable via `BACKUP_RETENTION_DAYS`)

## Manual Backup

Trigger a backup immediately:

```bash
# Local development
docker compose -f docker-compose-local.yml exec backup /backup.sh

# Production
docker compose -f docker-compose-cloud.yml exec backup /backup.sh
```

## List Available Backups

```bash
docker compose -f docker-compose-local.yml exec backup /list-backups.sh
```

You can also browse the files directly on the host at `./backup/data/`.

## Restore

### Restore from the latest backup

```bash
docker compose -f docker-compose-local.yml exec -it backup /restore.sh
```

### Restore from a specific backup

```bash
docker compose -f docker-compose-local.yml exec -it backup /restore.sh easymed_db_2026-02-12_04-00-00.sql.gz
```

The restore script will:

1. Show available backups for reference
2. Ask for confirmation (interactive mode)
3. Terminate active database connections
4. Drop and recreate the database
5. Import the backup

### After restoring

Restart the application services so they reconnect to the restored database:

```bash
docker compose -f docker-compose-local.yml restart backend worker celery-beat
```

## Configuration

| Environment Variable | Default | Description |
|---|---|---|
| `POSTGRES_USER` | *(required)* | Database user |
| `POSTGRES_DB` | *(required)* | Database name |
| `POSTGRES_PASSWORD` | *(required)* | Database password |
| `POSTGRES_HOST` | `postgres` | Database hostname |
| `POSTGRES_PORT` | `5432` | Database port |
| `BACKUP_RETENTION_DAYS` | `30` | Days to keep old backups |

These are read from the same `.env` / `.env.local` file used by the rest of the stack.

## File Structure

```
backup/
├── Dockerfile          # Backup container image
├── backup.sh           # Backup script (runs via cron)
├── restore.sh          # Restore script
├── list-backups.sh     # List available backups
├── crontab             # Cron schedule
├── README.md           # This file
└── data/               # Backup storage (mounted as volume)
    ├── .gitignore
    └── .gitkeep
```
