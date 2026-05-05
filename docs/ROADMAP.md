# Roadmap

## RM1 - Core Engine + Basic UI

Status: complete.

## RM2 - Dashboard + Core Insights

Status: complete.

## RM3 - Dish Detail + Cost Breakdown

Status: complete.

## RM4 - Price Simulator

Status: complete.

## RM5 - Synthetic Restaurant Validation

Status: complete.

## RM6 - Premium Decision UX

Status: complete.

## RM7 - Invoice Scan Cost Intake

Status: complete.

## RM8 - OCR/Vision Adapter Boundary

Status: complete architecturally.

## RM9 - Controlled Pilot Package

Status: complete as controlled pilot and founding-partner foundation.

Important:

- this does not mean production SaaS readiness
- this does not mean auth, tenancy, billing, or production observability are complete
- this does not mean live OCR accuracy is proven

## PHASE 11 - Production SaaS Architecture Reset

Status: complete as strategy and roadmap reset.

### Goal

Reposition the project from controlled pilot and founding-partner product toward explicit production SaaS readiness.

## PHASE 12 - Database + Multi-Tenant Data Model

Status: partial / architectural pass.

### Goal

Move from memory and file store toward real database-backed SaaS data foundations.

### Scope

- Postgres target
- Prisma schema and migration layer
- workspace, restaurant, user, and membership model
- DB store driver behind the existing store boundary
- restaurant-scoped business entities in DB
- seed strategy
- DB validation command
- no cross-workspace leakage at the data layer
- keep `memory` and `file` drivers alive for demo, tests, and local fallback

### Honest Current Position

- schema, seed, store driver, and validation scaffolding can exist before a live DB is validated in every environment
- production SaaS readiness is still not claimed at the end of this phase alone

## PHASE 13 - Auth + Workspace Access Control

Status: complete as auth and workspace access foundation.

### Goal

Protect the SaaS app and isolate customer data through authenticated workspace context.

### Scope

- login and session strategy
- user and membership flow
- owner, admin, member roles
- protected API routes
- frontend auth flow and route guards
- cross-workspace leakage tests

### Honest Current Position

- the app now has real protected-route behavior, workspace membership, and basic RBAC
- demo mode still intentionally bypasses auth for product demonstration
- the current `dev-login` flow is a local and deployment-foundation auth layer, not the final production identity product
- production SaaS readiness is still not claimed at the end of this phase alone

## PHASE 14 - Production Deployment + Observability

Status: complete as deployment and observability foundation.

### Goal

Make the app deployable and operable.

### Scope

- production deployment profile
- frontend and backend hosting
- production env validation
- DB connectivity checks
- structured logging
- error handling and monitoring
- backup and export process
- rollback and readiness documentation

### Honest Current Position

- readiness, runtime validation, and production-oriented env checks now exist
- `productionReady` still remains `false`
- final deployment, monitoring, backup, legal/privacy, and billing gates are still open

## PHASE 15 - Mobile-First Restaurant Onboarding

Status: complete as mobile-first onboarding foundation.

### Goal

Make a real restaurant able to onboard without desktop-only friction.

### Scope

- onboarding wizard
- restaurant profile
- menu, ingredient, recipe, and dish setup
- supplier setup
- mobile-first invoice upload and review
- setup checklist
- no desktop-only critical path

### Honest Current Position

- restaurants can now follow a guided setup path without editing JSON manually
- setup is mobile-first and uses cards/forms rather than desktop-only tables
- first invoice setup still preserves the draft-only review-confirm safety boundary
- this does not make the product production SaaS ready by itself; production OCR storage, billing/license, final security/privacy, and launch gates remain open

## PHASE 16 - Production Invoice/OCR Pipeline

### Goal

Make the invoice and OCR pipeline production-safe.

### Scope

- real provider benchmark
- safe file and image storage strategy
- OCR job persistence
- provider reliability handling
- confidence thresholds
- review-confirm audit log
- cost history auditability
- no blind import
- mobile photo upload flow
- OCR accuracy reporting

## PHASE 17 - Billing + License Model Readiness

### Goal

Prepare monetization and founding-partner lifetime access handling.

### Scope

- plans
- trial and founding-partner license model
- billing provider seam
- subscription status model
- usage limits if needed
- lifetime access terms

## PHASE 18 - Security, Privacy, Legal, and Launch Gate

### Goal

Establish the production launch baseline.

### Scope

- privacy policy draft
- terms draft
- data retention policy
- security checklist
- secret hygiene
- export and delete process
- launch readiness checklist
- production SaaS go or no-go gate
