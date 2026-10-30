#!/bin/bash
# ============================================================
# EasyMed Database Restore Script
# Usage:
#   ./restore.sh                     # Restore from latest backup
#   ./restore.sh <backup_file.sql.gz> # Restore from specific file
#
# Run from the host machine (not inside Docker):
#   docker compose -f <compose-file> exec backup /restore.sh
#   docker compose -f <compose-file> exec backup /restore.sh easymed_db_2026-02-12_04-00-00.sql.gz
# ============================================================

set -euo pipefail

BACKUP_DIR="/backups"
LOG_PREFIX="[RESTORE $(date '+%Y-%m-%d %H:%M:%S')]"

log() {
    echo "${LOG_PREFIX} $1"
}

error_exit() {
    log "ERROR: $1"
    exit 1
}

# Validate required environment variables
for var in POSTGRES_USER POSTGRES_DB POSTGRES_PASSWORD; do
    if [ -z "${!var:-}" ]; then
        error_exit "Required environment variable ${var} is not set"
    fi
done

# Determine which backup to restore
if [ -n "${1:-}" ]; then
    if [ -f "${BACKUP_DIR}/${1}" ]; then
        RESTORE_FILE="${BACKUP_DIR}/${1}"
    elif [ -f "${1}" ]; then
        RESTORE_FILE="${1}"
    else
        error_exit "Backup file not found: ${1}"
    fi
elif [ -L "${BACKUP_DIR}/latest.sql.gz" ]; then
    RESTORE_FILE="${BACKUP_DIR}/latest.sql.gz"
else
    # Find the most recent backup
    RESTORE_FILE=$(find "${BACKUP_DIR}" -name "easymed_db_*.sql.gz" -type f -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2)
    if [ -z "${RESTORE_FILE}" ]; then
        error_exit "No backup files found in ${BACKUP_DIR}"
    fi
fi

RESTORE_SIZE=$(stat -c%s "${RESTORE_FILE}" 2>/dev/null || stat -f%z "${RESTORE_FILE}" 2>/dev/null)
log "Restoring from: ${RESTORE_FILE} ($(numfmt --to=iec ${RESTORE_SIZE} 2>/dev/null || echo ${RESTORE_SIZE} bytes))"

# List available backups for reference
log "Available backups:"
find "${BACKUP_DIR}" -name "easymed_db_*.sql.gz" -type f -printf '  %T+ %f\n' 2>/dev/null | sort -r | head -10

# Confirmation prompt (only if running interactively)
if [ -t 0 ]; then
    echo ""
    echo "WARNING: This will DROP and recreate the database '${POSTGRES_DB}'."
    echo "All existing data will be replaced with the backup contents."
    read -p "Are you sure you want to continue? (yes/no): " CONFIRM
    if [ "${CONFIRM}" != "yes" ]; then
        log "Restore cancelled by user"
        exit 0
    fi
fi

POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"

# Wait for PostgreSQL to be ready
log "Waiting for PostgreSQL to be ready..."
for i in $(seq 1 30); do
    if PGPASSWORD="${POSTGRES_PASSWORD}" pg_isready -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" >/dev/null 2>&1; then
        break
    fi
    if [ "$i" -eq 30 ]; then
        error_exit "PostgreSQL is not ready after 30 seconds"
    fi
    sleep 1
done

# Terminate existing connections to the database
log "Terminating existing connections to '${POSTGRES_DB}'..."
PGPASSWORD="${POSTGRES_PASSWORD}" psql \
    -h "${POSTGRES_HOST}" \
    -p "${POSTGRES_PORT}" \
    -U "${POSTGRES_USER}" \
    -d postgres \
    -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${POSTGRES_DB}' AND pid <> pg_backend_pid();" \
    >/dev/null 2>&1 || true

# Drop and recreate the database
log "Dropping and recreating database '${POSTGRES_DB}'..."
PGPASSWORD="${POSTGRES_PASSWORD}" psql \
    -h "${POSTGRES_HOST}" \
    -p "${POSTGRES_PORT}" \
    -U "${POSTGRES_USER}" \
    -d postgres \
    -c "DROP DATABASE IF EXISTS \"${POSTGRES_DB}\";" || error_exit "Failed to drop database"

PGPASSWORD="${POSTGRES_PASSWORD}" psql \
    -h "${POSTGRES_HOST}" \
    -p "${POSTGRES_PORT}" \
    -U "${POSTGRES_USER}" \
    -d postgres \
    -c "CREATE DATABASE \"${POSTGRES_DB}\" OWNER \"${POSTGRES_USER}\";" || error_exit "Failed to create database"

# Restore the backup
log "Restoring database..."
gunzip -c "${RESTORE_FILE}" | PGPASSWORD="${POSTGRES_PASSWORD}" psql \
    -h "${POSTGRES_HOST}" \
    -p "${POSTGRES_PORT}" \
    -U "${POSTGRES_USER}" \
    -d "${POSTGRES_DB}" \
    --single-transaction \
    --set ON_ERROR_STOP=off \
    >/dev/null 2>&1 || log "WARNING: Some restore statements produced errors (this is often normal for pg_dump restores)"

log "Restore complete!"
log "You should restart the backend and worker services to pick up the restored data:"
log "  docker compose -f <compose-file> restart backend worker celery-beat"
