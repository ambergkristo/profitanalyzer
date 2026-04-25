# Menu Profit Optimizer

Menu Profit Optimizer is a restaurant profit decision engine for owners and managers. Sprint 3 turns the working feature set into a stronger demo product: scenario switching, synthetic validation, and a more polished decision-first cockpit sit on top of the deterministic pricing and margin engine.

## Sprint 3 Scope

MAX SPRINT 3 implements:

- canonical synthetic restaurant scenarios
- dataset-aware API responses without introducing a database
- scenario selector in the frontend using URL query params
- repeatable `npm run validate:synthetic` reports
- premium dashboard, dishes, detail, and simulator polish
- target-margin simulator quick actions and stronger cost-driver detail
- expanded RM5 and RM6 test coverage

Current non-goals remain:

- no invoice scan
- no OCR or vision adapter
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
docs/     product and roadmap documentation
tasks/    local sprint tracking notes
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

## Product Notes

- Shared decision logic lives in `packages/core`.
- The simulator UI only reads backend simulation results.
- Overview responses include weighted margin, total revenue, total cost, contributors, risks, and top actions.
- Scenario selection is demo-mode only and flows through `?dataset=...`.
- Synthetic validation reports live in `reports/`.
- No invoice/OCR/POS/accounting/inventory/auth/persistent database scope has been added.
