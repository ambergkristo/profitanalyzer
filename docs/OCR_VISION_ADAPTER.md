# OCR Vision Adapter

## Goal

Start RM8 without breaking the RM7 trust boundary.

The product flow stays:

1. Upload image or PDF
2. OCR adapter returns a draft
3. User reviews the draft
4. User confirms the invoice
5. System writes cost history, alerts, and affected-dish impact

OCR never updates ingredient cost directly.

## Adapter Architecture

Core OCR code lives in `packages/core/src/ocr.ts`.

It defines:

- provider-neutral OCR types
- fixture OCR results
- OCR confidence mapping
- OCR safety validation
- OCR-to-structured-draft normalization
- draft creation through the existing structured invoice parser

The adapter output is intentionally the same `ParsedInvoiceDraft` shape already used by RM7.

## Current Providers

Implemented now:

- `fixture`

Reserved for later:

- `manual_dev`
- `external_future`

No external provider is hardcoded into the workflow.

## Upload Endpoint

Current API endpoint:

- `POST /api/ocr/invoices/upload?dataset=...`

Accepted mime types:

- `image/jpeg`
- `image/png`
- `image/webp`
- `application/pdf`

Files are handled in memory only. There is no persistent file storage and no cloud upload in this sprint.

## OCR Confidence Model

Supported confidence values:

- `high`
- `medium`
- `low`
- `none`

Confidence is surfaced in the review UI and mapped into invoice line review state.

Rules:

- `low` and `none` confidence lines require review or ignore
- missing price requires review unless unit price can be derived from line total and quantity
- unknown products require ingredient selection or ignore
- unit mismatch remains a review issue

## Fixture Adapter

The fixture adapter is deterministic and filename-driven:

- filenames containing `clean` return a mostly ready draft
- filenames containing `blurry` return multiple unresolved lines
- filenames containing `cropped` or `rotated` return partial header data with warnings
- any other filename returns a generic needs-review draft

The UI must describe this clearly as development adapter mode, not live OCR.

## Safety Model

Key rule:

OCR creates drafts only.

The following are still required before any ingredient cost changes:

- supplier review
- line review
- ingredient match confirmation
- explicit invoice confirmation through the existing RM7 endpoint

Repeated confirmation is still blocked.

## Why No Blind Import

Restaurant cost changes are sensitive because they affect:

- ingredient current cost
- dish margin
- ranked actions
- dashboard urgency

Blind OCR import would create false precision risk. The product is safer when OCR is treated as draft generation only.

## What Real Provider Integration Needs Later

Before a live provider is added, RM8 still needs:

- secret management
- provider request adapter
- retry and timeout policy
- raw OCR payload storage strategy
- confidence normalization across providers
- real invoice benchmark fixtures
- acceptance criteria for OCR quality on restaurant supplier documents

## Current Limitations

- fixture OCR only
- no camera capture
- no mobile-native photo flow
- no external provider credentials
- no persistent job storage
- no production document retention model
