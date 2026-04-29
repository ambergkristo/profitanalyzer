# Deployment Readiness

## Current Deployment Posture

The app is deployable for controlled demo and pilot evaluation, but it is not yet a production SaaS platform.

## Runtime Split

Suggested split:

- frontend: static hosting
- backend: Node service

## Local Commands

```bash
npm install
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
```

## Node and Ports

- Node 20+ recommended
- frontend dev port: `5173`
- backend dev port: `3001`

## Required Env

Core:

- `APP_MODE=demo|pilot`
- `STORE_DRIVER=memory|file`
- `DATA_DIR=.data`

Optional OCR:

- `OCR_PROVIDER`
- `OCR_PROVIDER_API_KEY`
- `OCR_PROVIDER_MODEL`
- `OCR_PROVIDER_ENDPOINT`
- `OCR_PROVIDER_TIMEOUT_MS`
- `OCR_PROVIDER_MAX_RETRIES`

Future only:

- `DATABASE_URL`

## Health Endpoints

- `GET /health`
- `GET /api/health/deep`

## Mode Notes

`demo` mode:

- synthetic scenario selector is expected
- fixture OCR remains the clean default

`pilot` mode:

- pilot workspace copy is shown
- the same review-confirm safety boundary remains active

## Storage Warning

Current storage can run in two local modes:

- `memory`: default, resets on API restart
- `file`: local JSON persistence under `DATA_DIR`

That means:

- restarting the API resets runtime changes in memory mode
- file mode survives API restarts locally, but still depends on a writable filesystem
- pilot resets remain deterministic in both modes
- export should still be used before risky demo or pilot sessions

Hosted deployment caution:

- many hosted filesystems are ephemeral
- for a real hosted pilot, use a persistent disk or move to a database later

## Pre-Deploy Validation

Run before any demo or pilot deployment:

- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run lint`
- `npm run validate:synthetic`
- `npm run validate:invoice`
- `npm run validate:ocr`
- `npm run validate:pilot`
- `npm run validate:env`

If using file mode locally, also confirm:

- `DATA_DIR` exists or can be created
- the backend process can read and write the directory
- deep health returns `storage.driver = file` and `ok = true`

Hosted pilot caution:

- if the host filesystem is ephemeral, `STORE_DRIVER=file` is not enough
- use a persistent disk or keep the deployment in controlled demo mode until a database-backed store exists
- the database path is still future work and is documented in `docs/DB_ADAPTER_PLAN.md`

## Known Limitations

- no persistent database
- no auth
- no billing
- no accounting or inventory workflows
- no POS integration
- no supplier API sync
- no production OCR accuracy claim
- no production database-backed persistence yet
