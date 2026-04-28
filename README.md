# Menu Profit Optimizer

Menu Profit Optimizer is a restaurant profit decision engine for owners and managers. Sprint 5 adds the first RM7 workflow slice: structured mock invoice parsing, review-confirm cost updates, ingredient cost history, supplier price alerts, and affected-dish margin impact without starting OCR.

## Sprint 5 Scope

MAX SPRINT 5 delivers:

- RM7 first slice with structured sample invoice parsing
- invoice review-confirm workflow in the frontend
- ingredient cost history and supplier product match creation
- supplier price-change alerts with affected dish impact
- scenario-aware cost intake using the same `?dataset=...` flow as analytics
- deterministic `npm run validate:synthetic`
- lightweight `npm run validate:demo`
- focused `npm run validate:invoice`
- updated RM7 implementation and demo documentation

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
- `POST /api/invoices/:id/review-confirm`
- `POST /api/simulate/price`

All analytics, simulation, cost-intake, and alert endpoints support demo scenario selection through `?dataset=...`.

## Demo Flow

Recommended flow:

1. Open the dashboard.
2. Show the scenario selector.
3. Start with `Low Margin Kitchen`.
4. Open `Cost Intake`.
5. Parse `Prime Butchery Co`.
6. Review the flagged line and confirm the cost update.
7. Show the generated supplier price alert and affected dish.
8. Open the affected dish and run the price simulator.
9. Return to the dashboard and show the new alert state.

See [docs/DEMO_READINESS.md](docs/DEMO_READINESS.md) for the concise demo walkthrough.

## Product Notes

- Shared decision and invoice logic lives in `packages/core`.
- The simulator UI only reads backend simulation results.
- Invoice lines never update current ingredient costs before user confirmation.
- Scenario selection is demo-mode only and flows through `?dataset=...`.
- Synthetic validation reports live in `reports/`.
- RM7 implementation details live in [docs/INVOICE_COST_INTAKE_IMPLEMENTATION.md](docs/INVOICE_COST_INTAKE_IMPLEMENTATION.md).
- RM7 readiness and remaining gaps live in [docs/RM7_PREFLIGHT.md](docs/RM7_PREFLIGHT.md).
- No real OCR/photo upload/POS/accounting/inventory/auth/persistent database scope has been added.
