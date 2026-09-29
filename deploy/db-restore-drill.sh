#!/usr/bin/env bash
# Backup/restore drill (milestone 8): restores a dump into a SEPARATE, empty scratch database and
# checks every table's row count against the live database. Proves a backup can actually be
# restored. It never writes to DATABASE_URL.
#
#   DATABASE_URL=postgresql://.../pharma DRILL_DATABASE_URL=postgresql://.../pharma_restore_drill \
#     deploy/db-restore-drill.sh [path/to/backup.dump]
#
# With no path, the newest dump in BACKUP_DIR is used. Take the dump and run the drill close
# together: rows written in between (e.g. new price history) show up as count differences, which
# are listed so you can judge them. Record the result in docs/backup-restore.md.
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required (the live database, read only)}"
: "${DRILL_DATABASE_URL:?DRILL_DATABASE_URL is required (an empty scratch database)}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/pharma}"

live_url="${DATABASE_URL%%\?*}"
drill_url="${DRILL_DATABASE_URL%%\?*}"
if [ "$live_url" = "$drill_url" ]; then
  echo "Refusing to run: DRILL_DATABASE_URL points at the live database." >&2
  exit 1
fi

dump="${1:-$(ls -1t "$BACKUP_DIR"/pharma-*.dump 2>/dev/null | head -n 1)}"
if [ -z "$dump" ] || [ ! -f "$dump" ]; then
  echo "No backup file found (looked in $BACKUP_DIR)." >&2
  exit 1
fi

existing="$(psql "$drill_url" -Atc "select count(*) from information_schema.tables where table_schema = 'public'")"
if [ "$existing" != "0" ]; then
  echo "Refusing to run: the drill database already has $existing tables. Use an empty database." >&2
  exit 1
fi

started=$(date +%s)
echo "Restoring $dump into the drill database…"
pg_restore --no-owner --no-privileges --exit-on-error --dbname="$drill_url" "$dump"
echo "Restore took $(( $(date +%s) - started ))s."

count_rows() {
  psql "$1" -At -F $'\t' <<'SQL'
select table_name,
       (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from public.%I', table_name), false, true, '')))[1]::text::bigint
from information_schema.tables
where table_schema = 'public' and table_type = 'BASE TABLE'
order by table_name;
SQL
}

live_counts="$(mktemp)"; drill_counts="$(mktemp)"
trap 'rm -f "$live_counts" "$drill_counts"' EXIT
# join needs both lists in the same byte order; Postgres collation order can differ.
count_rows "$live_url" | LC_ALL=C sort > "$live_counts"
count_rows "$drill_url" | LC_ALL=C sort > "$drill_counts"

echo
printf '%-32s %12s %12s\n' "table" "live" "restored"
LC_ALL=C join -t $'\t' -a 1 -a 2 -e MISSING -o 0,1.2,2.2 "$live_counts" "$drill_counts" | while IFS=$'\t' read -r table live restored; do
  marker=""
  [ "$live" != "$restored" ] && marker="  <-- differs"
  printf '%-32s %12s %12s%s\n' "$table" "$live" "$restored" "$marker"
done

tables=$(wc -l < "$drill_counts")
if diff -q "$live_counts" "$drill_counts" > /dev/null; then
  echo; echo "DRILL PASSED: $tables tables restored, every row count matches."
else
  echo; echo "DRILL FINISHED WITH DIFFERENCES: check the marked tables. Differences only in tables written since the dump (price history, clicks, audit log) are expected; a missing table or a much lower count is a failure."
  exit 2
fi
