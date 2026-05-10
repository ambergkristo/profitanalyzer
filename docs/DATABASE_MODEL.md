# Database Model

## Purpose

Phase 12 introduces the first production-oriented SaaS data model behind the existing store boundary.

## Core Identity Layers

- `User`
- `Workspace`
- `WorkspaceMembership`
- `Plan`
- `WorkspaceSubscription`
- `LicenseEntitlement`
- `UsageCounter`
- `AuthSession`
- `Restaurant`

Current Phase 12 behavior:

- one placeholder user is seeded for default ownership
- one workspace is created per dataset-backed restaurant
- restaurant-owned business data is scoped by `workspaceId` and `restaurantId`
- authenticated app requests now derive `workspaceId`, `restaurantId`, and `actorUserId` through `StoreContext`

## Restaurant-Owned Entities

- `Ingredient`
- `Recipe`
- `RecipeIngredient`
- `Dish`
- `Supplier`
- `PurchaseInvoice`
- `PurchaseInvoiceLine`
- `IngredientCostHistory`
- `SupplierProductMatch`
- `PriceChangeAlert`
- `OcrJob`
- `AuditLog`

## Isolation Rule

Every restaurant-owned business entity stores:

- `workspaceId`
- `restaurantId`

The DB adapter must never read or write restaurant data without scoped context.

## Commands

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
npm run validate:db
npm run db:reset:local
```

## Validation Behavior

- if `DATABASE_URL` is missing, `validate:db` prints `SKIPPED_DATABASE_VALIDATION`
- if `DATABASE_URL` exists, validation checks DB connectivity, applied migrations, seed viability, store reload persistence, analytics, dish detail, core CRUD, invoice review-confirm, OCR job metadata, billing status, scoped export, scoped reset, and workspace isolation
- `GET /api/health/readiness` reports DB configuration and reachability without exposing the raw connection string

## Access Rule

- protected app routes must derive context from membership, not from arbitrary client-supplied workspace IDs
- demo mode may still use a safe default dataset context for product demonstration
- non-demo mode should resolve restaurant data through authenticated workspace membership

## Known Gaps

- auth currently uses a dev-session flow, not the final production identity provider
- the default DB seed persists the mixed restaurant baseline; broader memory/file demo scenarios remain available outside DB mode
- full hosted DB parity should continue to be verified during deployment validation
- migration rollout policy and production backup strategy are still later work
- hosted production DB runtime, backup/restore, and rollout/rollback rehearsals still need separate validation
