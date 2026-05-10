# Database Runtime Validation

## Purpose

This document defines the local Postgres validation path for proving that `STORE_DRIVER=database` works against a real database.

This is not a production SaaS readiness claim. It proves the database runtime path locally; hosted deployment, production auth, backup/restore, legal review, live OCR accuracy, and billing remain separate launch blockers.

## Local Postgres Setup

The repository includes a Docker Compose service for local validation only.

```bash
docker compose up -d postgres
```

Local dev connection string:

```bash
DATABASE_URL=postgresql://profit_analyzer:local_dev_password@localhost:55432/profit_analyzer
```

These credentials are dev-only and must not be reused for hosted environments.

## Database Commands

Run from the repository root:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
npm run validate:db
```

PowerShell example:

```powershell
$env:DATABASE_URL="postgresql://profit_analyzer:local_dev_password@localhost:55432/profit_analyzer"
npm run db:generate
npm run db:migrate
npm run db:seed
npm run validate:db
```

Optional local reset:

```bash
npm run db:reset:local
```

This is destructive for the configured local database and should not be pointed at production.

## Expected Skip Behavior

If `DATABASE_URL` is missing:

- `npm run validate:db` prints `SKIPPED_DATABASE_VALIDATION`
- exits `0`
- writes a skip-aware DB validation report
- does not claim live DB runtime validation

## Expected Live Behavior

If `DATABASE_URL` is present, `validate:db` validates:

- Prisma connection
- applied migrations
- seed data
- default workspace, restaurant, user, and membership
- analytics overview and dish detail from the DB store
- ingredient, recipe, and dish edit persistence after store reload
- invoice draft and review-confirm creating cost history and alerts
- OCR job metadata through the API runtime path
- billing/license status
- workspace/restaurant isolation
- scoped export
- scoped reset behavior

Reports:

- `reports/db-validation-report.json`
- `reports/db-validation-report.md`

## Current Parity Note

The legacy mixed demo scenario intentionally contains one missing recipe ingredient reference to prove data-quality warnings in the memory/file demo path. The relational database persistence layer keeps foreign-key integrity and skips invalid recipe ingredient rows when syncing that seed payload. Restaurant-created recipe edits are still validated before write.

## Troubleshooting

- If connection fails, confirm Docker is running and host port `55432` is free.
- If migrations fail, run `npm run db:generate` and `npm run db:migrate` again with `DATABASE_URL` set.
- If seed fails, verify the Prisma schema and migrations match the generated client.
- If isolation fails, treat it as a production blocker.

## Production Blocker Rule

Production SaaS readiness remains blocked unless live database validation passes in a production-like hosted environment with backup/restore and deployment runbooks rehearsed.
