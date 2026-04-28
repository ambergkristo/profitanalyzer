# Menu Profit Optimizer

Menu Profit Optimizer is a restaurant profit decision engine for owners and managers. Sprint 9 extends RM8 with the first real external OCR provider pilot behind the existing adapter boundary, while keeping fixture OCR as the default and preserving the same review-confirm safety model.

## Sprint 9 Scope

MAX SPRINT 9 delivers:

- real `external_env` provider adapter behind server-side env config
- fixture OCR still default and deterministic
- provider registry with fixture default and external env seam
- OCR quality gate with quick-review, careful-review, and manual-entry guidance
- in-memory photo/PDF upload endpoint that creates invoice review drafts only
- observable OCR job state with provider, quality, and failure metadata
- `/invoices` Photo/OCR Upload mode with provider status in the frontend
- OCR drafts still reusing the existing RM7 review-confirm boundary
- `GET /api/ocr/providers` provider discovery endpoint
- deterministic `npm run validate:ocr`
- live-skip `npm run validate:ocr:provider`
- OCR benchmark scaffolding in `benchmarks/ocr`
- deterministic `npm run validate:synthetic`
- lightweight `npm run validate:demo`
- `npm run validate:invoice` still passing
- updated OCR adapter, provider setup, invoice, demo, and validation documentation

Current non-goals remain explicit:

- no blind OCR import
- no direct OCR-driven cost mutation
- no hardcoded paid OCR provider as the only implementation
- no external OCR credentials or secrets in the repo
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

Copy `.env.example` to `.env` only if you want to enable the external OCR provider pilot. Leaving `.env` absent keeps the system on fixture OCR.

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
npm run validate:ocr:provider
npm audit
```

## OCR Provider Env

Server-only OCR provider configuration lives in `.env`:

```bash
OCR_PROVIDER=fixture
OCR_PROVIDER_API_KEY=
OCR_PROVIDER_MODEL=
OCR_PROVIDER_ENDPOINT=
OCR_PROVIDER_TIMEOUT_MS=30000
OCR_PROVIDER_MAX_RETRIES=1
```

To enable the external provider pilot, set `OCR_PROVIDER=external_env` and provide `OCR_PROVIDER_API_KEY` plus `OCR_PROVIDER_MODEL`. Provider output still creates drafts only. Ingredient costs update only after review-confirm.

## Local URLs

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`
- Health check: `http://localhost:3001/health`
- Dashboard overview: `http://localhost:3001/api/analytics/overview`
- Ranked actions: `http://localhost:3001/api/analytics/actions`
- Demo datasets: `http://localhost:3001/api/demo/datasets`
- Invoice samples: `http://localhost:3001/api/invoices/samples`
- Manual invoice draft: `http://localhost:3001/api/invoices/manual-draft`
- OCR providers: `http://localhost:3001/api/ocr/providers`
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
- `GET /api/ocr/providers`
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
6. Show the provider selector and explain that fixture OCR is the safe default while the external provider stays disabled unless env configuration is present.
7. Show that OCR creates a draft only, inspect the OCR quality gate, then review the parsed lines and confirm the cost update.
8. Open `Supplier Alerts` and show the new supplier-cost pressure.
9. Return to the dashboard and show the invoice-driven priority action.
10. Open the affected dish, inspect cost history, and run the price simulator.
11. Switch back to `Photo/OCR Upload` and use `blurry-invoice-photo.jpg` to demonstrate the safety gate.
12. Use `cropped-invoice-photo.jpg` to show partial parsing with warnings and careful review mode.

See [docs/DEMO_READINESS.md](docs/DEMO_READINESS.md) for the concise demo walkthrough.

## Product Notes

- Shared decision and invoice logic lives in `packages/core`.
- The simulator UI only reads backend simulation results.
- Invoice lines never update current ingredient costs before user confirmation.
- Manual, sample, and OCR-created drafts all route through the same review-confirm boundary.
- OCR provider selection stays backend-controlled. The frontend never reads provider secrets.
- Fixture OCR remains the default adapter unless an external provider is configured through environment variables.
- The external provider pilot is optional and does not run during normal test/build/lint when env is missing.
- OCR quality reports and job history are visible in the upload flow before confirmation.
- Confirmed supplier-cost alerts now feed back into ranked dashboard actions.
- Scenario selection is demo-mode only and flows through `?dataset=...`.
- Synthetic validation reports live in `reports/`.
- Invoice validation reports live in `reports/invoice-validation-report.json` and `reports/invoice-validation-report.md`.
- OCR validation reports live in `reports/ocr-validation-report.json` and `reports/ocr-validation-report.md`.
- OCR provider benchmark reports live in `reports/ocr-provider-benchmark-report.json` and `reports/ocr-provider-benchmark-report.md`.
- RM7 implementation details live in [docs/INVOICE_COST_INTAKE_IMPLEMENTATION.md](docs/INVOICE_COST_INTAKE_IMPLEMENTATION.md).
- OCR adapter details live in [docs/OCR_VISION_ADAPTER.md](docs/OCR_VISION_ADAPTER.md).
- OCR provider setup details live in [docs/OCR_PROVIDER_SETUP.md](docs/OCR_PROVIDER_SETUP.md).
- RM7 readiness and remaining gaps live in [docs/RM7_PREFLIGHT.md](docs/RM7_PREFLIGHT.md).
- OCR upload is review-first. The fixture provider stays default, and the external provider pilot remains env-gated.
- No accounting/inventory/POS/auth/persistent database scope has been added.
