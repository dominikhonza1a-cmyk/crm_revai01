#!/usr/bin/env bash
# Denní záloha PostgreSQL s rotací (default 35 dní — viz config/default.json retentionDefaults.backupRotationDays).
# Zálohy neobsahují dlouhodobé archivy osobních dat; po restore je nutné spustit re-apply erasure z tombstonů
# (viz docs/security/gdpr.md — 'GDPR vs. zálohy').
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL musí být nastaveno}"
BACKUP_DIR="${BACKUP_DIR:-./.backups}"
ROTATION_DAYS="${ROTATION_DAYS:-35}"
mkdir -p "$BACKUP_DIR"

STAMP="$(date +%Y%m%d-%H%M%S)"
pg_dump "$DATABASE_URL" --format=custom --file "$BACKUP_DIR/revai_crm-$STAMP.dump"

# rotace
find "$BACKUP_DIR" -name 'revai_crm-*.dump' -mtime "+$ROTATION_DAYS" -delete
echo "Backup hotov: $BACKUP_DIR/revai_crm-$STAMP.dump"
