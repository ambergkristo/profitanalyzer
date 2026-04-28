# OCR Provider Setup

## Goal

Enable the optional `external_env` OCR provider pilot without weakening the draft-only review-confirm safety boundary.

## `.env` Setup

Start from:

- `.env.example`

Required for the external provider pilot:

```bash
OCR_PROVIDER=external_env
OCR_PROVIDER_API_KEY=your_api_key_here
OCR_PROVIDER_MODEL=your_model_here
```

Optional:

```bash
OCR_PROVIDER_ENDPOINT=
OCR_PROVIDER_TIMEOUT_MS=30000
OCR_PROVIDER_MAX_RETRIES=1
```

If you leave `.env` absent or keep `OCR_PROVIDER=fixture`, the app stays on deterministic fixture OCR.

## Safety Rule

Provider output creates drafts only.

Ingredient costs update only after:

1. OCR draft creation
2. invoice review
3. line resolution or ignore
4. explicit review-confirm

## Validation Commands

Fixture-safe validation:

```bash
npm run validate:ocr
```

Provider pilot validation:

```bash
npm run validate:ocr:provider
```

Expected behavior:

- if env is missing, the command exits `0` and prints `SKIPPED_EXTERNAL_PROVIDER`
- if env is present, the command looks for a local private synthetic sample and runs one controlled provider extraction

## Private Benchmark Samples

Place local synthetic sample files under:

- `benchmarks/ocr/private-samples/`

Current expected live sample path:

- `benchmarks/ocr/private-samples/clean-invoice-provider-sample.jpg`

Do not commit:

- real supplier invoices
- customer personal data
- confidential price sheets

## Security Cautions

- never commit `.env`
- never expose `OCR_PROVIDER_API_KEY` to the frontend
- never log provider secrets
- never treat provider output as confirmed accounting truth
- never bypass review-confirm
