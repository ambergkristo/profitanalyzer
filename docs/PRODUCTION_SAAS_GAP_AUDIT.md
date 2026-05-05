# Production SaaS Gap Audit

## Current Complete

- core calculation engine
- dashboard and decision ranking
- dish detail and simulator
- synthetic validation
- invoice intake and review-confirm
- OCR adapter boundary
- onboarding and pilot tools
- export, import, and reset
- memory and file store drivers
- database schema and DB store foundation
- production-shaped invoice/OCR upload pipeline foundation
- deterministic OCR benchmark workflow

## Partially Complete

- Postgres target selected
- Prisma schema, seed, and validation scaffolding added
- DB store driver implemented behind the store boundary
- workspace and restaurant scoping added at the data model layer
- auth/session and workspace membership foundation added
- protected route and RBAC foundation added
- deployment profile, readiness endpoint, and runtime validation added
- structured logging foundation and safe error responses added
- mobile readiness documentation and smoke validation added
- mobile-first onboarding wizard added
- restaurant profile, ingredient, recipe, dish, supplier, first invoice, and dashboard review setup steps added
- onboarding validation command added
- upload storage abstraction with `memory` and `local_file`
- OCR job retry/cancel lifecycle and confidence policy added
- invoice pipeline validation command added

## Missing For Production SaaS

- live database rollout validated in target hosting environment
- production-complete auth provider and account lifecycle
- invite and workspace management flows
- hosted object storage strategy for OCR uploads
- monitoring and operational alerting
- production backup and restore process beyond controlled export/import
- privacy, legal, and security baseline
- billing and license model
- full mobile browser validation for critical workflows
- live OCR benchmark on realistic private invoice samples with configured provider
- real restaurant onboarding rehearsal with messy customer data
- full mobile browser automation for onboarding and invoice workflows

## Strategic Interpretation

The product now has a stronger SaaS foundation than the earlier controlled pilot package.

It still is not production SaaS ready until:

- DB runtime is proven
- auth and access control are hardened beyond dev-session mode
- deployment and observability are in place
- mobile onboarding and invoice intake are validated
- OCR accuracy and operational reliability are benchmarked honestly
