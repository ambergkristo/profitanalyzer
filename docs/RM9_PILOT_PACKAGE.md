# RM9 Pilot Package

## What Pilot-Ready Means Now

The current pilot package is a controlled first-restaurant build, not a production SaaS platform.

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
- minimal pilot data editing for ingredients and dish pricing
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
- file storage writes local JSON snapshots for controlled pilot persistence

## Local Pilot Run

1. `npm install`
2. Set `APP_MODE=pilot` on the API server if you want pilot copy enabled
3. Set `STORE_DRIVER=file` and `DATA_DIR=.data` if you want local persistence
4. `npm run dev`
5. Open `/onboarding`
6. Open `/pilot-tools`
7. Use `Pilot Data Setup` to adjust ingredients and dish pricing, or import a pilot dataset JSON
8. Run invoice cost intake
9. Confirm reviewed lines
10. Review alerts and dashboard actions

## Reset and Export

- `GET /api/export?dataset=...`
- `POST /api/import?dataset=pilot-workspace`
- `POST /api/datasets/:id/reset`

These are pilot-safety tools, not end-customer admin features.

## Current Sprint 11 Result

Built now:

- file-backed JSON store behind the existing store boundary
- persistent `pilot-workspace` support in pilot mode
- app config and deep health storage reporting
- pilot-tools ingredient and dish editing
- deterministic file-store reload validation in `npm run validate:pilot`

Still out of scope:

- database-backed persistence
- auth or RBAC
- billing
- production OCR accuracy claims

## What Not To Claim

Do not claim:

- production OCR accuracy
- durable storage
- multi-location support
- accounting compatibility
- inventory accuracy
- enterprise readiness
