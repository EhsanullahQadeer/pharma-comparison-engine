# Backup and restore

Milestone 8 requires a backup/restore drill against the real Postgres instance, with the result
recorded here. The scripts are in `deploy/`; they need the Postgres client tools (`pg_dump`,
`pg_restore`, `psql`) at the same major version as the server.

## 1. Nightly backups

`deploy/db-backup.sh` writes `pharma-<UTC time>.dump` (compressed, custom format) to
`BACKUP_DIR` (default `/var/backups/pharma`), refuses to keep a dump with no table data, and
deletes dumps older than `BACKUP_KEEP_DAYS` (default 14).

Install on the VPS as a daily cron job (02:30 UTC):

```cron
30 2 * * * cd /srv/pharma-comparison-engine && set -a && . ./.env && set +a && deploy/db-backup.sh >> /var/log/pharma-db-backup.log 2>&1
```

**Off-server copy (required).** A dump on the same disk as the database is lost with the server.
Copy each night's dump to separate storage (another provider's object storage, or the hosting
provider's backup volume) with its own retention, and restrict who can read it: the dumps contain
staff accounts, submissions and audit history.

## 2. Restore drill

Run at least before launch, then every quarter and after any major schema change.

1. Create an empty scratch database on the same server (never the live one):
   `createdb pharma_restore_drill`
2. Take a fresh backup: `deploy/db-backup.sh`
3. Run the drill straight after (it restores the newest dump by default):

   ```sh
   DRILL_DATABASE_URL=postgresql://USER:PASS@localhost:5432/pharma_restore_drill deploy/db-restore-drill.sh
   ```

   It refuses to run if the drill URL is the live database or the drill database isn't empty,
   restores with `--exit-on-error`, then prints every table's row count, live against restored.
4. **Passed** = every table present and every count matches. Small differences only in tables
   written between the dump and the check (`PriceHistory`, `ReferralClick`, `AuditLog`,
   `PriceCollectionJob`) are acceptable. A missing table or a much lower count is a failure.
5. Spot-check the restored copy: `psql …/pharma_restore_drill -c 'select count(*) from "Offer" where "publishedAt" is not null'`.
6. Drop the scratch database: `dropdb pharma_restore_drill`
7. Record the result below.

## 3. Restoring for real

1. Stop the web app and the price-collection worker so nothing writes during the restore.
2. Take a dump of the current (broken) state first, even if it seems useless.
3. Restore the chosen dump into a **new** database, check it as in step 2 above, then point
   `DATABASE_URL` at it, rather than restoring over the live database.
4. Run `npx prisma migrate status`: it must say the schema is up to date.
5. Start the web app and the worker; check the public compare page and the admin.

## Drill log

| Date | Dump used | Restore time | Result | Run by |
| --- | --- | --- | --- | --- |
| _not yet run_ | | | | |
