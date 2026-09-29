#!/usr/bin/env bash
# Nightly Postgres backup for the VPS (milestone 8). Writes a compressed custom-format dump that
# pg_restore can load, keeps BACKUP_KEEP_DAYS days of them, and fails loudly if the dump is empty.
#
#   DATABASE_URL=postgresql://... BACKUP_DIR=/var/backups/pharma deploy/db-backup.sh
#
# Cron (as the backup user), 02:30 UTC daily:
#   30 2 * * * cd /srv/pharma-comparison-engine && set -a && . ./.env && set +a && deploy/db-backup.sh >> /var/log/pharma-db-backup.log 2>&1
#
# A backup on the same disk as the database is not a backup: copy BACKUP_DIR off the server too
# (see docs/backup-restore.md).
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/pharma}"
BACKUP_KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"

# Prisma URLs can carry query options (e.g. ?schema=public) that libpq rejects.
db_url="${DATABASE_URL%%\?*}"

mkdir -p "$BACKUP_DIR"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
target="$BACKUP_DIR/pharma-$stamp.dump"
partial="$target.partial"

pg_dump --format=custom --no-owner --no-privileges --file="$partial" "$db_url"
# A dump with no table data means something went wrong even if pg_dump exited 0.
if ! pg_restore --list "$partial" | grep -q "TABLE DATA"; then
  echo "$(date -u +%FT%TZ) backup FAILED: $partial contains no table data" >&2
  exit 1
fi
mv "$partial" "$target"

find "$BACKUP_DIR" -name 'pharma-*.dump' -mtime +"$BACKUP_KEEP_DAYS" -delete
echo "$(date -u +%FT%TZ) backup OK: $target ($(du -h "$target" | cut -f1))"
