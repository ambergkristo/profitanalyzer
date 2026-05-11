# Menu Profit Optimizer

Menu Profit Optimizer is a restaurant profit product for dish-margin analysis, supplier cost change review, invoice intake, OCR draft review, and concrete pricing actions.

RM1-RM9 are complete as a controlled pilot and founding-partner foundation. The strategic target is now production SaaS readiness, but production readiness is still not claimed.

## Current Status

- RM1-RM9: complete as controlled pilot / founding-partner foundation
- Phase 11: complete as production SaaS strategy reset
- Phase 12: partial, with database and multi-tenant foundation in place
- Phase 13: complete as auth and workspace access foundation
- Phase 14: complete as deployment and observability foundation
- Phase 15: complete as mobile-first onboarding foundation
- Phase 16: complete as production invoice/OCR pipeline foundation
- Phase 17: complete as billing/license foundation
- Phase 18: complete as security/privacy/legal launch-gate foundation
- Production blocker sprint 1: local Postgres runtime validation path added; hosted production DB validation still required
- Production blocker sprint 2: password auth foundation and session hardening added; hosted production identity validation still required
- Production blocker sprint 3: hosted deployment validation foundation added; actual hosted deploy execution still required
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
- hosted deployment plan, migration runbook, backup/restore runbook, and `validate:deployment`
- mobile-first restaurant onboarding and invoice review flow
- onboarding checklist for profile, ingredients, recipes, dishes, suppliers, first invoice, and dashboard review
- upload storage abstraction, OCR retry/cancel lifecycle, confidence policy, and OCR benchmark workflow
- production app shell with work-tree navigation, Settings diagnostics, EE/EN language foundation, and dark/light theme tokens
- consolidated production workspaces for Menu, Dish Detail, Recipes, Ingredients, Alerts, Onboarding, and Billing

## Safety Rules

- OCR and invoice parsing create drafts only
- `review-confirm` is the only path to ingredient-cost mutation
- cost history and supplier alerts are created only after confirmation
- no blind OCR import
- mobile invoice intake must remain usable

## UI Shell And Visual System

The frontend now uses a production app shell instead of a demo-first cockpit:

- primary navigation: Overview, Menu, Recipes, Ingredients, Invoices, Alerts, Onboarding, Billing, Settings
- demo scenario controls are restrained to demo mode and no longer dominate primary work views
- technical environment details live under Settings/Diagnostics, not in the main operating screens
- dark theme remains default and light theme is available through persisted design tokens
- EE/EN language toggle exists for key navigation and action labels
- dashboard and invoice work areas are compact, screen-first layouts with bounded internal scroll where needed
- invoice upload/review remains mobile-first and draft-only before confirmation

## Runtime Profiles

- `APP_MODE=demo|pilot|production`
- `AUTH_MODE=dev|disabled|password|external_oidc_future`
- `STORE_DRIVER=memory|file|database`
- `UPLOAD_STORAGE_DRIVER=memory|local_file`
- `OCR_PROVIDER=fixture|external_env|disabled`
- `NODE_ENV=development|test|production`

Important:

- `APP_MODE=production` must not run with unsafe defaults
- `STORE_DRIVER=database` does not silently fall back to memory
- `AUTH_MODE=dev` in production-like mode is a blocker
- `SESSION_SECRET` is required for non-demo authenticated modes
- external OCR remains optional
- production mode cannot rely on memory-only upload storage

## Storage Drivers

- `memory`: default local/demo mode
- `file`: local JSON persistence under `DATA_DIR`
- `database`: Postgres-oriented Prisma-backed store

If `DATABASE_URL` is missing:

- `validate:db` skip-reports clearly
- `STORE_DRIVER=database` routes fail clearly instead of silently falling back
- readiness reports the DB blocker without exposing secrets

Local Postgres validation:

```bash
docker compose up -d postgres
```

PowerShell:

```powershell
$env:DATABASE_URL="postgresql://profit_analyzer:local_dev_password@localhost:55432/profit_analyzer"
npm run db:generate
npm run db:migrate
npm run db:seed
npm run validate:db
```

See `docs/DATABASE_RUNTIME_VALIDATION.md`.

