#!/usr/bin/env bash
# ==============================================================================
# FQuiz Automated Daily MongoDB Backup Script (7-Day Retention)
# ==============================================================================
set -euo pipefail
umask 077

BACKUP_DIR="/mnt/data/app-data/fquiz-backups"
TIMESTAMP=$(date '+%Y-%m-%d_%H-%M-%S')
ARCHIVE_NAME="fquiz-db-${TIMESTAMP}.gz"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting MongoDB backup to /backups/${ARCHIVE_NAME}..."
docker exec fquiz-mongodb mongodump --uri="mongodb://127.0.0.1:27017/fquiz" --archive="/backups/${ARCHIVE_NAME}" --gzip
chmod 600 "${BACKUP_DIR}/${ARCHIVE_NAME}"

# Retain last 7 days of daily backups (keep cloud-initial-migration.gz untouched)
find "$BACKUP_DIR" -name "fquiz-db-*.gz" -type f -mtime +7 -delete

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup completed: ${BACKUP_DIR}/${ARCHIVE_NAME}"
