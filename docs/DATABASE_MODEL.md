# Database Model

## Purpose

Phase 12 introduces the first production-oriented SaaS data model behind the existing store boundary.

## Core Identity Layers

- `User`
- `Workspace`
- `WorkspaceMembership`
- `Restaurant`

Current Phase 12 behavior:

- one placeholder user is seeded for default ownership
- one workspace is created per dataset-backed restaurant
- restaurant-owned business data is scoped by `workspaceId` and `restaurantId`

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
```

## Validation Behavior

- if `DATABASE_URL` is missing, `validate:db` prints `SKIPPED_DATABASE_VALIDATION`
- if `DATABASE_URL` exists, validation checks DB connectivity, seed viability, store load, and scoped analytics access

## Known Gaps

- auth is not connected to the user or membership model yet
- full DB parity for every operational helper should continue to be verified in later phases
- migration rollout policy and production backup strategy are still later work
