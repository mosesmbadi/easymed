#!/bin/bash

set -e

DATE=$(date +%Y-%m-%d_%H-%M-%S)
FILENAME="db_backup_$DATE.sql"
BACKUP_PATH="/backups/$FILENAME"

# Run pg_dump
PGPASSWORD=$POSTGRES_PASSWORD pg_dump -h postgres -U $POSTGRES_USER $POSTGRES_DB > $BACKUP_PATH

# Upload to S3
aws s3 cp $BACKUP_PATH s3://$S3_BUCKET_NAME/$FILENAME

# Optional: Remove local files older than 7 days
find /backups -type f -name "*.sql" -mtime +7 -exec rm {} \;

echo "Backup and upload complete: $FILENAME"
