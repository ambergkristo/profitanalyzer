# Environment Configuration

## Purpose

These variables control demo, pilot, and production-oriented local setup behavior.

This is not a claim that production SaaS readiness already exists.

## Core Variables

- `NODE_ENV=development|test|production`
- `APP_MODE=demo|pilot|production`
- `AUTH_MODE=dev|disabled|production_future`
- `SESSION_SECRET=`
- `APP_BASE_URL=http://localhost:5173`
- `API_BASE_URL=http://localhost:3001`
- `CORS_ORIGIN=http://localhost:5173`
- `LOG_LEVEL=debug|info|warn|error`
- `STORE_DRIVER=memory|file|database`
- `DATA_DIR=.data`
- `DATABASE_URL=`
- `OCR_PROVIDER=fixture|external_env|disabled`
- `OCR_PROVIDER_API_KEY=`
- `OCR_PROVIDER_MODEL=`
- `OCR_PROVIDER_ENDPOINT=`
- `OCR_PROVIDER_TIMEOUT_MS=30000`
- `OCR_PROVIDER_MAX_RETRIES=1`

## Defaults

- `NODE_ENV=development`
- `APP_MODE=demo`
- `AUTH_MODE=dev`
- `STORE_DRIVER=memory`
- `DATA_DIR=.data`
- `OCR_PROVIDER=fixture`
- `LOG_LEVEL=debug`

## Local Demo Example

```bash
NODE_ENV=development
APP_MODE=demo
AUTH_MODE=disabled
STORE_DRIVER=memory
DATA_DIR=.data
OCR_PROVIDER=fixture
```

## Local File-Persisted Example

```bash
NODE_ENV=development
APP_MODE=pilot
AUTH_MODE=dev
SESSION_SECRET=local-dev-session-secret
STORE_DRIVER=file
DATA_DIR=.data
APP_BASE_URL=http://localhost:5173
API_BASE_URL=http://localhost:3001
CORS_ORIGIN=http://localhost:5173
OCR_PROVIDER=fixture
```

## Local Database Example

```bash
NODE_ENV=development
APP_MODE=pilot
AUTH_MODE=dev
SESSION_SECRET=local-dev-session-secret
STORE_DRIVER=database
DATABASE_URL=postgresql://user:password@localhost:5432/profit_analyzer
APP_BASE_URL=http://localhost:5173
API_BASE_URL=http://localhost:3001
CORS_ORIGIN=http://localhost:5173
OCR_PROVIDER=fixture
```

## Production-Like Example

```bash
NODE_ENV=production
APP_MODE=production
AUTH_MODE=production_future
SESSION_SECRET=replace-with-real-secret
STORE_DRIVER=database
DATABASE_URL=postgresql://user:password@db:5432/profit_analyzer
APP_BASE_URL=https://app.example.com
API_BASE_URL=https://api.example.com
CORS_ORIGIN=https://app.example.com
LOG_LEVEL=info
OCR_PROVIDER=disabled
```

## OCR Example

```bash
APP_MODE=pilot
STORE_DRIVER=file
OCR_PROVIDER=external_env
OCR_PROVIDER_API_KEY=your_api_key_here
OCR_PROVIDER_MODEL=your_model_here
OCR_PROVIDER_ENDPOINT=
OCR_PROVIDER_TIMEOUT_MS=30000
OCR_PROVIDER_MAX_RETRIES=1
```

Important:

- external OCR remains optional
- OCR still creates drafts only
- ingredient costs still update only after `review-confirm`
- normal validation still passes without OCR provider credentials

## Validation

Run:

```bash
npm run validate:env
```

This checks:

- valid `NODE_ENV`
- valid `APP_MODE`
- valid `AUTH_MODE`
- valid `STORE_DRIVER`
- valid `LOG_LEVEL`
- `DATABASE_URL` when `STORE_DRIVER=database`
- `SESSION_SECRET` in non-demo authenticated modes
- `APP_BASE_URL`, `API_BASE_URL`, and `CORS_ORIGIN` in production mode
- OCR env completeness only when `OCR_PROVIDER=external_env`
- placeholder-like secrets in production-like mode
- unsafe production blockers such as `AUTH_MODE=dev` or `STORE_DRIVER=memory`

Warnings are acceptable for non-fatal setups, such as `APP_MODE=pilot` with `STORE_DRIVER=memory`.

## What This Does Not Mean

This configuration layer does not mean:

- production SaaS readiness is complete
- DB runtime was validated in the current environment
- production-complete auth or billing exists
- live OCR accuracy is proven
