# Technical Specification

## Target Architecture

### Frontend

- React
- Vite
- TypeScript
- mobile-first invoice intake and review
- mobile-first onboarding wizard and setup forms

### Backend

- Express
- TypeScript
- shared decision logic from `packages/core`

### Store Layer

- `memory` driver for deterministic local/demo/test workflows
- `file` driver for controlled local persistence
- `database` driver for production-oriented Postgres persistence
- one shared store boundary across all drivers

### Database Target

- Postgres
- Prisma as the selected migration and client layer for Phase 12

### SaaS Data Model Direction

- workspace
- restaurant
- user
- workspace membership
- restaurant-scoped business entities
- authenticated actor context
- session model
- restaurant-scoped onboarding state and restaurant profile metadata

### Onboarding

- `GET /api/onboarding/status`
- `PATCH /api/onboarding/status`
- `POST /api/onboarding/complete-step`
- `POST /api/onboarding/skip-step`
- `GET /api/onboarding/checklist`
- `GET /api/restaurant/profile`
- `PATCH /api/restaurant/profile`
- setup data remains scoped through the same StoreContext used by protected restaurant data routes

### OCR

- env-configured provider adapter
- fixture remains safe default
- OCR creates drafts only
- review-confirm remains mandatory

### Deployment Shape

- separate frontend and backend deployment
- database as separate managed service
- production env validation as a gate
- health, deep health, and readiness endpoints
- `VITE_API_BASE_URL` for split-origin frontend deployments
- hosted deployment validation command and runbooks

### Auth Direction

- `AUTH_MODE=dev|disabled|password|external_oidc_future`
- server-generated session tokens with hashed server-side storage
- password auth foundation with hashed passwords
- dev-login blocked in production mode
- workspace membership based access checks
- owner, admin, member roles
- authenticated `StoreContext` for protected routes
- hosted production identity validation and external provider selection remain later work

### Observability Direction

- structured request logging foundation
- request id propagation
- safe error response normalization
- readiness and runtime validation gates
- full monitoring and alerting still later

## Phase 12 Implementation Direction

The chosen Phase 12 path is:

1. keep current API behavior stable
2. keep `memory` and `file` stores alive
3. add a Prisma-backed Postgres store behind the same boundary
4. keep current decision and invoice logic in one place
5. persist dataset state through the DB adapter without weakening OCR or invoice safety

## Migration Rule

Existing memory and file store behavior must not be destroyed during DB rollout.

The DB adapter is additive:

- no silent fallback from `database` to `memory`
- no requirement for `DATABASE_URL` in normal demo or test validation
- password auth and RBAC exist above the store boundary; DB migrations remain additive

## Production Gaps Still Open

- database runtime is not yet universally validated in this local environment without `DATABASE_URL`
- production-complete identity lifecycle, invite email delivery, password reset/email verification, and external provider are not live
- auth works today as password/dev-session and RBAC foundations, not a complete hosted customer identity program
- production deployment is locally validated through build/env/readiness checks, but not yet executed end-to-end in a hosted environment
- billing/license foundation exists with plans, workspace subscription state, lifetime entitlements, usage counters, and a provider seam
- live payment processing, checkout, and webhook handling are not live
- production object storage strategy is not finalized; local file upload storage requires persistent disk
- monitoring and alerting are not live beyond the current logging and readiness foundation
- backup and restore operations are not fully productionized
- external OCR is not benchmarked on real invoices yet
- onboarding is now implemented as a mobile-first foundation, but real restaurant onboarding time and data messiness are not yet proven

## Fixed Technical Rules

- no blind OCR import
- invoice and OCR output remain draft-only until review-confirm
- ingredient costs update only after confirmation
- mobile invoice upload and review remain a product requirement
## Phase 18 Launch-Gate Technical Status

Phase 18 does not add new product features. It adds the technical and documentation gate for production launch.

Added validation:

- `npm run validate:launch-gate`
- Phase 18 coverage in `npm run validate:production-readiness`

Production readiness remains false because:

- live Postgres runtime validation is skipped without `DATABASE_URL`
- external production identity provider and full account lifecycle are not implemented
- live payment processing is not implemented
- hosted upload/object storage is not implemented
- hosted deployment execution is not complete
- monitoring is foundational, not complete
- backup/restore rehearsal is not complete
- legal/privacy drafts are not lawyer-reviewed

Technical safety remains unchanged: OCR/upload creates drafts only, and review-confirm is still the only cost mutation path.
