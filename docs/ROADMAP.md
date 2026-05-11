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
- dev-login is local/demo only, password auth foundation exists, and hosted production identity/account lifecycle remains future work
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

- readiness, runtime validation, deployment validation, and production-oriented env checks now exist
- `productionReady` still remains `false`
- hosted smoke validation path exists, but actual hosted deployment execution, monitoring, backup rehearsal, legal/privacy, and billing gates are still open

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

Status: complete as production invoice/OCR pipeline foundation.

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

### Honest Current Position

- upload storage now has `memory` and `local_file` drivers, but hosted object storage remains future work
- OCR job metadata tracks upload linkage, attempts, failure codes, retry, cancel, and quality policy output
- deterministic benchmark and invoice-pipeline validation exist
- live provider accuracy is still not claimed without configured provider env and private benchmark samples
- review-confirm remains the only cost mutation path

## PHASE 17 - Billing + License Model Readiness

### Goal

Prepare monetization and founding-partner lifetime access handling.

### Scope

- pricing plans
- trial and founding-partner license model
- workspace subscription status model
- manual/no-provider billing seam
- future Stripe provider seam without live checkout
- workspace usage counters
- billing status UI
- billing validation report
- lifetime access terms represented as explicit entitlements

### Current Status

Phase 17 is complete as a billing/license foundation.

Important limits:

- no real payment processing
- no card collection
- no live checkout
- production SaaS readiness is still not claimed

## UI/UX RESET SPRINT 1 - Production App Shell and Visual System

Status: complete as frontend shell and visual-system reset.

### Goal

Move the frontend away from a demo cockpit and toward a production SaaS operating interface suitable for restaurant owners.

### Scope

- production app shell with left work-tree navigation
- compact top workspace bar
- Settings/Diagnostics area for technical environment details
- restrained demo scenario selector in demo mode only
- compact one-screen Overview workspace
- mobile-first invoice safety copy retained
- dark/light design-token system
- EE/EN language toggle foundation
- forbidden decorative/demo copy scan

### Honest Current Position

- this improves perceived product quality and shell coherence
- full visual polish of every page is still iterative
- production SaaS readiness is still not claimed

## PHASE 18 - Security, Privacy, Legal, and Launch Gate

Status: complete as security/privacy/legal launch-gate foundation.

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

### Current Verdict

- Controlled demo: yes.
- Founding partner controlled launch: conditional.
- Public paid SaaS launch: no-go.

### Honest Current Position

- Privacy, terms, retention, security, and consent documents are drafts/foundations, not lawyer-reviewed final legal documents.
- Production readiness remains false because hosted deployment execution has not been smoke-validated against real hosted URLs, production identity/account lifecycle, live payment provider decision, live OCR benchmark, monitoring, backup/restore rehearsal, UI finalization, and legal review remain open.
