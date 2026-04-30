# Menu Profit Optimizer

Menu Profit Optimizer is a restaurant profit product for dish-margin analysis, supplier cost change review, invoice intake, OCR draft review, and concrete pricing actions.

RM1-RM9 are complete as a controlled pilot and founding-partner foundation. The strategic target is now production SaaS readiness, but production readiness is still not claimed.

## Current Status

- RM1-RM9: complete as controlled pilot / founding-partner foundation
- Phase 11: complete as production SaaS strategy reset
- Phase 12: partial, with database and multi-tenant foundation in place
- Phase 13: complete as auth and workspace access foundation
- Phase 14: complete as deployment and observability foundation
- production SaaS readiness: `false`
- OCR safety boundary: unchanged

The current product already includes:

- dashboard and action engine
- dish detail and simulator
- invoice intake and review-confirm
- OCR adapter boundary with fixture default and external seam
- onboarding and pilot tools
- `STORE_DRIVER=memory|file|database`
- Prisma/Postgres-oriented database layer
- auth/session foundation with workspace roles
- deployment profile, readiness checks, and runtime validation
- mobile-friendly invoice review flow

## Safety Rules

- OCR and invoice parsing create drafts only
- `review-confirm` is the only path to ingredient-cost mutation
- cost history and supplier alerts are created only after confirmation
- no blind OCR import
- mobile invoice intake must remain usable

## Runtime Profiles

- `APP_MODE=demo|pilot|production`
- `AUTH_MODE=dev|disabled|production_future`
- `STORE_DRIVER=memory|file|database`
- `OCR_PROVIDER=fixture|external_env|disabled`
- `NODE_ENV=development|test|production`

Important:

- `APP_MODE=production` must not run with unsafe defaults
- `STORE_DRIVER=database` does not silently fall back to memory
- `AUTH_MODE=dev` in production-like mode is a blocker
- `SESSION_SECRET` is required for non-demo authenticated modes
- external OCR remains optional

## Storage Drivers

- `memory`: default local/demo mode
- `file`: local JSON persistence under `DATA_DIR`
- `database`: Postgres-oriented Prisma-backed store

If `DATABASE_URL` is missing:

- `validate:db` skip-reports clearly
- `STORE_DRIVER=database` routes fail clearly instead of silently falling back
- readiness reports the DB blocker without exposing secrets

## Auth Modes

- `AUTH_MODE=dev`: local dev-session auth with server-generated session tokens and hashed token storage
- `AUTH_MODE=disabled`: allowed for demo mode only
- `AUTH_MODE=production_future`: readiness placeholder for later production identity work

Current auth scope:

- `POST /api/auth/dev-login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `POST /api/auth/context`
- owner/admin/member RBAC on protected restaurant data endpoints
- demo mode remains usable without login

This is a production-oriented auth foundation, not production-complete auth yet.

## Health And Readiness

- `GET /health`
- `GET /api/health/deep`
- `GET /api/health/readiness`
- `GET /api/app/config`

Readiness rules:

- the API never exposes raw secrets
- `productionReady` currently remains `false`
- production blockers are reported through safe readiness checks
- request ids are attached to responses and error payloads

## Validation Commands

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
npm audit
```

## Database Commands

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
npm run validate:db
```

Notes:

- `db:migrate` targets a configured Postgres database
- `validate:db` is skip-aware when `DATABASE_URL` is missing
- memory and file validation still work without a database

## Local Run

```bash
npm run dev
```

Optional production-oriented local build:

```bash
npm run build:production
npm run start:api
```

Local URLs:

- frontend: `http://localhost:5173`
- backend: `http://localhost:3001`
- readiness: `http://localhost:3001/api/health/readiness`
- deep health: `http://localhost:3001/api/health/deep`
- app config: `http://localhost:3001/api/app/config`
- login: `http://localhost:5173/login`

## Main Routes

- `/`
- `/login`
- `/onboarding`
- `/dishes`
- `/dishes/:dishId`
- `/invoices`
- `/alerts`
- `/pilot-tools`

## Key API Endpoints

- `GET /api/app/config`
- `GET /api/health/deep`
- `GET /api/health/readiness`
- `GET /api/demo/datasets`
- `POST /api/auth/dev-login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `POST /api/auth/context`
- `GET /api/export`
- `POST /api/import/validate`
- `POST /api/import`
- `POST /api/datasets/:id/reset`
- `GET /api/ingredients`
- `POST /api/ingredients`
- `PATCH /api/ingredients/:id`
- `GET /api/recipes`
- `POST /api/recipes`
- `PATCH /api/recipes/:id`
- `GET /api/dishes`
- `POST /api/dishes`
- `PATCH /api/dishes/:id`
- `GET /api/invoices/:id`
- `POST /api/invoices/parse-mock`
- `POST /api/invoices/manual-draft`
- `POST /api/invoices/:id/review-confirm`
- `GET /api/ocr/providers`
- `GET /api/ocr/jobs`
- `GET /api/ocr/jobs/:id`
- `POST /api/ocr/invoices/upload`
- `GET /api/alerts/price-changes`
- `GET /api/analytics/overview`
- `GET /api/analytics/actions`

## What Phase 14 Added

- stricter production-oriented env profile validation
- `GET /api/health/readiness`
- structured logging foundation with request ids
- safe error response normalization
- runtime validation and production-readiness reporting
- mobile readiness documentation and smoke checks
- deployment and production runbooks

## What Is Still Not Claimed

- production SaaS readiness
- production-complete auth provider, invite flow, or hardened session lifecycle
- live DB runtime validation in this environment without `DATABASE_URL`
- live OCR accuracy benchmark on real restaurant invoices
- billing readiness
- final monitoring, backup, and legal/privacy maturity

## Documentation

- [docs/MASTERPLAN.md](docs/MASTERPLAN.md)
- [docs/ROADMAP.md](docs/ROADMAP.md)
- [docs/TECH_SPEC.md](docs/TECH_SPEC.md)
- [docs/ENVIRONMENT_CONFIG.md](docs/ENVIRONMENT_CONFIG.md)
- [docs/DEPLOYMENT_READINESS.md](docs/DEPLOYMENT_READINESS.md)
- [docs/PRODUCTION_RUNBOOK.md](docs/PRODUCTION_RUNBOOK.md)
- [docs/MOBILE_READINESS.md](docs/MOBILE_READINESS.md)
- [docs/OBSERVABILITY.md](docs/OBSERVABILITY.md)
- [docs/PRODUCTION_SAAS_GAP_AUDIT.md](docs/PRODUCTION_SAAS_GAP_AUDIT.md)
- [docs/DATABASE_MODEL.md](docs/DATABASE_MODEL.md)
- [docs/AUTH_ACCESS_CONTROL.md](docs/AUTH_ACCESS_CONTROL.md)
- [docs/NEXT_CODEX_PROMPT.md](docs/NEXT_CODEX_PROMPT.md)
- [docs/PRODUCT_CORE_VALIDATION.md](docs/PRODUCT_CORE_VALIDATION.md)
