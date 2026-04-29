# Menu Profit Optimizer

Menu Profit Optimizer is a restaurant decision product for margin repair, supplier-cost review, and price testing. Sprint 12 closes the controlled RM9 pilot package by adding recipe editing, safer import validation, environment validation, and DB-adapter readiness without weakening the existing invoice and OCR review-confirm model.

## Sprint 12 Scope

MAX SPRINT 12 delivers:

- app mode separation with `APP_MODE=demo|pilot`
- `STORE_DRIVER=memory|file`
- `DATA_DIR=.data`
- file-backed JSON store behind the existing API store boundary
- minimal recipe editor in `/pilot-tools`
- dish-to-recipe setup in pilot tools
- import dry-run validation before destructive import
- deterministic `npm run validate:env`
- DB adapter readiness through a documented plan and placeholder seam
- richer `GET /api/app/config`
- richer `GET /api/health/deep`
- dataset export, controlled import, and per-dataset reset
- `/onboarding` route for first-run guidance
- `/pilot-tools` route for export/reset/import safety tooling plus ingredient, recipe, and dish setup
- visible mode badge plus memory/file persistence messaging in the UI
- deterministic `npm run validate:pilot`
- updated pilot package, deployment, environment, DB-plan, and data-setup documentation

Current non-goals remain explicit:

- no blind OCR import
- no live OCR accuracy claims
- no accounting
- no inventory management
- no POS integration
- no supplier API sync
- no auth
- no billing
- no multi-tenant SaaS controls
- no implemented database store yet

## App Modes

`demo` mode is the default.

- synthetic scenarios remain available
- fixture OCR remains the default OCR path
- reset controls are useful for demos
- scenario selector stays visible
- memory store remains the default unless `STORE_DRIVER=file`

`pilot` mode is controlled, not enterprise.

- UI copy switches to pilot workspace language
- `pilot-workspace` becomes the preferred working dataset
- the same invoice/OCR review-confirm boundary stays active
- pilot tooling is available for reset/export/import safety
- file store can persist local pilot edits when enabled

Important:

- OCR and invoice parsing still create drafts only
- ingredient costs still update only after `review-confirm`
- memory storage means API restarts reset runtime changes
- file storage writes local JSON dataset state and survives API restart

## Local Setup

```bash
npm install
```

Optional server env:

```bash
APP_MODE=demo
STORE_DRIVER=memory
DATA_DIR=.data
OCR_PROVIDER=fixture
OCR_PROVIDER_API_KEY=
OCR_PROVIDER_MODEL=
OCR_PROVIDER_ENDPOINT=
OCR_PROVIDER_TIMEOUT_MS=30000
OCR_PROVIDER_MAX_RETRIES=1
```

Copy `.env.example` to `.env` only if you want local overrides. Leave OCR env empty to keep fixture OCR as the safe default.

## Local Run Commands

```bash
npm run dev
npm run typecheck
npm test
npm run build
npm run lint
npm run validate:synthetic
npm run validate:demo
npm run validate:invoice
npm run validate:ocr
npm run validate:ocr:provider
npm run validate:pilot
npm run validate:env
npm audit
```

## Local URLs

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`
- Health: `http://localhost:3001/health`
- Deep health: `http://localhost:3001/api/health/deep`
- App config: `http://localhost:3001/api/app/config`

## Main Routes

- `/`
- `/onboarding`
- `/dishes`
- `/dishes/:dishId`
- `/invoices`
- `/alerts`
- `/pilot-tools`

## API Endpoints

