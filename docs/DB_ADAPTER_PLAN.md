# Database Adapter Implementation Notes

## Phase 12 Status

Phase 12 now includes a real database foundation:

- Prisma schema
- Postgres target
- `STORE_DRIVER=database`
- `DATABASE_URL` support
- DB seed scaffolding
- `validate:db`
- workspace and restaurant scoping in the data model
- local Docker Postgres validation path
- live DB runtime validation report when `DATABASE_URL` is present

This is not yet a claim that production DB runtime is fully proven in every environment.

## Selected Approach

- Postgres target
- Prisma client and schema
- DB adapter behind the same store boundary as `memory` and `file`
- keep current business logic centralized, then persist state through the DB adapter

## Why The Adapter Wraps Existing Store Logic

The current product already has substantial tested business logic for:

- analytics
- invoice parsing
- review-confirm
- OCR draft handling
- alerts
- pilot import and export

The lowest-risk Phase 12 move is:

1. keep existing logic stable
2. load persistent state into the existing store shape
3. persist the current dataset state back into relational tables

That preserves behavior while the SaaS data layer is introduced.

## What The DB Layer Stores

- users
- workspaces
- workspace memberships
- restaurants
- ingredients
- recipes
- recipe ingredients
- dishes
- suppliers
- purchase invoices
- purchase invoice lines
- ingredient cost history
- supplier product matches
- price change alerts
- OCR jobs
- audit logs

It also stores JSON snapshots where needed to preserve current invoice and OCR view parity without re-implementing every derived object immediately.

## Non-Negotiable Rules

- no silent fallback from `database` to `memory`
- OCR still creates drafts only
- `review-confirm` remains mandatory
- no ingredient-cost mutation before confirmation
- no blind OCR import

## Runtime Validation

Use `docs/DATABASE_RUNTIME_VALIDATION.md` for the local Postgres path.

When `DATABASE_URL` is configured, `validate:db` now proves:

- Prisma connection and migrations
- seed data
- analytics and dish detail from database store
- ingredient, recipe, and dish edit persistence after reload
- invoice review-confirm cost history and alerts
- OCR job metadata through API runtime
- billing status
- workspace isolation and scoped reset/export

Current seed scope:

- the database seed persists the mixed restaurant baseline as the default app dataset
- `validate:db` creates a dedicated second isolation workspace/restaurant for tenant-isolation proof
- the memory/file demo scenarios remain unchanged and still cover the broader synthetic scenario set

## Known Gaps

- hosted production DB validation is still required
- auth is not live yet
- per-user actor context is only a placeholder
- production-grade migration rollout and rollback playbooks are still future work
