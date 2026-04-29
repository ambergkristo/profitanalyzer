# Menu Profit Optimizer

Menu Profit Optimizer is a restaurant profit product for dish-margin analysis, supplier cost change review, invoice intake, and concrete pricing actions.

RM1-RM9 are complete as a controlled pilot and founding-partner foundation. The strategic target is now production SaaS readiness, but production readiness is not claimed yet.

## Current Status

- RM1-RM9: complete as controlled pilot / founding-partner foundation
- Phase 11: complete as strategy and architecture reset
- Phase 12: database and multi-tenant data foundation is in progress
- production SaaS readiness: not claimed
- OCR safety boundary: unchanged

The current product already includes:

- dashboard and action engine
- dish detail and simulator
- invoice intake and review-confirm
- OCR adapter boundary with fixture default and external seam
- onboarding and pilot tools
- `STORE_DRIVER=memory|file`
- new `STORE_DRIVER=database` foundation
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
- `database`: Postgres-oriented Prisma-backed store foundation behind the same store boundary

Important:

- `STORE_DRIVER=memory` remains the default
- `STORE_DRIVER=file` remains supported
- `STORE_DRIVER=database` does not silently fall back to memory
- if `DATABASE_URL` is missing, DB validation skips and DB runtime reports a clear configuration failure

## Environment

Example `.env` values:

```bash
APP_MODE=demo
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

## Main Routes

- `/`
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

## What Phase 12 Added

- Prisma schema for workspace, restaurant, user, membership, ingredients, recipes, dishes, suppliers, invoices, lines, cost history, supplier matches, alerts, OCR jobs, and audit logs
- Postgres-targeted DB driver behind the existing store boundary
- tenant-aware `StoreContext` foundation
- DB seed and migration scaffolding
- `validate:db`
- DB-aware app config and deep health reporting

## What Is Still Not Claimed

- production SaaS readiness
- live auth and protected APIs
- live tenant-isolated user sessions
- live OCR accuracy benchmark on real restaurant invoices
- billing readiness
- production backup/observability maturity

## Documentation

- [docs/MASTERPLAN.md](docs/MASTERPLAN.md)
- [docs/ROADMAP.md](docs/ROADMAP.md)
- [docs/TECH_SPEC.md](docs/TECH_SPEC.md)
- [docs/ENVIRONMENT_CONFIG.md](docs/ENVIRONMENT_CONFIG.md)
- [docs/DEPLOYMENT_READINESS.md](docs/DEPLOYMENT_READINESS.md)
- [docs/PRODUCTION_SAAS_GAP_AUDIT.md](docs/PRODUCTION_SAAS_GAP_AUDIT.md)
- [docs/DB_ADAPTER_PLAN.md](docs/DB_ADAPTER_PLAN.md)
- [docs/DATABASE_MODEL.md](docs/DATABASE_MODEL.md)
- [docs/NEXT_CODEX_PROMPT.md](docs/NEXT_CODEX_PROMPT.md)
- [docs/PRODUCT_CORE_VALIDATION.md](docs/PRODUCT_CORE_VALIDATION.md)
