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
```

## Node and Ports

- Node 20+ recommended
- frontend dev port: `5173`
- backend dev port: `3001`

## Required Env

Core:

- `APP_MODE=demo|pilot`

Optional OCR:

- `OCR_PROVIDER`
- `OCR_PROVIDER_API_KEY`
- `OCR_PROVIDER_MODEL`
- `OCR_PROVIDER_ENDPOINT`
- `OCR_PROVIDER_TIMEOUT_MS`
- `OCR_PROVIDER_MAX_RETRIES`

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

Current storage is memory-only.

That means:

- restarting the API resets runtime changes
- pilot resets are deterministic
- export should be used before risky demo or pilot sessions

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

## Known Limitations

- no persistent database
- no auth
- no billing
- no accounting or inventory workflows
- no POS integration
- no supplier API sync
- no production OCR accuracy claim
