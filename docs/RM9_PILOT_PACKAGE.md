# RM9 Pilot Package

## What Pilot-Ready Means Now

The current pilot package is a controlled first-restaurant build, not a production SaaS platform.

Included now:

- one workspace-oriented runtime through dataset selection
- demo mode and pilot mode separation
- dashboard, dishes, dish detail, simulator
- invoice cost intake
- OCR draft intake behind the review-confirm boundary
- supplier alerts and invoice-driven ranked actions
- export, import, and reset safety
- onboarding and pilot tooling routes

Excluded now:

- auth
- RBAC
- billing
- multi-tenant tenancy
- accounting
- inventory
- POS integration
- supplier API sync
- persistent database
- production OCR accuracy claims

## Demo Mode vs Pilot Mode

`demo` mode:

- synthetic datasets are visible
- scenario selector is active
- fixture OCR remains the expected default
- reset controls are useful for demo cleanup

`pilot` mode:

- UI copy switches to pilot workspace language
- the product should be treated as a controlled restaurant test
- the same review-confirm safety model remains mandatory

## Pilot Safety Rules

- OCR creates drafts only
- invoice parsing creates drafts only
- ingredient costs update only after review-confirm
- reset is per dataset
- import should target a pilot workspace, not seeded demo datasets
- memory storage means API restart resets runtime changes

## Local Pilot Run

1. `npm install`
2. Set `APP_MODE=pilot` on the API server if you want pilot copy enabled
3. `npm run dev`
4. Open `/onboarding`
5. Open `/pilot-tools`
6. Import a pilot dataset JSON or keep seeded data
7. Run invoice cost intake
8. Confirm reviewed lines
9. Review alerts and dashboard actions

## Reset and Export

- `GET /api/export?dataset=...`
- `POST /api/import?dataset=pilot-workspace`
- `POST /api/datasets/:id/reset`

These are pilot-safety tools, not end-customer admin features.

## What Not To Claim

Do not claim:

- production OCR accuracy
- durable storage
- multi-location support
- accounting compatibility
- inventory accuracy
- enterprise readiness
