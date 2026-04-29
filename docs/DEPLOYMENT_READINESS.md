# Deployment Readiness

## Current Posture

The app is not yet production SaaS ready, but it now has a database-oriented deployment path instead of only memory and file persistence.

## Runtime Split

Suggested split:

- frontend: static hosting
- backend: Node service
- database: managed Postgres

## Local Commands

```bash
npm install
npm run typecheck
npm test
npm run build
npm run lint
npm run validate:synthetic
npm run validate:demo
npm run validate:invoice
npm run validate:ocr
npm run validate:ocr:provider
npm run validate:pilot
npm run validate:env
npm run validate:db
```

## Node and Ports

- Node 20+ recommended
- frontend dev port: `5173`
- backend dev port: `3001`

## Required Environment

Core:

- `APP_MODE=demo|pilot`
- `STORE_DRIVER=memory|file|database`
- `DATA_DIR=.data`
- `DATABASE_URL=` when `STORE_DRIVER=database`

OCR:

- `OCR_PROVIDER`
- `OCR_PROVIDER_API_KEY`
- `OCR_PROVIDER_MODEL`
- `OCR_PROVIDER_ENDPOINT`
- `OCR_PROVIDER_TIMEOUT_MS`
- `OCR_PROVIDER_MAX_RETRIES`

## Deployment Notes By Driver

### Memory

- safe for demo only
- restarts clear data

### File

- safe for local controlled use
- requires persistent writable disk
- many hosted environments are ephemeral

### Database

- intended production-oriented path
- requires Postgres and `DATABASE_URL`
- should not silently fall back to memory

## Health Endpoints

- `GET /health`
- `GET /api/health/deep`
- `GET /api/app/config`

`/api/health/deep` must be treated as a readiness signal for storage:

- `memory`: warning only
- `file`: read/write disk checks
- `database`: configuration and connectivity checks

## Pre-Deploy Validation

Run before any serious hosted environment:

- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run lint`
- `npm run validate:synthetic`
- `npm run validate:invoice`
- `npm run validate:ocr`
- `npm run validate:pilot`
- `npm run validate:env`
- `npm run validate:db`

## Hosted Production Caveats

- `STORE_DRIVER=file` is not a durable production choice on ephemeral filesystems
- production hosting should move toward managed Postgres
- OCR upload storage strategy is still future work
- auth, monitoring, backup, and rollout playbooks are still future phases

## Known Gaps

- auth is not live
- billing is not live
- production backup flow is not fully implemented
- structured monitoring is not live
- OCR provider benchmark is not complete
