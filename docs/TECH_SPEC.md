# Technical Specification

## Target Architecture

### Frontend

- React
- Vite
- TypeScript
- mobile-first invoice intake and review

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

### OCR

- env-configured provider adapter
- fixture remains safe default
- OCR creates drafts only
- review-confirm remains mandatory

### Deployment Shape

- separate frontend and backend deployment
- database as separate managed service
- production env validation as a gate
- health and deep health endpoints

### Auth Direction

- `AUTH_MODE=dev|disabled`
- server-generated dev session tokens with hashed server-side storage
- workspace membership based access checks
- owner, admin, member roles
- authenticated `StoreContext` for protected routes
- final production identity provider selection remains later work

### Observability Direction

- structured health checks now
- structured logging, monitoring, and error aggregation later

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
- no auth dependency yet

## Production Gaps Still Open

- database runtime is not yet universally validated in this local environment without `DATABASE_URL`
- production-complete auth provider, invite flow, and hardened session lifecycle are not live
- auth works today as a dev-session and RBAC foundation, not final customer identity
- billing is not live
- production object or file storage strategy is not finalized
- monitoring and alerting are not live
- backup and restore operations are not fully productionized
- external OCR is not benchmarked on real invoices yet

## Fixed Technical Rules

- no blind OCR import
- invoice and OCR output remain draft-only until review-confirm
- ingredient costs update only after confirmation
- mobile invoice upload and review remain a product requirement
