# OCR Provider Benchmark

This folder holds deterministic benchmark expectations for the RM9 OCR provider pilot.

## Structure

- `expected/`
  - committed expected extraction targets for synthetic invoice samples
- `samples/`
  - documentation for sample naming and setup
- `private-samples/`
  - ignored local files for live provider validation

## Privacy Rule

Do not commit real supplier invoices or documents with customer or supplier-sensitive data.

Use:

- synthetic/generated invoice images or PDFs only
- local private files under `benchmarks/ocr/private-samples/`

## Live Provider Validation

When `OCR_PROVIDER=external_env` and credentials are configured, `npm run validate:ocr:provider` looks for:

- `benchmarks/ocr/private-samples/clean-invoice-provider-sample.jpg`

The script compares the result against:

- `benchmarks/ocr/expected/clean-invoice.expected.json`

If the provider env is missing, the script exits `0` and reports `SKIPPED_EXTERNAL_PROVIDER`.
