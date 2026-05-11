# Deployment Readiness

## Current Posture

The app is not yet production SaaS ready, but it now has a production-oriented deployment profile, runtime validation, and safe readiness reporting.

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
npm run validate:auth
npm run validate:runtime
npm run validate:production-readiness
npm run validate:mobile
```

For local Postgres runtime validation:

```bash
docker compose up -d postgres
```

Then set `DATABASE_URL` to the local dev Postgres URL and run:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
npm run validate:db
```

Details: `docs/DATABASE_RUNTIME_VALIDATION.md`.

## Node and Ports

- Node 20+ recommended
- frontend dev port: `5173`
- backend dev port: `3001`

## Required Environment

Core:

- `NODE_ENV=development|test|production`
- `APP_MODE=demo|pilot|production`
- `AUTH_MODE=dev|disabled|password|external_oidc_future`
- `SESSION_SECRET=`
- `APP_BASE_URL=`
- `API_BASE_URL=`
- `CORS_ORIGIN=`
- `LOG_LEVEL=debug|info|warn|error`
- `STORE_DRIVER=memory|file|database`
- `DATA_DIR=.data`
- `DATABASE_URL=` when `STORE_DRIVER=database`
- `UPLOAD_STORAGE_DRIVER=memory|local_file`
- `UPLOAD_DATA_DIR=.uploads`
- `UPLOAD_MAX_FILE_SIZE_BYTES=10485760`

OCR:

- `OCR_PROVIDER=fixture|external_env|disabled`
- `OCR_PROVIDER_API_KEY=`
- `OCR_PROVIDER_MODEL=`
- `OCR_PROVIDER_ENDPOINT=`
- `OCR_PROVIDER_TIMEOUT_MS=30000`
- `OCR_PROVIDER_MAX_RETRIES=1`

## Deployment Notes By Driver

### Memory

- safe for demo only
- restarts clear data
- `APP_MODE=production` with memory storage is a readiness blocker

### File

- safe for local controlled use
- requires persistent writable disk
- many hosted environments are ephemeral
- acceptable for controlled environments, not the long-term SaaS storage target

### Database

- intended production-oriented path
- requires Postgres and `DATABASE_URL`
- local validation can use the repository Docker Compose Postgres service
- should not silently fall back to memory
- readiness fails clearly if DB is selected but not configured or reachable

## Health And Readiness Endpoints

- `GET /health`
- `GET /api/health/deep`
- `GET /api/health/readiness`
- `GET /api/app/config`
- `GET /api/auth/me` after login

Readiness behaviors:

- no secrets are returned
- `productionReady` currently remains `false`
- DB selection without `DATABASE_URL` is a fail check
- `AUTH_MODE=dev` in `APP_MODE=production` is a fail check
- fixture OCR in production is a warning, not a secret leak
- memory upload storage in production is a readiness blocker
- local file upload storage requires persistent disk

## Production Build And Start

```bash
npm run build:production
npm run start:api
```

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
- `npm run validate:auth`
- `npm run validate:runtime`
- `npm run validate:production-readiness`
- `npm run validate:mobile`
- `npm run validate:onboarding`
- `npm run validate:invoice-pipeline`
- `npm run benchmark:ocr`

## Hosted Production Caveats

- `STORE_DRIVER=file` is not a durable production choice on ephemeral filesystems
- production hosting should move toward managed Postgres
- `UPLOAD_STORAGE_DRIVER=local_file` requires persistent disk and is not equivalent to managed object storage
- external object storage remains future work for hosted production
- the current auth layer includes password auth and hardened sessions, but hosted production identity validation is still required
- monitoring, backups, and rollout playbooks are foundations, not final operations maturity

## Known Gaps

- production-complete identity lifecycle, email verification/reset, invite delivery, and external provider decision are not complete
- billing/license foundation exists, but live payment processing, checkout, and webhook handling are not live
- production backup flow is not fully implemented
- full monitoring stack is not live
- live OCR provider benchmark is not complete without configured provider env and private samples
- legal/privacy launch gates are still open
## Phase 18 Deployment Launch Gate

Deployment readiness is not the same as production launch readiness.

Before public paid SaaS launch:

- `PRODUCTION_LAUNCH_GATE.md` must change from no-go to go.
- `validate:launch-gate` must pass.
- `validate:production-readiness` must still be honest and only return `productionReady=true` when blockers are actually closed.
- local database migration/seed/runtime validation can be rehearsed with Docker Compose.
- hosted database migration/seed/backup must still be rehearsed.
- production auth must run with `AUTH_MODE=password` or a future configured external provider; `dev-login` must remain blocked in production.
- legal/privacy drafts must be reviewed.

Current status: public paid SaaS launch is no-go.
