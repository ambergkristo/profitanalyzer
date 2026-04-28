# Menu Profit Optimizer

Menu Profit Optimizer is a restaurant profit decision engine for owners and managers. Sprint 6 closes RM7 with manual structured invoice entry, stronger review-confirm ergonomics, visible ingredient cost history, supplier alerts, and invoice-driven actions in the ranked decision stack without starting OCR.

## Sprint 6 Scope

MAX SPRINT 6 delivers:

- RM7 closeout with structured sample invoice parsing and manual structured invoice entry
- robust review-confirm workflow in the frontend
- ingredient cost history through API and dish detail UI
- supplier price-change alerts and dedicated `/alerts` view
- invoice-driven actions merged into the ranked dashboard action stack
- scenario-aware cost intake using the same `?dataset=...` flow as analytics
- deterministic `npm run validate:synthetic`
- lightweight `npm run validate:demo`
- upgraded `npm run validate:invoice` with deterministic invoice validation reports
- updated RM7 implementation and validation documentation

Current non-goals remain explicit:

- no real OCR or vision adapter yet
- no photo upload yet
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
- `GET /api/alerts/price-changes`
- `GET /api/analytics/dishes`
- `GET /api/analytics/overview`
- `GET /api/analytics/actions`
- `GET /api/analytics/dish/:id`
- `POST /api/invoices/parse-mock`
- `POST /api/invoices/manual-draft`
- `POST /api/invoices/:id/review-confirm`
- `POST /api/simulate/price`

All analytics, simulation, cost-intake, and alert endpoints support demo scenario selection through `?dataset=...`.

## Demo Flow

Recommended flow:

1. Open the dashboard.
2. Show the scenario selector.
3. Start with `Low Margin Kitchen`.
4. Open `Cost Intake`.
5. Parse `Prime Butchery Co` or switch to manual structured entry.
6. Review the flagged lines and confirm the cost update.
7. Open `Supplier Alerts` and show the new supplier-cost pressure.
8. Return to the dashboard and show the invoice-driven priority action.
9. Open the affected dish, inspect cost history, and run the price simulator.

See [docs/DEMO_READINESS.md](docs/DEMO_READINESS.md) for the concise demo walkthrough.

## Product Notes

- Shared decision and invoice logic lives in `packages/core`.
- The simulator UI only reads backend simulation results.
- Invoice lines never update current ingredient costs before user confirmation.
- Manual structured invoice entry still routes through the same review-confirm boundary as sample invoices.
- Confirmed supplier-cost alerts now feed back into ranked dashboard actions.
- Scenario selection is demo-mode only and flows through `?dataset=...`.
- Synthetic validation reports live in `reports/`.
- Invoice validation reports live in `reports/invoice-validation-report.json` and `reports/invoice-validation-report.md`.
- RM7 implementation details live in [docs/INVOICE_COST_INTAKE_IMPLEMENTATION.md](docs/INVOICE_COST_INTAKE_IMPLEMENTATION.md).
- RM7 readiness and remaining gaps live in [docs/RM7_PREFLIGHT.md](docs/RM7_PREFLIGHT.md).
- No real OCR/photo upload/POS/accounting/inventory/auth/persistent database scope has been added.
