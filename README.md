# Menu Profit Optimizer

Menu Profit Optimizer is a restaurant profit decision engine for owners and managers. Sprint 4 closes the premium demo-readiness gate: the app now supports scenario switching, deterministic synthetic validation, stronger decision-first UI, and a clearer demo narrative without introducing invoice-scan functionality yet.

## Sprint 4 Scope

MAX SPRINT 4 delivers:

- RM6 closeout with a stronger shared visual system
- scenario-aware dashboard, dishes page, and dish detail flow
- hardened scenario switching with URL query param support
- richer scenario metadata for demo storytelling
- improved cost-driver presentation and simulator hierarchy
- deterministic `npm run validate:synthetic`
- lightweight `npm run validate:demo`
- demo-readiness and RM7 preflight documentation

Current non-goals remain explicit:

- no invoice scan
- no OCR or vision adapter
- no supplier invoice parsing
- no real invoice upload
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
npm audit
```

## Local URLs

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`
- Health check: `http://localhost:3001/health`
- Dashboard overview: `http://localhost:3001/api/analytics/overview`
- Ranked actions: `http://localhost:3001/api/analytics/actions`
- Demo datasets: `http://localhost:3001/api/demo/datasets`

## Workspace Layout

```text
apps/
  api/    Express + TypeScript backend
  web/    React + Vite + TypeScript frontend
packages/
  core/   shared domain types, calculations, seed data, decision engine
docs/     product, demo, and roadmap documentation
reports/  deterministic synthetic validation outputs
scripts/  validation runners
```

## API Endpoints

- `GET /health`
- `GET /api/ingredients`
- `GET /api/recipes`
- `GET /api/dishes`
- `GET /api/demo/datasets`
- `GET /api/analytics/dishes`
- `GET /api/analytics/overview`
- `GET /api/analytics/actions`
- `GET /api/analytics/dish/:id`
- `POST /api/simulate/price`

All analytics and simulation endpoints support demo scenario selection through `?dataset=...`.

## Demo Flow

Recommended flow:

1. Open the dashboard.
2. Show the scenario selector.
3. Start with `Low Margin Kitchen`.
4. Open the top action.
5. Show the dish cost driver.
6. Run the price simulator.
7. Return to the dashboard and switch to `High Margin Bistro`.

See [docs/DEMO_READINESS.md](docs/DEMO_READINESS.md) for the concise demo walkthrough.

## Product Notes

- Shared decision logic lives in `packages/core`.
- The simulator UI only reads backend simulation results.
- Overview responses include weighted margin, total revenue, total cost, contributors, risks, and top actions.
- Scenario selection is demo-mode only and flows through `?dataset=...`.
- Synthetic validation reports live in `reports/`.
- RM7 readiness is documented in [docs/RM7_PREFLIGHT.md](docs/RM7_PREFLIGHT.md).
- No invoice/OCR/POS/accounting/inventory/auth/persistent database scope has been added.
