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
- `AUTH_MODE=production_future`
- `SESSION_SECRET=...`
- `APP_BASE_URL=https://app.example.com`
- `API_BASE_URL=https://api.example.com`
- `CORS_ORIGIN=https://app.example.com`
- `LOG_LEVEL=info`
- `OCR_PROVIDER=fixture|external_env|disabled`

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

This is not a full production backup strategy yet.

## Known Production Blockers

- final production identity provider is not live
- billing is not live
- legal/privacy launch gates are not complete
- live OCR benchmark on real invoices is not complete
- full monitoring stack is not live