- `GET /health`
- `GET /api/health/deep`
- `GET /api/app/config`
- `GET /api/demo/datasets`
- `GET /api/export`
- `POST /api/import/validate`
- `POST /api/import`
- `POST /api/datasets/:id/reset`
- `GET /api/ingredients`
- `POST /api/ingredients`
- `PATCH /api/ingredients/:id`
- `GET /api/ingredients/:id/cost-history`
- `GET /api/recipes`
- `POST /api/recipes`
- `PATCH /api/recipes/:id`
- `GET /api/dishes`
- `POST /api/dishes`
- `PATCH /api/dishes/:id`
- `GET /api/suppliers`
- `GET /api/invoices/samples`
- `GET /api/invoices/:id`
- `POST /api/invoices/parse-mock`
- `POST /api/invoices/manual-draft`
- `POST /api/invoices/:id/review-confirm`
- `GET /api/ocr/providers`
- `GET /api/ocr/jobs`
- `GET /api/ocr/jobs/:id`
- `POST /api/ocr/invoices/upload`
- `GET /api/alerts/price-changes`
- `GET /api/analytics/dishes`
- `GET /api/analytics/overview`
- `GET /api/analytics/actions`
- `GET /api/analytics/dish/:id`
- `POST /api/simulate/price`

Most analytics, invoices, OCR, alerts, export, and cost-history endpoints support `?dataset=...`.

## Demo Flow

1. Open `/onboarding`.
2. Open the demo dashboard.
3. Switch to `Low Margin Kitchen`.
4. Open `Cost Intake`.
5. Use a sample invoice, manual structured entry, or fixture OCR upload.
6. Confirm reviewed lines.
7. Open `Supplier Alerts`.
8. Return to the dashboard and inspect the invoice-driven action.
9. Open the affected dish and use the simulator.

## Pilot Flow

1. Set `APP_MODE=pilot` on the API server if desired.
2. Optionally set `STORE_DRIVER=file` and `DATA_DIR=.data` for local persistence.
3. Open `/onboarding`.
4. Use `/pilot-tools` to export, import, or reset a workspace safely.
5. Use `Pilot Data Setup` to adjust ingredients, recipes, dish links, pricing, or validate/import a pilot workspace JSON.
6. Open the dashboard and confirm margins update from recipe and dish edits.
7. Run invoice cost intake and review-confirm.
8. Review supplier alerts and dashboard actions.

## Product Notes

- The calculation engine lives in `packages/core`.
- The simulator still uses backend responses only.
- Invoice, manual, sample, and OCR drafts all reuse the same confirmation boundary.
- Fixture OCR remains the default path even when the external provider seam exists.
- `validate:ocr:provider` skips cleanly when provider env is missing.
- RM9 now closes as a controlled pilot package, not a production SaaS platform.
- The database adapter is planned and typed, but not implemented.
- Hosted deployments may still need persistent disk or a future database layer.

## Documentation

- [docs/DEMO_READINESS.md](docs/DEMO_READINESS.md)
- [docs/DEPLOYMENT_READINESS.md](docs/DEPLOYMENT_READINESS.md)
- [docs/ENVIRONMENT_CONFIG.md](docs/ENVIRONMENT_CONFIG.md)
- [docs/INVOICE_COST_INTAKE_IMPLEMENTATION.md](docs/INVOICE_COST_INTAKE_IMPLEMENTATION.md)
- [docs/DB_ADAPTER_PLAN.md](docs/DB_ADAPTER_PLAN.md)
- [docs/OCR_PROVIDER_SETUP.md](docs/OCR_PROVIDER_SETUP.md)
- [docs/OCR_VISION_ADAPTER.md](docs/OCR_VISION_ADAPTER.md)
- [docs/PILOT_DATA_SETUP.md](docs/PILOT_DATA_SETUP.md)
- [docs/PRODUCT_CORE_VALIDATION.md](docs/PRODUCT_CORE_VALIDATION.md)
- [docs/RM7_PREFLIGHT.md](docs/RM7_PREFLIGHT.md)
- [docs/RM9_PILOT_PACKAGE.md](docs/RM9_PILOT_PACKAGE.md)
- [docs/ROADMAP.md](docs/ROADMAP.md)

## Reports

- `reports/synthetic-validation-report.json`
- `reports/synthetic-validation-report.md`
- `reports/invoice-validation-report.json`
- `reports/invoice-validation-report.md`
- `reports/ocr-validation-report.json`
- `reports/ocr-validation-report.md`
- `reports/ocr-provider-benchmark-report.json`
- `reports/ocr-provider-benchmark-report.md`
- `reports/pilot-validation-report.json`
- `reports/pilot-validation-report.md`
