# Menu Profit Optimizer

Menu Profit Optimizer is a restaurant profit decision engine for owners and managers. Sprint 7 starts RM8 safely with a provider-neutral OCR adapter boundary, in-memory upload intake, deterministic OCR fixtures, and the same review-confirm workflow RM7 already uses for cost history, alerts, and dish impact.

## Sprint 7 Scope

MAX SPRINT 7 delivers:

- RM8 adapter-first OCR seam in `packages/core`
- fixture OCR adapter with clean, blurry, and cropped invoice outputs
- in-memory photo/PDF upload endpoint that creates invoice review drafts only
- OCR job state with confidence and warning metadata
- `/invoices` Photo/OCR Upload mode in the frontend
- OCR drafts reusing the existing RM7 review-confirm boundary
- deterministic `npm run validate:ocr`
- deterministic `npm run validate:synthetic`
- lightweight `npm run validate:demo`
- `npm run validate:invoice` still passing
- updated OCR adapter, invoice, demo, and validation documentation

Current non-goals remain explicit:

- no blind OCR import
- no hardcoded paid OCR provider as the only implementation
- no external OCR credentials in the repo
- no camera capture yet
- no supplier API sync
- no POS integration
- no accounting workflows
- no inventory management
- no auth
- no persistent database

## Local Setup

```bash
npm install
```

## Local Run Commands

```bash
npm run dev
npm run build
npm test
npm run lint
npm run typecheck
npm run validate:synthetic
npm run validate:demo
npm run validate:invoice
npm run validate:ocr
npm audit
```

## Local URLs

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`
- Health check: `http://localhost:3001/health`
- Dashboard overview: `http://localhost:3001/api/analytics/overview`
- Ranked actions: `http://localhost:3001/api/analytics/actions`
- Demo datasets: `http://localhost:3001/api/demo/datasets`
- Invoice samples: `http://localhost:3001/api/invoices/samples`
- Manual invoice draft: `http://localhost:3001/api/invoices/manual-draft`
- OCR invoice upload: `http://localhost:3001/api/ocr/invoices/upload`
- Supplier price alerts: `http://localhost:3001/api/alerts/price-changes`

## Workspace Layout

```text
apps/
  api/    Express + TypeScript backend
  web/    React + Vite + TypeScript frontend
packages/
  core/   shared domain types, calculations, seed data, decision engine, invoice logic
docs/     product, invoice, demo, and roadmap documentation
reports/  deterministic synthetic validation outputs
scripts/  validation runners
```

## API Endpoints

- `GET /health`
- `GET /api/ingredients`
- `GET /api/ingredients/:id/cost-history`
- `GET /api/recipes`
- `GET /api/dishes`
- `GET /api/suppliers`
- `GET /api/demo/datasets`
- `GET /api/invoices/samples`
- `GET /api/invoices/:id`
- `GET /api/ocr/jobs`
- `GET /api/ocr/jobs/:id`
- `GET /api/alerts/price-changes`
- `GET /api/analytics/dishes`
- `GET /api/analytics/overview`
- `GET /api/analytics/actions`
- `GET /api/analytics/dish/:id`
- `POST /api/invoices/parse-mock`
- `POST /api/invoices/manual-draft`
- `POST /api/invoices/:id/review-confirm`
- `POST /api/ocr/invoices/upload`
- `POST /api/simulate/price`

All analytics, simulation, cost-intake, and alert endpoints support demo scenario selection through `?dataset=...`.

## Demo Flow

Recommended flow:

1. Open the dashboard.
2. Show the scenario selector.
3. Start with `Low Margin Kitchen`.
4. Open `Cost Intake`.
5. Choose `Photo/OCR Upload` and use `clean-invoice-photo.jpg` for the safe adapter path, or switch to manual structured entry.
6. Show that OCR creates a draft only, then review the parsed lines and confirm the cost update.
7. Open `Supplier Alerts` and show the new supplier-cost pressure.
8. Return to the dashboard and show the invoice-driven priority action.
9. Open the affected dish, inspect cost history, and run the price simulator.
10. Switch back to `Photo/OCR Upload` and use `blurry-invoice-photo.jpg` to demonstrate the safety gate.

See [docs/DEMO_READINESS.md](docs/DEMO_READINESS.md) for the concise demo walkthrough.

## Product Notes

- Shared decision and invoice logic lives in `packages/core`.
- The simulator UI only reads backend simulation results.
- Invoice lines never update current ingredient costs before user confirmation.
- Manual, sample, and OCR-created drafts all route through the same review-confirm boundary.
- Confirmed supplier-cost alerts now feed back into ranked dashboard actions.
- Scenario selection is demo-mode only and flows through `?dataset=...`.
- Synthetic validation reports live in `reports/`.
- Invoice validation reports live in `reports/invoice-validation-report.json` and `reports/invoice-validation-report.md`.
- OCR validation reports live in `reports/ocr-validation-report.json` and `reports/ocr-validation-report.md`.
- RM7 implementation details live in [docs/INVOICE_COST_INTAKE_IMPLEMENTATION.md](docs/INVOICE_COST_INTAKE_IMPLEMENTATION.md).
- OCR adapter details live in [docs/OCR_VISION_ADAPTER.md](docs/OCR_VISION_ADAPTER.md).
- RM7 readiness and remaining gaps live in [docs/RM7_PREFLIGHT.md](docs/RM7_PREFLIGHT.md).
- OCR upload is fixture-backed and review-first. No real provider has been hardcoded yet.
- No accounting/inventory/POS/auth/persistent database scope has been added.
