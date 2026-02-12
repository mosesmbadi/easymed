#!/bin/bash
# ============================================================
# List available database backups
# Usage: docker compose -f <compose-file> exec backup /list-backups.sh
# ============================================================

BACKUP_DIR="/backups"

echo "=== EasyMed Database Backups ==="
echo ""

if [ -L "${BACKUP_DIR}/latest.sql.gz" ]; then
    LATEST=$(readlink "${BACKUP_DIR}/latest.sql.gz")
    echo "Latest backup: ${LATEST}"
    echo ""
fi

TOTAL_BACKUPS=$(find "${BACKUP_DIR}" -name "easymed_db_*.sql.gz" -type f 2>/dev/null | wc -l)

if [ "${TOTAL_BACKUPS}" -eq 0 ]; then
    echo "No backups found."
    exit 0
fi

echo "Available backups (${TOTAL_BACKUPS} total):"
echo "-------------------------------------------"
printf "%-45s %10s\n" "FILENAME" "SIZE"
echo "-------------------------------------------"

find "${BACKUP_DIR}" -name "easymed_db_*.sql.gz" -type f -printf '%T@ %p\n' 2>/dev/null | sort -rn | while read -r _ filepath; do
    filename=$(basename "${filepath}")
    size=$(du -h "${filepath}" | cut -f1)
    printf "%-45s %10s\n" "${filename}" "${size}"
done

echo "-------------------------------------------"
TOTAL_SIZE=$(du -sh "${BACKUP_DIR}" 2>/dev/null | cut -f1)
echo "Total size: ${TOTAL_SIZE}"