## Invoice/OCR Pipeline

- `UPLOAD_STORAGE_DRIVER=memory` remains the default for deterministic validation.
- `UPLOAD_STORAGE_DRIVER=local_file` stores upload files under `UPLOAD_DATA_DIR` for local production-like operation.
- Upload metadata is safe to return; local file paths and raw file contents are not exposed.
- OCR jobs track upload metadata, provider attempts, failure codes, retry/cancel state, and confidence-policy output.
- `npm run validate:invoice-pipeline` validates draft-only safety, retry/cancel behavior, upload metadata safety, and post-confirm cost history/alerts.
- `npm run benchmark:ocr` runs deterministic fixture benchmarking and skips live provider benchmarking unless provider env and private samples are configured.

## Auth Modes

- `AUTH_MODE=dev`: local/demo validation auth with server-generated session tokens and hashed token storage
- `AUTH_MODE=disabled`: allowed for demo mode only
- `AUTH_MODE=password`: password auth foundation with hashed passwords, hashed session tokens, expiry, and logout invalidation
- `AUTH_MODE=external_oidc_future`: documented future provider seam; not a live provider integration yet

Current auth scope:

- `POST /api/auth/dev-login`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `POST /api/auth/context`
- owner/admin/member RBAC on protected restaurant data endpoints
- demo mode remains usable without login

Dev login is blocked in production mode. This is a stronger production-oriented auth foundation, not production-complete identity yet.

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
npm run validate:deployment
npm run validate:production-readiness
npm run validate:mobile
npm run validate:onboarding
npm run validate:invoice-pipeline
npm run validate:billing
npm run validate:launch-gate
npm run benchmark:ocr
npm run validate:ui-reset
npm audit
```

## Billing And License Foundation

Phase 17 adds a production-shaped billing model without live payment processing:

- pricing plans for starter, pro, multi-location, founding partner, and internal demo use
- workspace subscription and license status
- explicit founding partner lifetime entitlements
- usage counters for OCR uploads, invoice confirmations, users, and restaurants
- billing provider seam with `none`, `manual`, and disabled `stripe_future`
- `/billing` status page with no payment form or card collection

Production SaaS readiness is still not claimed. Live checkout, webhooks, and payment operations remain future work.

## Database Commands

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
npm run validate:db
```

Notes:

- `db:migrate` targets a configured Postgres database
- `validate:db` is skip-aware when `DATABASE_URL` is missing and live-validates local Postgres when it is present
- memory and file validation still work without a database

## Local Run

```bash
npm run dev
```

Optional production-oriented local build:

