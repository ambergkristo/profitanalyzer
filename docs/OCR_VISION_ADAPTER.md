# OCR Vision Adapter

## Goal

Close RM8 without breaking the RM7 safety boundary.

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
- `supportsMimeTypes`
- `maxFileSizeBytes`
- `mode`

Current behavior:

- `fixture` is always configured and is the default in local development.
- `external_env` is only configured when the required environment variables are present.
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

## External Provider Seam

The external seam exists, but it is safely disabled unless configured by environment variables.

Supported environment names:

- `OCR_PROVIDER`
- `OCR_PROVIDER_API_KEY`
- `OCR_PROVIDER_ENDPOINT`
- `OCR_PROVIDER_MODEL`

Current behavior:

- startup does not fail when these are missing
- requests for an unconfigured external provider return a safe error
- no secrets are exposed in API responses
- no provider secrets are read from the frontend
- no real provider credentials are committed in the repository

The external adapter is production-shaped but intentionally not wired to a paid provider yet.

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

Accepted fixture mime types:

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

## How To Add A Real Provider Later

When a live provider is added later, it should plug into the registry rather than bypassing it.

Implementation path:

1. Add a provider adapter that returns `OcrParsedInvoiceResult`
2. Normalize provider output into the existing OCR quality and draft helpers
3. Register provider config in the API registry
4. Keep upload validation and job state unchanged
5. Reuse the same invoice draft review-confirm path
6. Extend `validate:ocr` with deterministic provider-contract tests where possible

## Current Limitations

- fixture OCR is still the only active provider
- the external provider path is an architectural seam, not a validated live integration
- no camera capture
- no mobile-native photo workflow
- no persistent OCR job or file storage
- no production document retention model
- no validation yet for real supplier invoice variety
- no validation yet for live provider cost, latency, or accuracy
