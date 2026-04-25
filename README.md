# Menu Profit Optimizer

Menu Profit Optimizer is a restaurant profit decision engine for owners and managers. This sprint builds the deterministic product foundation: a shared cost and margin engine, seeded demo data, an Express API, and a premium dark React frontend.

## Current Sprint Scope

MAX SPRINT 1 implements:

- core ingredient, recipe, dish, and calculated dish domain models
- deterministic dish cost and margin calculations
- simple transparent decision engine and top actions
- seeded demo restaurant data
- Express API endpoints for analytics and simulation
- React dashboard, dish list, and dish detail views
- unit and API tests

Intentionally not built yet:

- invoice scan or supplier cost intake workflows
- OCR or vision adapters
- POS integrations
- accounting workflows
- inventory management workflows

## Local Setup

```bash
npm install
```

## Commands

```bash
npm run dev
npm run build
npm test
npm run lint
npm run typecheck
```

## Local URLs

- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- Health check: http://localhost:3001/health
- Analytics overview: http://localhost:3001/api/analytics/overview

## Workspace Layout

```text
apps/
  api/    Express + TypeScript backend
  web/    React + Vite + TypeScript frontend
packages/
  core/   shared domain types, calculations, seed data, decision engine
docs/     product and roadmap documentation
```

## API Summary

- `GET /health`
- `GET /api/ingredients`
- `GET /api/recipes`
- `GET /api/dishes`
- `GET /api/analytics/dishes`
- `GET /api/analytics/overview`
- `GET /api/analytics/dish/:id`
- `POST /api/simulate/price`

## Notes

- The shared calculation logic lives in `packages/core`.
- The frontend never hardcodes pricing or margin formulas.
- Seed data includes mixed-margin dishes to drive meaningful dashboard output.
