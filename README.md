# Menu Profit Optimizer

Menu Profit Optimizer is a restaurant profit product for dish-margin analysis, supplier cost change review, invoice intake, OCR draft review, and concrete pricing actions.

RM1-RM9 are complete as a controlled pilot and founding-partner foundation. The strategic target is now production SaaS readiness, but production readiness is not claimed yet.

## Current Status

- RM1-RM9: complete as controlled pilot / founding-partner foundation
- Phase 11: complete as production SaaS strategy reset
- Phase 12: complete as database and multi-tenant data foundation
- Phase 13: complete as auth and workspace access foundation
- production SaaS readiness: not claimed
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
- mobile-friendly invoice review flow

## Safety Rules

- OCR and invoice parsing create drafts only
- `review-confirm` is the only path to ingredient-cost mutation
- cost history and supplier alerts are created only after confirmation
- no blind OCR import
- mobile invoice intake must remain usable

## Storage Drivers

- `memory`: default local/demo mode
- `file`: local JSON persistence under `DATA_DIR`
- `database`: Postgres-oriented Prisma-backed store

Important:

- `STORE_DRIVER=memory` remains the default
- `STORE_DRIVER=file` remains supported
- `STORE_DRIVER=database` does not silently fall back to memory
- if `DATABASE_URL` is missing, DB validation skips and DB runtime reports a clear configuration failure

## Auth Modes

- `AUTH_MODE=dev`: local dev-session auth with server-generated session tokens and hashed token storage
- `AUTH_MODE=disabled`: allowed for demo mode only; pilot mode warns and protected routes reject access

Current auth scope:

- `POST /api/auth/dev-login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `POST /api/auth/context`
- owner/admin/member RBAC on protected restaurant data endpoints
- demo mode remains usable without login

This is a production-oriented auth foundation, not production-complete auth yet. It is suitable for local validation, protected-route wiring, workspace scoping, and Phase 14 handoff, but it is not the final production identity solution.

## Environment

Example `.env` values:

```bash
APP_MODE=demo
AUTH_MODE=dev
SESSION_SECRET=
APP_BASE_URL=http://localhost:5173
STORE_DRIVER=memory
DATA_DIR=.data
DATABASE_URL=
OCR_PROVIDER=fixture
OCR_PROVIDER_API_KEY=
OCR_PROVIDER_MODEL=
OCR_PROVIDER_ENDPOINT=
OCR_PROVIDER_TIMEOUT_MS=30000
OCR_PROVIDER_MAX_RETRIES=1
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
npm audit
```

## Local Run

```bash
npm run dev
```

Local URLs:

- frontend: `http://localhost:5173`
- backend: `http://localhost:3001`
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

## What Phase 13 Added

- dev-session auth foundation with hashed session tokens
- `User`, `WorkspaceMembership`, `AuthSession`, and authenticated workspace context wiring
- protected restaurant-data routes in non-demo mode
- owner/admin/member role enforcement for key mutations
- auth-aware app config and deep health reporting
- minimal login screen, logout flow, and workspace indicator
- audit log foundation for key protected mutations
- `validate:auth`

## What Is Still Not Claimed

- production SaaS readiness
- production-complete auth provider, invite flow, or hardened session lifecycle
- live DB runtime validation in every target environment
- live OCR accuracy benchmark on real restaurant invoices
- billing readiness
- production backup and observability maturity

## Documentation

- [docs/MASTERPLAN.md](docs/MASTERPLAN.md)
- [docs/ROADMAP.md](docs/ROADMAP.md)
- [docs/TECH_SPEC.md](docs/TECH_SPEC.md)
- [docs/ENVIRONMENT_CONFIG.md](docs/ENVIRONMENT_CONFIG.md)
- [docs/DEPLOYMENT_READINESS.md](docs/DEPLOYMENT_READINESS.md)
- [docs/PRODUCTION_SAAS_GAP_AUDIT.md](docs/PRODUCTION_SAAS_GAP_AUDIT.md)
- [docs/DATABASE_MODEL.md](docs/DATABASE_MODEL.md)
- [docs/AUTH_ACCESS_CONTROL.md](docs/AUTH_ACCESS_CONTROL.md)
- [docs/NEXT_CODEX_PROMPT.md](docs/NEXT_CODEX_PROMPT.md)
- [docs/PRODUCT_CORE_VALIDATION.md](docs/PRODUCT_CORE_VALIDATION.md)
