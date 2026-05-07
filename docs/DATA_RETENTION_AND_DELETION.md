# Data Retention And Deletion

This is a proposed operational process, not final legal policy.

## Data Categories

- Workspace/account data: users, roles, restaurants, memberships.
- Restaurant setup data: ingredients, recipes, dishes, suppliers, prices, and sales estimates.
- Invoice-derived data: invoice headers, line items, matched ingredients, review statuses, confirmed cost updates.
- Raw invoice files: uploaded images/PDFs where storage is enabled.
- OCR metadata: provider, job status, confidence policy, retry/failure metadata, safe quality report.
- Audit/log data: request IDs, mutation events, cost-update events, error metadata.
- Billing/license data: plans, license status, founding partner entitlements, usage counters.
- Private benchmark samples: real or private invoice samples used only for OCR benchmarking.

## Default Retention Proposal

- Restaurant setup and confirmed invoice-derived data: retained while workspace is active.
- Raw invoice files: retain only as needed for review/support, then delete or archive according to customer settings.
- OCR job metadata: retain for auditability and troubleshooting.
- Audit logs: retain long enough to support cost-history traceability and security review.
- Backups: retain according to hosting/database backup policy.
- Private benchmark samples: never commit; delete or keep only in ignored private folders with explicit permission.

## Export Process

- Current dataset export exists for controlled exports.
- Exports must not include secrets or raw private invoice file contents by default.
- Production database export must be scoped to workspace/restaurant.
- Export should include menu, ingredients, recipes, dishes, suppliers, invoices, confirmed cost history, alerts, OCR job metadata, billing/license status, and audit metadata where safe.

## Deletion Request Process

- A deletion request should be authenticated and workspace-scoped.
- Destructive deletion should not run blindly from OCR/import/provider output.
- Current product does not yet implement a full self-serve hard-delete endpoint.
- Proposed production behavior: create a deletion request, verify authority, export backup if requested, delete or anonymize workspace data, delete raw invoice files, and retain legally required audit/billing records where necessary.

## Invoice File Deletion

- Raw invoice files should be deleted from upload storage separately from extracted invoice metadata.
- Local file paths must not be exposed to frontend users.
- Hosted object storage deletion must be verified before production launch.

## OCR Job And Log Retention

- OCR raw provider payloads should not be stored or exported by default.
- Safe quality reports and job metadata may be retained.
- Logs must not include secrets, raw OCR payloads, or private invoice contents.

## Backup Retention

- Memory store has no durable backup.
- File store can be exported, but hosted production backup requires database/provider backup.
- Database backup and restore rehearsal remains a production launch blocker.

## Founding Partner Data Handling

- Founding partner data must be treated as customer data.
- Any public use requires case-study/testimonial consent.
- Lifetime access does not grant permission to publish private operational data.

## Private Benchmark Samples

- Store private invoice samples only under ignored folders such as `benchmarks/ocr/private-samples/`.
- Never commit real invoices, supplier personal data, or private OCR result files.
