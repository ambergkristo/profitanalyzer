# DB Adapter Plan

## Current Status

The controlled pilot package supports:

- `STORE_DRIVER=memory`
- `STORE_DRIVER=file`

Database persistence is not implemented yet.

The future seam exists conceptually through the store boundary in `apps/api/src/store`, and a placeholder adapter exists in:

- `apps/api/src/store/databaseStore.ts`

That placeholder throws a clear not-implemented error on purpose.

## Why Database Is Deferred

RM9 is closing as a controlled pilot package, not a full production SaaS rollout.

Local JSON persistence is enough to prove:

- workspace reset/export/import safety
- pilot data editing
- recipe and dish setup persistence across reload
- invoice and OCR review-confirm safety with persistence enabled

Adding a real database in this sprint would create more churn than value.

## Required Adapter Responsibilities

A future database store must support the same `AppStore` contract as memory and file mode.

At minimum it must handle:

- datasets and dataset state lookup
- ingredients
- recipes
- dishes
- suppliers
- invoice drafts and confirmed invoices
- ingredient cost history
- supplier product matches
- price alerts
- OCR jobs
- reset
- export/import

## Non-Negotiable Safety Rules

- no fallback from `STORE_DRIVER=database` to memory
- OCR still creates drafts only
- invoice and OCR still require `review-confirm`
- ingredient costs still change only after confirmation
- import validation must still run before write
- test mode must remain deterministic without a live database

## Recommended Future Shape

When a real database sprint starts:

1. Add `DATABASE_URL`
2. Implement `createDatabaseStore(...)`
3. Wire `STORE_DRIVER=database` only after read/write/reset/export paths are verified
4. Add database-specific integration tests
5. Keep `validate:pilot` and `validate:env` green without requiring database by default

## What A Future Database Sprint Should Prove

- persistent pilot state survives process restart without file JSON
- export/import remain compatible
- reset remains per-dataset and deterministic
- invoice and OCR safety boundary is unchanged
- hosted deployment can use durable storage without relying on ephemeral filesystem behavior
