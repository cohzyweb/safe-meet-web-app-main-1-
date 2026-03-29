#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/safe-meet}"
BACKUP_DIR="$APP_DIR/backups"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUT_FILE="$BACKUP_DIR/safemeet-$TIMESTAMP.sql.gz"

mkdir -p "$BACKUP_DIR"

docker exec safe-meet-postgres pg_dump -U safemeet safemeet | gzip > "$OUT_FILE"

find "$BACKUP_DIR" -type f -name "safemeet-*.sql.gz" -mtime +7 -delete
