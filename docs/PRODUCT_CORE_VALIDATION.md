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
- workspace and restaurant context foundations
- data-model isolation rules at the store layer

## What Phase 13 Adds To Validation

Phase 13 introduces:

- `validate:auth`
- dev-session auth coverage
- protected route checks in non-demo mode
- role-based access validation for owner, admin, and member
- cross-workspace denial checks at the access layer
- demo-mode bypass validation so product demos still work without login

## Production SaaS Validation Gates

Production SaaS readiness now requires:

- live DB persistence validation
- tenant isolation validation
- auth and access validation
- deployment validation
- OCR live benchmark
- mobile invoice workflow validation
- backup and export validation
- security and privacy baseline
- billing and license model validation

## What Is Still Not Proven

- live Postgres deployment in the target environment
- hardened production identity lifecycle beyond dev login
- authenticated isolation under a live DB in a production-like deployment
- production backup and restore maturity
- live OCR accuracy on real restaurant invoices
- mobile smoke coverage for the full invoice flow
- willingness to pay
- retention
- real restaurant onboarding effort

## Strategic Interpretation

The current product is a materially stronger SaaS foundation than the earlier pilot-only state.

It is still not production SaaS ready until the gates above are met.
