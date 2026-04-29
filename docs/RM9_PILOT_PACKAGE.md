# RM9 Pilot Package

## What Pilot-Ready Means Now

The current pilot package is a controlled first-restaurant build, not a production SaaS platform.

RM9 is complete at the controlled pilot package level after Sprint 12.

Included now:

- one workspace-oriented runtime through dataset selection
- demo mode and pilot mode separation
- `STORE_DRIVER=memory|file`
- `DATA_DIR` for local pilot persistence
- dashboard, dishes, dish detail, simulator
- invoice cost intake
- OCR draft intake behind the review-confirm boundary
- supplier alerts and invoice-driven ranked actions
- export, import, and reset safety
- import dry-run validation before destructive import
- minimal pilot data editing for ingredients, recipes, and dishes
- onboarding and pilot tooling routes
- environment validation through `npm run validate:env`
- DB adapter plan and placeholder seam behind the store boundary

Excluded now:

- auth
- RBAC
- billing
- multi-tenant tenancy
- accounting
- inventory
- POS integration
- supplier API sync
- implemented database persistence
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
- file storage writes local JSON snapshots for controlled pilot persistence

## Local Pilot Run

1. `npm install`
2. Set `APP_MODE=pilot` on the API server if you want pilot copy enabled
3. Set `STORE_DRIVER=file` and `DATA_DIR=.data` if you want local persistence
4. `npm run dev`
5. Open `/onboarding`
6. Open `/pilot-tools`
7. Use `Pilot Data Setup` to adjust ingredients, recipes, and dish links, or validate/import a pilot dataset JSON
8. Open the dashboard to confirm cost and margin changes
9. Run invoice cost intake
10. Confirm reviewed lines
11. Review alerts and dashboard actions

## Reset and Export

- `GET /api/export?dataset=...`
- `POST /api/import?dataset=pilot-workspace`
- `POST /api/datasets/:id/reset`

These are pilot-safety tools, not end-customer admin features.

## Current Sprint 12 Result

Built now:

- file-backed JSON store behind the existing store boundary
- persistent `pilot-workspace` support in pilot mode
- app config and deep health storage reporting
- pilot-tools ingredient, recipe, and dish editing
- safer import flow with dry-run validation
- export metadata with `schemaVersion`
- deterministic file-store reload validation in `npm run validate:pilot`
- deterministic environment validation in `npm run validate:env`
- DB adapter plan and placeholder seam without claiming database support

Still out of scope:

- actual database-backed persistence
- auth or RBAC
- billing
- production OCR accuracy claims

## What Not To Claim

Do not claim:

- production OCR accuracy
- durable hosted storage without persistent disk or future DB work
- multi-location support
- accounting compatibility
- inventory accuracy
- enterprise readiness
