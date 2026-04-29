# Environment Configuration

## Purpose

These variables control demo, pilot, and production-oriented local setup behavior.

This is not a claim that production SaaS readiness already exists.

## Core Variables

- `APP_MODE=demo|pilot`
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

- `APP_MODE=demo`
- `STORE_DRIVER=memory`
- `DATA_DIR=.data`
- `OCR_PROVIDER=fixture`

## Local Demo Example

```bash
APP_MODE=demo
STORE_DRIVER=memory
DATA_DIR=.data
OCR_PROVIDER=fixture
```

## Local File-Persisted Example

```bash
APP_MODE=pilot
STORE_DRIVER=file
DATA_DIR=.data
OCR_PROVIDER=fixture
```

## Local Database Example

```bash
APP_MODE=pilot
STORE_DRIVER=database
DATABASE_URL=postgresql://user:password@localhost:5432/profit_analyzer
OCR_PROVIDER=fixture
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

- valid `APP_MODE`
- valid `STORE_DRIVER`
- writable `DATA_DIR` when `STORE_DRIVER=file`
- presence of `DATABASE_URL` when `STORE_DRIVER=database`
- valid `OCR_PROVIDER`
- OCR env completeness only when `OCR_PROVIDER=external_env`

Warnings are acceptable for non-fatal setups, such as `APP_MODE=pilot` with `STORE_DRIVER=memory`.

## What This Does Not Mean

This configuration layer does not mean:

- production SaaS readiness is complete
- DB runtime was validated in the current environment
- auth or billing exists
- live OCR accuracy is proven
