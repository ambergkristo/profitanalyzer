# Backup And Restore Runbook

## Current Backup Position

The app has dataset export/import for controlled backups, but this is not a full hosted production backup strategy.

Production launch requires provider-level Postgres backups and a tested restore process.

## Data Categories

- workspace, restaurant, user, membership, recipe, dish, ingredient, supplier, invoice, alert, OCR job, billing/license data in Postgres
- uploaded invoice files under `UPLOAD_DATA_DIR` when `UPLOAD_STORAGE_DRIVER=local_file`
- audit logs in the database store where configured
- private OCR benchmark files in ignored benchmark folders only

## Current Safe Backup Options

- Run dataset export from the app for scoped restaurant data.
- Use hosted Postgres provider snapshots/backups for database recovery.
- Copy `UPLOAD_DATA_DIR` separately if using local file uploads.

Dataset export does not include raw private invoice file contents by default.

## Restore Rehearsal

1. Create a fresh local Postgres database.
2. Restore a provider backup or import a safe dataset export.
3. Set `DATABASE_URL` to the restored database.
4. Run `npm run db:generate`.
5. Run `npm run db:migrate`.
6. Run `npm run validate:db`.
7. Confirm workspace isolation and invoice review-confirm still work.

## Hosted Backup Setup Requirement

Before public paid SaaS launch:

- enable hosted Postgres automated backups
- document backup retention in the provider console
- rehearse restoring a backup into a separate database
- point `DATABASE_URL` at the restored database in a local shell
- run `npm run validate:db`
- do not restore over production unless executing an approved incident rollback

## Delete/Retention Interaction

- Deletion requests should not hard-delete blindly.
- Audit log retention needs explicit launch policy.
- Invoice file deletion must remove raw files from upload storage and any backups according to retention policy.
- Private benchmark samples must never be committed.

## Restore Caveats

- Restoring a full database snapshot may overwrite newer customer data.
- Scoped dataset import is safer for single-restaurant controlled recovery but is not a full disaster recovery process.
- Uploaded invoice files require separate restore.
- Billing/license state must be verified after restore.

## Production Blockers

- Hosted Postgres backup schedule is not configured in this repository.
- Backup restore has not been rehearsed against a hosted provider.
- Hosted object storage backup/delete process is not implemented.
- Monitoring for backup failures is not implemented.
