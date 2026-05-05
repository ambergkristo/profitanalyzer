# Invoice Pipeline Production Foundation

## Goal

Phase 16 makes invoice/OCR intake production-shaped without claiming production OCR accuracy.

The non-negotiable boundary remains:

- upload or OCR creates a review draft only
- ingredient costs update only after review-confirm
- cost history and alerts are created only after confirmation
- no blind OCR import

## Upload Storage Strategy

Upload storage is provider-neutral.

Drivers:

- `memory`: default for tests, demo, and deterministic validation
- `local_file`: writes files under `UPLOAD_DATA_DIR` for local production-like use
- `external_future`: documented future direction for hosted object storage

Env:

- `UPLOAD_STORAGE_DRIVER=memory|local_file`
- `UPLOAD_DATA_DIR=.uploads`
- `UPLOAD_MAX_FILE_SIZE_BYTES=10485760`

Rules:

- filenames are sanitized
- allowed mime types are enforced
- max file size is enforced
- local file paths are not exposed to the frontend
- raw uploaded files are not exported by default
- `.uploads/` and `uploads/` are gitignored

## OCR Job Lifecycle

Supported statuses:

- `uploaded`
- `queued`
- `processing`
- `parsed`
- `needs_review`
- `failed`
- `cancelled`

OCR jobs track:

- upload metadata id
- provider attempt count
- last attempt
- failure code and safe failure reason
- quality report
- linked invoice draft id

Endpoints:

- `GET /api/ocr/jobs`
- `GET /api/ocr/jobs/:id`
- `POST /api/ocr/jobs/:id/retry`
- `POST /api/ocr/jobs/:id/cancel`

Retry is allowed only for failed jobs. Retry still creates a draft only and never mutates costs.

## Confidence Policy

`packages/core/src/ocrPolicy.ts` defines review policy:

- low/no confidence lines require review unless ignored
- unknown products require ingredient selection or ignore
- missing prices require review unless safely derivable
- unsupported units require review
- high unresolved rate recommends manual entry
- missing supplier/date creates warnings, not mutations

The policy adds:

- unresolved line rate
- review burden score
- policy warnings

## Auditability

The invoice/OCR pipeline emits audit hooks for:

- `ocr_upload_created`
- `invoice_draft_created`
- `ocr_parse_failed`
- `ocr_retry_requested`
- `ocr_job_cancelled`
- `invoice_line_reviewed`
- `invoice_confirmed`
- `ingredient_cost_updated`
- `price_alert_created`

Audit metadata must not contain raw OCR payloads, secrets, or private uploaded file contents.

## Mobile Upload

The web upload uses:

- `accept="image/*,application/pdf"`
- browser camera capture hint where supported
- visible selected file type/size
- draft-only safety copy
- quality policy panel after parse

No native app or camera SDK is required yet.

## Validation

Run:

```bash
npm run validate:invoice-pipeline
npm run benchmark:ocr
```

`validate:invoice-pipeline` proves:

- upload metadata is created
- memory and local file storage work
- private local paths are not exposed
- failed OCR jobs can retry and cancel safely
- OCR drafts do not mutate analytics pre-confirm
- review-confirm creates cost history and alerts

`benchmark:ocr` proves deterministic fixture benchmark behavior and live-provider skip behavior. It does not prove live OCR accuracy unless a provider and private samples are configured.

## Limitations

- hosted object storage is not implemented
- live OCR accuracy is not claimed
- production database runtime remains environment-dependent without `DATABASE_URL`
- final production identity, billing, legal/privacy, and monitoring gates remain open
