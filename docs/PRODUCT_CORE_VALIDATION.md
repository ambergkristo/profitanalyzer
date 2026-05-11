# Product Core Validation

## Current Validation Status

Validated now:

- core calculation logic
- dashboard and action engine behavior
- dish detail and simulator
- synthetic restaurant validation
- invoice review-confirm logic
- OCR adapter safety boundary
- controlled pilot package behavior
- environment validation
- file-store persistence behavior
- mobile-first onboarding API and UI smoke behavior
- invoice/OCR upload pipeline behavior
- OCR confidence-policy and benchmark workflow

## Readiness Shift

Controlled pilot validation is no longer the final gate.

The product logic is validated.
The pilot package is validated.
Production SaaS readiness requires stricter operational and access-control gates.

## What Phase 12 Adds To Validation

Phase 12 introduces:

- Prisma schema validation
- DB driver selection through `STORE_DRIVER=database`
- skip-aware `validate:db`
- live local Postgres runtime validation when `DATABASE_URL` is configured
- workspace and restaurant context foundations
- data-model isolation rules at the store layer

The live DB validation layer covers migrations, seed data, database store reload persistence, analytics, dish detail, core CRUD, invoice review-confirm, OCR job metadata, billing status, scoped export/reset, and workspace isolation.

## What Phase 13 Adds To Validation

Phase 13 introduces:

- `validate:auth`
- `validate:deployment`
- `validate:hosted`
- dev-session local validation plus password-auth coverage
- protected route checks in non-demo mode
- role-based access validation for owner, admin, and member
- cross-workspace denial checks at the access layer
- demo-mode bypass validation so product demos still work without login

## What Phase 14 Adds To Validation

Phase 14 introduces:

- `validate:runtime`
- `validate:production-readiness`
- `validate:mobile`
- production-oriented env blocker checks
- readiness endpoint validation
- safe error response validation with request ids
- mobile invoice/dashboard/dish-detail smoke checks
- deterministic production-readiness reports that still keep `productionReady=false`

## What Phase 15 Adds To Validation

Phase 15 introduces:

- `validate:onboarding`
- onboarding status and checklist endpoint validation
- restaurant profile setup validation
- ingredient, recipe, dish, and supplier setup validation
- owner/admin mutation and member denial checks for setup flow
- onboarding export safety checks
- expanded `validate:mobile` coverage for onboarding wizard, recipe builder, supplier setup, and first invoice step

## What Phase 16 Adds To Validation

Phase 16 introduces:

- `validate:invoice-pipeline`
- `benchmark:ocr`
- upload storage validation for `memory` and `local_file`
- OCR job lifecycle validation for parsed, failed, retry, and cancelled states
- confidence-policy and review-burden validation
- draft-only pre-confirm safety checks
- post-confirm cost-history, alerts, and supplier-action checks
- deterministic benchmark reports with live provider skip behavior

## Production SaaS Validation Gates

Production SaaS readiness now requires:

- live DB persistence validation
- tenant isolation validation
- auth and access validation
- deployment validation
- OCR live benchmark
- invoice pipeline validation
- upload storage validation
- OCR confidence-policy validation
- mobile invoice workflow validation
- backup and export validation
- security and privacy baseline
- billing and license model validation
- `validate:billing` proves plan seed, billing status, founding partner lifetime entitlement, trial status, usage counters, role protection, and secret-safe provider responses

## What Is Still Not Proven

- hosted Postgres deployment in the target environment
- hosted production identity lifecycle beyond the password-auth foundation
- authenticated isolation under a live DB in a production-like deployment
- production backup and restore maturity
- live OCR accuracy on real restaurant invoices
- hosted object storage behavior
- full mobile browser coverage for the invoice flow
- real restaurant onboarding time and data cleanup burden
- willingness to pay
- retention
- real restaurant onboarding effort

## Strategic Interpretation

The current product is a materially stronger SaaS foundation than the earlier pilot-only state.

It is still not production SaaS ready until the gates above are met.
## Phase 18 Validation Layer

Controlled pilot validation is not the final readiness gate.

Phase 18 adds launch-gate validation:

- required legal/security docs exist
- privacy and terms drafts include not-lawyer-reviewed disclaimers
- OCR review-confirm safety language exists
- no profit guarantee language exists
- no fake endorsement language exists
- data export/delete process is documented
- dependency audit status is documented
- production readiness report remains `productionReady=false`

Additional production validation still required:

- live DB validation
- production auth validation, including dev-login lockdown and password session validation
- deployment validation for build artifacts, strict production env behavior, readiness safety, CORS/base URLs, and frontend secret exposure
- hosted smoke validation for health/readiness/CORS/auth/analytics/billing/invoice safety when hosted URLs are provided
- live OCR benchmark
- backup/restore rehearsal
- legal review
- production monitoring validation
