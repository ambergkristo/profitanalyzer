# Production Migration Runbook

## Purpose

This runbook defines the hosted Postgres migration path. It is operational guidance, not a claim that production launch is complete.

## Pre-Migration Requirements

- Confirm the target `DATABASE_URL` points to the intended hosted Postgres database.
- Take a provider-level database backup.
- Confirm the deployed backend version is compatible with the migration.
- Run the same migration locally against Docker Postgres first.
- Confirm no destructive reset command is being used.

Never run `db:reset:local` against production.

## Commands

Generate Prisma client:

```bash
npm run db:generate
```

Apply migrations:

```bash
npm run db:migrate
```

Seed baseline/default data when required:

```bash
npm run db:seed
```

Validate runtime:

```bash
npm run validate:db
```

## First Deploy Flow

1. Deploy backend build without routing public traffic if the platform supports it.
2. Set production environment variables.
3. Run `npm run db:generate`.
4. Run `npm run db:migrate`.
5. Run `npm run db:seed`.
6. Run `npm run validate:db`.
7. Check `/api/health/readiness`.
8. Route traffic only if validation passes and readiness has no unexpected blockers.

## Verification Queries

Run read-only checks in hosted Postgres:

```sql
SELECT COUNT(*) FROM "Workspace";
SELECT COUNT(*) FROM "Restaurant";
SELECT COUNT(*) FROM "User";
SELECT COUNT(*) FROM "WorkspaceMembership";
SELECT COUNT(*) FROM "Ingredient";
SELECT COUNT(*) FROM "Dish";
SELECT COUNT(*) FROM "PurchaseInvoice";
SELECT COUNT(*) FROM "AuthSession" WHERE "revokedAt" IS NULL;
```

Expected result: baseline workspace, restaurant, user, membership, menu, invoice, and auth tables exist. Exact counts depend on seed and launch data.

## Rollback Considerations

- Code rollback is safe only if migrations are backward-compatible.
- Schema rollback should be planned per migration.
- Data rollback requires provider backup restore unless a migration-specific rollback exists.
- If authentication or workspace isolation fails, stop traffic and restore previous backend immediately.

## Failure Recovery

- Migration fails before completion: stop deploy, inspect migration logs, restore backup if partial writes occurred.
- Seed fails: confirm whether partial seed data exists before rerun.
- Validation fails: do not route traffic; inspect `reports/db-validation-report.md`.
- Readiness fails: fix env/storage/auth blockers before launch.

## Production Blocker

Hosted migration and backup/restore rehearsal must be completed before public paid SaaS launch.
