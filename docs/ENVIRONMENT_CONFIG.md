# Environment Configuration

## Purpose

Use these environment variables to run the app safely in demo or controlled pilot mode.

This is not a production SaaS configuration guide. It exists to keep local demo, local pilot, OCR adapter, and storage behavior explicit.

## Core Variables

- `APP_MODE=demo|pilot`
- `STORE_DRIVER=memory|file`
- `DATA_DIR=.data`
- `OCR_PROVIDER=fixture|external_env|disabled`
- `OCR_PROVIDER_API_KEY=`
- `OCR_PROVIDER_MODEL=`
- `OCR_PROVIDER_ENDPOINT=`
- `OCR_PROVIDER_TIMEOUT_MS=30000`
- `OCR_PROVIDER_MAX_RETRIES=1`
- `DATABASE_URL=` future only, not used in the current pilot package

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

## Local Pilot Example

```bash
APP_MODE=pilot
STORE_DRIVER=file
DATA_DIR=.data
OCR_PROVIDER=fixture
```

## External OCR Example

```bash
APP_MODE=pilot
STORE_DRIVER=file
DATA_DIR=.data
OCR_PROVIDER=external_env
OCR_PROVIDER_API_KEY=your_api_key_here
OCR_PROVIDER_MODEL=your_model_here
OCR_PROVIDER_ENDPOINT=
OCR_PROVIDER_TIMEOUT_MS=30000
OCR_PROVIDER_MAX_RETRIES=1
```

Important:

- external OCR is optional
- provider output still creates drafts only
- ingredient costs still update only after `review-confirm`
- normal validation still passes without provider credentials

## Hosted Pilot Caution

- `STORE_DRIVER=file` only works safely when the host gives you a persistent writable disk
- many static hosts and serverless platforms use ephemeral filesystems
- if a hosted pilot cannot guarantee persistent disk, keep `STORE_DRIVER=memory` for demos or move to a future database-backed store

## Validation

Run:

```bash
npm run validate:env
```

This checks:

- valid `APP_MODE`
- valid `STORE_DRIVER`
- writable `DATA_DIR` when `STORE_DRIVER=file`
- valid `OCR_PROVIDER`
- required OCR env only when `OCR_PROVIDER=external_env`

Warnings are allowed for non-fatal pilot setups such as `APP_MODE=pilot` with `STORE_DRIVER=memory`.

## What This Does Not Mean

This configuration layer does not mean:

- production SaaS deployment is complete
- database persistence exists
- live OCR accuracy is proven
- hosted pilot durability is guaranteed
