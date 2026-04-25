# Menu Profit Optimizer

Menu Profit Optimizer is a restaurant profit decision engine for owners and managers. Sprint 2 turns the Sprint 1 foundation into a stronger decision product: the dashboard now prioritizes what to fix first, dish detail explains cost drivers, and the frontend runs price simulations through the backend API instead of duplicating formulas.

## Sprint 2 Scope

MAX SPRINT 2 implements:

- richer shared dish metrics, reason codes, and explainable action output
- dashboard KPIs for profit, weighted margin, revenue, and dishes at risk
- ranked action cards, top profit contributors, and riskiest dish sections
- dish detail explanation, ingredient cost percentages, and cost-driver panels
- frontend price simulator backed by `POST /api/simulate/price`
- synthetic restaurant datasets for high-margin, low-margin, and mixed validation
- expanded tests across core, API, and frontend

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
npm audit
```

## Local URLs

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`
- Health check: `http://localhost:3001/health`
- Dashboard overview: `http://localhost:3001/api/analytics/overview`
- Ranked actions: `http://localhost:3001/api/analytics/actions`

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
- `GET /api/analytics/dishes`
- `GET /api/analytics/overview`
- `GET /api/analytics/actions`
- `GET /api/analytics/dish/:id`
- `POST /api/simulate/price`

## Product Notes

- Shared decision logic lives in `packages/core`.
- The simulator UI only reads backend simulation results.
- Overview responses now include weighted margin, total revenue, total cost, contributors, risks, and top actions.
- Synthetic datasets exist to seed RM5 validation without adding invoice, OCR, or database scope.
