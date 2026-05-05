# Real Invoice Benchmark Guide

## Purpose

The OCR benchmark is designed to measure extraction quality honestly before public OCR claims.

Do not commit real invoices, supplier-confidential pricing, personal data, raw provider payloads, or private benchmark results.

## Safe Folder Structure

Committed:

- `benchmarks/ocr/README.md`
- `benchmarks/ocr/expected/*.expected.json`

Ignored/private:

- `benchmarks/ocr/private-samples/`
- `benchmarks/ocr/private-results/`

## Private Sample Collection

For a realistic benchmark, collect 5-10 invoices that cover:

- clean photo
- blurry photo
- cropped or rotated photo
- PDF invoice
- mixed supplier naming
- unit mismatch cases
- missing or unclear prices

Use restaurant-owner permission before using any real document.

## Expected JSON Format

```json
{
  "fixtureName": "private-invoice-01.jpg",
  "supplierName": "Supplier Name",
  "invoiceDate": "2026-04-08",
  "expectedLineCount": 7,
  "expectedProducts": ["Product A", "Product B"]
}
```

## Running The Benchmark

```bash
npm run benchmark:ocr
```

If external provider env is missing, the command prints `LIVE_PROVIDER_SKIPPED` and exits 0.

## Minimum Review Metrics

Track:

- supplier detected
- invoice date detected
- line count detected
- product name match rate
- quantity/unit/price extraction quality
- unresolved line rate
- review burden score
- recommendation

Recommendations:

- `ready_for_demo`
- `manual_review_demo_only`
- `not_ready_for_customer_demo`

## What Not To Claim

Do not claim:

- production OCR accuracy
- broad supplier format support
- fully automated cost import
- no-review invoice processing

OCR remains a draft source. Review-confirm remains mandatory.
