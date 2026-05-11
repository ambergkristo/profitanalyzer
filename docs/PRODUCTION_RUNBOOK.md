# Production Runbook

## Purpose

This runbook defines the current production-oriented operational path without claiming that the app is already production SaaS ready.

## Build And Start

```bash
npm install
npm run build:production
npm run start:api
```

Frontend build:

```bash
npm run build -w @profit-analyzer/web
```

## Required Environment

- `NODE_ENV=production`
- `APP_MODE=production`
- `STORE_DRIVER=database`
- `DATABASE_URL=...`
- `AUTH_MODE=password`
- `SESSION_SECRET=...`
- `APP_BASE_URL=https://app.example.com`
- `API_BASE_URL=https://api.example.com`
- `CORS_ORIGIN=https://app.example.com`
- `LOG_LEVEL=info`
- `OCR_PROVIDER=fixture|external_env|disabled`
- `UPLOAD_STORAGE_DRIVER=local_file`
- `UPLOAD_DATA_DIR=/var/lib/profit-analyzer/uploads`
- `UPLOAD_MAX_FILE_SIZE_BYTES=10485760`

## Pre-Deploy Checks

Run:

```bash
npm run typecheck
npm test
npm run build
npm run lint
npm run validate:env
npm run validate:db
npm run validate:auth
npm run validate:runtime
npm run validate:production-readiness
npm run validate:mobile
npm run validate:onboarding
npm run validate:invoice-pipeline
npm run benchmark:ocr
```

Local database runtime validation:

```bash
docker compose up -d postgres
export DATABASE_URL=postgresql://profit_analyzer:local_dev_password@localhost:55432/profit_analyzer
npm run db:generate
npm run db:migrate
npm run db:seed
npm run validate:db
```

PowerShell:

```powershell
$env:DATABASE_URL="postgresql://profit_analyzer:local_dev_password@localhost:55432/profit_analyzer"
```

## Migration And Seed

Generate Prisma client:

```bash
npm run db:generate
```

Run migrations:

```bash
npm run db:migrate
```

Seed baseline data if needed:

```bash
npm run db:seed
```

## Runtime Checks

Use:

- `GET /health`
- `GET /api/health/deep`
- `GET /api/health/readiness`

Interpretation:

- `/health` confirms the process is alive
- `/api/health/deep` summarizes store and runtime checks
- `/api/health/readiness` is the safer deployment gate and keeps `productionReady=false` until later phases close remaining gaps

## Logging

Current logging foundation:

- request ids on API responses
- structured request logging
- safe error logging
- no raw secrets
- no raw OCR provider payload logging by default

## Rollback Checklist

- stop routing traffic to the new backend
- restore previous backend version
- confirm `GET /health` and `GET /api/health/readiness`
- confirm DB migrations are compatible with rollback plan before deployment
- if a destructive migration exists later, add a migration-specific rollback runbook before deploy

## Backup And Export

Current state:

- dataset export/import exists
- file-store data can be copied from `DATA_DIR`
- database backup is still expected to come from the DB provider or hosting layer
- local Postgres validation proves application/runtime parity only; it does not replace hosted backup/restore rehearsal
- `UPLOAD_DATA_DIR` must be backed up separately when `UPLOAD_STORAGE_DRIVER=local_file`
- raw uploaded invoice files are not included in normal dataset export by default

This is not a full production backup strategy yet.

## Known Production Blockers

- password auth foundation is available, but hosted identity validation, email verification/reset, invite delivery, and external-provider decision remain open
- billing/license foundation exists, but live payment provider, checkout, and webhook operations are not live
- legal/privacy launch gates are not complete
- live OCR benchmark on real invoices is not complete
- hosted object storage is not implemented
- full monitoring stack is not live
## Phase 18 Launch Gate Runbook Step

Before any public paid SaaS launch:

1. Run the full validation command set including `npm run validate:launch-gate`.
2. Review `reports/production-readiness-report.md`.
3. Review `reports/launch-gate-report.md`.
4. Confirm `PRODUCTION_LAUNCH_GATE.md` no longer lists critical blockers.
5. Confirm legal/privacy documents are reviewed and approved.
6. Confirm live DB, auth, OCR benchmark, backup/restore, monitoring, and billing decisions are complete.

Current expected result: production launch remains no-go.
