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

Important:

- fixture OCR exists
- external provider seam exists
- OCR remains draft-only
- real OCR accuracy is still not claimed

## RM9 - Controlled Pilot Package

Status: complete as controlled pilot and founding-partner foundation.

Important:

- this does not mean production SaaS readiness
- this does not mean auth, tenancy, deployment, or billing exist
- this does not mean live OCR accuracy is proven

## PHASE 11 - Production SaaS Architecture Reset

### Goal

Reposition the project from controlled pilot and founding-partner product toward explicit production SaaS readiness.

### Scope

- production SaaS readiness definition
- architectural gap audit
- production milestone sequence
- risk register
- mobile-first production requirement
- OCR safety boundary retained

## PHASE 12 - Database + Multi-Tenant Data Model

### Goal

Move from memory and file store to real database-backed SaaS data model.

### Scope

- Postgres or equivalent DB
- Prisma or equivalent migration layer if appropriate
- tenants, workspaces, restaurants
- users
- workspace membership
- restaurant data isolation
- ingredients, recipes, dishes, invoices, alerts, OCR jobs in DB
- seed and migration strategy
- export and backup path
- keep memory and file store for tests and demo if useful

## PHASE 13 - Auth + Workspace Access Control

### Goal

Protect the SaaS app and isolate customer data.

### Scope

- login and session strategy
- user model
- workspace membership
- owner, admin, member roles
- protected API routes
- frontend auth flow
- route guards
- test coverage for access control
- no data leakage across workspaces

## PHASE 14 - Production Deployment + Observability

### Goal

Make the app deployable and operable.

### Scope

- deployment profile
- frontend hosting
- backend hosting
- production env validation
- database connection
- health and deep health
- structured logging
- error handling
- monitoring and semi-observability
- backup and export process
- rollback and readiness docs

## PHASE 15 - Mobile-First Restaurant Onboarding

### Goal

Make a real restaurant able to onboard.

### Scope

- onboarding wizard
- restaurant profile
- menu setup
- ingredient setup
- recipe builder
- dish builder
- supplier setup
- invoice intake setup
- mobile-first invoice upload and review
- setup checklist
- no desktop-only critical path

## PHASE 16 - Production Invoice/OCR Pipeline

### Goal

Make invoice and OCR workflow production-safe.

### Scope

- real provider benchmark
- file upload storage strategy
- OCR job persistence
- provider error handling
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
- billing not required to be fully live unless feasible

## PHASE 18 - Security, Privacy, Legal, and Launch Gate

### Goal

Establish production launch baseline.

### Scope

- privacy policy draft
- terms draft
- data retention policy
- case-study consent
- security checklist
- secret hygiene
- data export and delete process
- launch readiness checklist
- production SaaS go or no-go gate