```bash
npm run build:production
npm run start:api
npm run preview:web
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
- `/recipes`
- `/ingredients`
- `/invoices`
- `/alerts`
- `/billing`
- `/settings`
- `/pilot-tools`

## Key API Endpoints

- `GET /api/app/config`
- `GET /api/health/deep`
- `GET /api/health/readiness`
- `GET /api/demo/datasets`
- `POST /api/auth/dev-login`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `POST /api/auth/context`
- `GET /api/restaurant/profile`
- `PATCH /api/restaurant/profile`
- `GET /api/onboarding/status`
- `PATCH /api/onboarding/status`
- `POST /api/onboarding/complete-step`
- `POST /api/onboarding/skip-step`
- `GET /api/onboarding/checklist`
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
- `POST /api/ocr/jobs/:id/retry`
- `POST /api/ocr/jobs/:id/cancel`
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

## What Phase 15 Added

- mobile-first onboarding wizard at `/onboarding`
- restaurant profile setup
- ingredient setup cards
- touch-friendly recipe builder
- dish builder linked to recipes
- supplier setup
- first-invoice step that routes through the existing invoice intake and review-confirm safety boundary
- dashboard review/completion step
- `npm run validate:onboarding`
- expanded `npm run validate:mobile` coverage for onboarding

## What Phase 16 Added

- upload storage abstraction with `memory` and `local_file` drivers
- safe upload metadata and filename sanitization
- stronger OCR job lifecycle with failed retry and safe cancellation
- explicit OCR confidence policy and review-burden scoring
- invoice/OCR audit event hooks for draft creation, parse failure, confirmation, cost updates, and alerts
- mobile photo upload hardening with image/PDF accept and browser capture hint
- `npm run validate:invoice-pipeline`
- `npm run benchmark:ocr`

## What Is Still Not Claimed

- production SaaS readiness
- production-complete identity lifecycle, invite email delivery, password reset/email verification, or external identity provider
- hosted production DB runtime validation, backup/restore rehearsal, and production migration rollout
- live OCR accuracy benchmark on real restaurant invoices
- live payment processing
- final monitoring and backup maturity
- lawyer-reviewed legal/privacy documents

## What Phase 18 Added

- security baseline and checklist
- privacy policy draft and terms draft with not-lawyer-reviewed disclaimers
- data retention, export, and deletion process
- case-study/testimonial consent rules that prohibit fake endorsements
- central production launch gate
- `npm run validate:launch-gate`
- production-readiness report coverage for Phase 18

Current launch verdict:

- controlled demo: yes
- founding partner controlled launch: conditional
- public paid SaaS launch: no-go

## Hosted Deployment

Recommended topology:

- frontend: Vercel or equivalent static hosting
- backend: Render/Fly/Railway or equivalent Node service
- database: hosted Postgres
- uploads: persistent disk only for controlled deployments; managed object storage remains a blocker

Use `VITE_API_BASE_URL` for split-origin frontend deployments. See `docs/HOSTED_DEPLOYMENT_PLAN.md`, `docs/PRODUCTION_MIGRATION_RUNBOOK.md`, and `docs/BACKUP_RESTORE_RUNBOOK.md`.

## Documentation

- [docs/MASTERPLAN.md](docs/MASTERPLAN.md)
- [docs/ROADMAP.md](docs/ROADMAP.md)
- [docs/TECH_SPEC.md](docs/TECH_SPEC.md)
- [docs/ENVIRONMENT_CONFIG.md](docs/ENVIRONMENT_CONFIG.md)
- [docs/DEPLOYMENT_READINESS.md](docs/DEPLOYMENT_READINESS.md)
- [docs/PRODUCTION_RUNBOOK.md](docs/PRODUCTION_RUNBOOK.md)
- [docs/MOBILE_READINESS.md](docs/MOBILE_READINESS.md)
- [docs/OBSERVABILITY.md](docs/OBSERVABILITY.md)
- [docs/INVOICE_PIPELINE_PRODUCTION.md](docs/INVOICE_PIPELINE_PRODUCTION.md)
- [docs/SECURITY_BASELINE.md](docs/SECURITY_BASELINE.md)
- [docs/PRIVACY_POLICY_DRAFT.md](docs/PRIVACY_POLICY_DRAFT.md)
- [docs/TERMS_OF_SERVICE_DRAFT.md](docs/TERMS_OF_SERVICE_DRAFT.md)
- [docs/DATA_RETENTION_AND_DELETION.md](docs/DATA_RETENTION_AND_DELETION.md)
- [docs/CASE_STUDY_AND_TESTIMONIAL_CONSENT.md](docs/CASE_STUDY_AND_TESTIMONIAL_CONSENT.md)
- [docs/SECURITY_CHECKLIST.md](docs/SECURITY_CHECKLIST.md)
- [docs/PRODUCTION_LAUNCH_GATE.md](docs/PRODUCTION_LAUNCH_GATE.md)
- [docs/REAL_INVOICE_BENCHMARK_GUIDE.md](docs/REAL_INVOICE_BENCHMARK_GUIDE.md)
- [docs/PRODUCTION_SAAS_GAP_AUDIT.md](docs/PRODUCTION_SAAS_GAP_AUDIT.md)
- [docs/DATABASE_MODEL.md](docs/DATABASE_MODEL.md)
- [docs/AUTH_ACCESS_CONTROL.md](docs/AUTH_ACCESS_CONTROL.md)
- [docs/NEXT_CODEX_PROMPT.md](docs/NEXT_CODEX_PROMPT.md)
- [docs/PRODUCT_CORE_VALIDATION.md](docs/PRODUCT_CORE_VALIDATION.md)
