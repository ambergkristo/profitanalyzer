# OCR Vision Adapter

## Goal

Close RM8 at the provider-pilot level without breaking the RM7 trust boundary.

The product flow stays:

1. Upload image or PDF
2. OCR provider parses the file into a draft
3. Quality gate evaluates the result
4. User reviews the draft
5. User confirms the invoice
6. System writes cost history, alerts, and affected-dish impact

OCR never updates ingredient cost directly.

## Provider Registry

API provider discovery lives in `apps/api/src/ocr/providerRegistry.ts`.

Supported provider ids:

- `fixture`
- `external_env`
- `disabled`

Each provider exposes:

- `id`
- `displayName`
- `isConfigured`
- `isDefault`
- `modelConfigured`
- `supportsMimeTypes`
- `maxFileSizeBytes`
- `mode`

Current behavior:

- `fixture` is always configured and is the default in local development.
- `external_env` is only configured when server-side env variables are present.
- `disabled` exists as a safe non-runnable provider state.

Provider metadata is exposed through:

- `GET /api/ocr/providers`

## Fixture Adapter

The fixture adapter is deterministic and filename-driven:

- filenames containing `clean` return a mostly ready draft
- filenames containing `blurry` return multiple unresolved lines
- filenames containing `cropped` or `rotated` return partial header data with warnings
- any other filename returns a generic needs-review draft

This is explicitly development adapter mode. It is not presented as real OCR accuracy.

## External Provider Pilot

The external seam is now implemented behind env configuration in:

- `apps/api/src/ocr/externalProvider.ts`

It is server-side only and currently targets an OpenAI-compatible Responses API shape through `fetch`.

Required env names:

- `OCR_PROVIDER=external_env`
- `OCR_PROVIDER_API_KEY`
- `OCR_PROVIDER_MODEL`

Optional env names:

- `OCR_PROVIDER_ENDPOINT`
- `OCR_PROVIDER_TIMEOUT_MS`
- `OCR_PROVIDER_MAX_RETRIES`

Current behavior:

- startup does not fail when env is missing
- requests for an unconfigured external provider return a safe `503`
- no provider secrets are exposed in API responses
- no provider secrets are read from the frontend
- no real provider credentials are committed in the repository

The external adapter is a controlled pilot, not a claim of production OCR readiness.

## Provider Response Schema

The external provider is asked to return strict JSON in this shape:

```json
{
  "supplierName": "string|null",
  "invoiceNumber": "string|null",
  "invoiceDate": "YYYY-MM-DD|null",
  "totalAmountCents": 12345,
  "confidence": "high|medium|low|none",
  "warnings": ["string"],
  "lines": [
    {
      "rawProductName": "string",
      "quantity": 1,
      "unit": "kg|g|l|ml|pcs|pack|null",
      "unitPriceCents": 100,
      "lineTotalCents": 1000,
      "confidence": "high|medium|low|none",
      "warnings": ["string"]
    }
  ]
}
```

The parser does not trust the provider blindly:

- invalid JSON fails safely
- unsupported units become warnings
- negative money values are ignored
- unknown confidence values are downgraded to low
- missing or invalid line arrays degrade into manual-review quality states

## Upload Validation

Upload endpoint:

- `POST /api/ocr/invoices/upload?dataset=...`

Current validation:

- file is required
- dataset is required and validated
- provider id is validated
- allowed mime types are enforced per provider
- max file size is enforced per provider
- original filenames are sanitized before response output
- failed OCR parses create failed jobs instead of crashing the server
- files are processed in memory only

Accepted mime types:

- `image/jpeg`
- `image/png`
- `image/webp`
- `application/pdf`

## OCR Quality Gate

Core quality evaluation lives in `packages/core/src/ocr.ts`.

The quality report includes:

- `overallConfidence`
- `lineCount`
- `unresolvedLineCount`
- `missingSupplier`
- `missingInvoiceDate`
- `missingPricesCount`
- `unknownProductCount`
- `unitWarningCount`
- `warnings`
- `recommendedReviewMode`

Supported review modes:

- `quick_review`
- `careful_review`
- `manual_entry_recommended`

Current expectations:

- clean fixture => `quick_review`
- blurry fixture => `careful_review` or `manual_entry_recommended`
- cropped fixture => `careful_review`
- no usable lines => `manual_entry_recommended`

The quality gate informs the user. It does not bypass review-confirm or mutate cost by itself.

## OCR Job Lifecycle

Job states:

- `uploaded`
- `processing`
- `parsed`
- `needs_review`
- `failed`

Endpoints:

- `GET /api/ocr/jobs`
- `GET /api/ocr/jobs/:id`

Jobs expose:

- provider
- provider display name
- status
- original file name
- created and parsed timestamps
- failure reason
- linked invoice draft id
- quality report summary

The `/invoices` OCR tab surfaces recent jobs, status badges, quality mode, and failure reasons.

## Review-Confirm Safety Model

Key rule:

OCR creates drafts only.

The following are still required before any ingredient cost changes:

- supplier review
- line review
- ingredient match confirmation
- explicit invoice confirmation through the existing RM7 endpoint

Safety rules:

- low-confidence or unresolved OCR lines must be corrected or ignored
- missing ingredient matches block confirmation
- missing prices block confirmation unless safely derived
- ignored lines never update costs
- repeated confirmation is blocked
- pre-confirm analytics and cost history remain unchanged

## Live-Skip Validation

Deterministic fixture validation:

- `npm run validate:ocr`

Provider pilot validation:

- `npm run validate:ocr:provider`

Behavior:

- if env is missing, provider validation exits `0` and reports `SKIPPED_EXTERNAL_PROVIDER`
- if env is present, the script runs one controlled live extraction against a local private synthetic sample
- benchmark output is written to:
  - `reports/ocr-provider-benchmark-report.json`
  - `reports/ocr-provider-benchmark-report.md`

## Benchmark Fixture Process

Committed benchmark expectations live in:

- `benchmarks/ocr/expected/`

Private local sample files belong in:

- `benchmarks/ocr/private-samples/`

Do not commit real supplier invoices or sensitive commercial documents.

## What Real Provider Integration Still Does Not Prove

- real invoice OCR accuracy at scale
- broad supplier invoice-format coverage
- provider cost or latency under production load
- production file retention and storage strategy
- camera UX
