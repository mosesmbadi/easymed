#!/bin/bash
# ============================================================
# EasyMed Database Backup Script
# Runs inside the backup container with access to PostgreSQL
# Stores compressed backups in /backups (mounted from ./backup/data)
# ============================================================

set -euo pipefail

BACKUP_DIR="/backups"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
FILENAME="easymed_db_${DATE}.sql.gz"
BACKUP_PATH="${BACKUP_DIR}/${FILENAME}"
LATEST_LINK="${BACKUP_DIR}/latest.sql.gz"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
LOG_PREFIX="[BACKUP $(date '+%Y-%m-%d %H:%M:%S')]"

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

# Ensure backup directory exists
mkdir -p "${BACKUP_DIR}"

log "Starting backup of database '${POSTGRES_DB}'..."

# Run pg_dump with compression
PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
    -h "${POSTGRES_HOST:-postgres}" \
    -p "${POSTGRES_PORT:-5432}" \
    -U "${POSTGRES_USER}" \
    -d "${POSTGRES_DB}" \
    --no-owner \
    --no-privileges \
    --format=plain \
    --verbose 2>/dev/null | gzip > "${BACKUP_PATH}" || error_exit "pg_dump failed"

# Verify the backup is not empty
BACKUP_SIZE=$(stat -c%s "${BACKUP_PATH}" 2>/dev/null || stat -f%z "${BACKUP_PATH}" 2>/dev/null)
if [ "${BACKUP_SIZE}" -lt 100 ]; then
    rm -f "${BACKUP_PATH}"
    error_exit "Backup file is too small (${BACKUP_SIZE} bytes) — likely empty or corrupt"
fi

# Update the 'latest' symlink
ln -sf "${FILENAME}" "${LATEST_LINK}"

log "Backup complete: ${FILENAME} ($(numfmt --to=iec ${BACKUP_SIZE} 2>/dev/null || echo ${BACKUP_SIZE} bytes))"

# Cleanup old backups beyond retention period
DELETED_COUNT=0
while IFS= read -r old_backup; do
    rm -f "${old_backup}"
    DELETED_COUNT=$((DELETED_COUNT + 1))
done < <(find "${BACKUP_DIR}" -name "easymed_db_*.sql.gz" -type f -mtime +${RETENTION_DAYS} 2>/dev/null)

if [ "${DELETED_COUNT}" -gt 0 ]; then
    log "Cleaned up ${DELETED_COUNT} backup(s) older than ${RETENTION_DAYS} days"
fi

# Show current backup inventory
TOTAL_BACKUPS=$(find "${BACKUP_DIR}" -name "easymed_db_*.sql.gz" -type f | wc -l)
TOTAL_SIZE=$(du -sh "${BACKUP_DIR}" 2>/dev/null | cut -f1)
log "Total backups: ${TOTAL_BACKUPS}, Total size: ${TOTAL_SIZE}"
