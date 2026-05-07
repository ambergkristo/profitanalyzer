# Privacy Policy Draft

Draft only. This document is not lawyer-reviewed and must not be presented as final legal advice or a final privacy policy.

Company/legal entity: `[LEGAL_ENTITY_NAME]`  
Contact: `[PRIVACY_CONTACT_EMAIL]`

## Data We Process

- Restaurant profile data: restaurant name, workspace name, currency, country/concept where configured.
- Menu data: dishes, prices, estimated sales volume, recipes, ingredients, units, and costs.
- Supplier data: supplier names, normalized supplier labels, supplier product matches, and invoice source references.
- Invoice files: uploaded images/PDFs where upload storage is enabled. Raw files are not exported by default.
- OCR-extracted invoice data: supplier, invoice date, line items, quantities, units, prices, confidence/warnings, draft status, and review outcome.
- User account data: email, name, session metadata, workspace membership, and role.
- Billing/license data: plan, subscription/license status, founding partner lifetime entitlement, manual license notes, and usage counters.
- Logs and audit events: request IDs, safe operational logs, mutation/audit events, and error metadata.

## Why We Process Data

- Calculate dish-level margins and profit actions.
- Track supplier price changes after review-confirm.
- Create invoice review drafts from manual entry, sample data, or OCR/upload.
- Record cost history and price-change alerts only after confirmation.
- Manage workspace access, license status, and operational support.

## Access

- Workspace users can access data according to their role.
- Authorized support/admin access must be limited to troubleshooting, onboarding, and agreed support.
- OCR providers may process invoice images/text only when configured and used.
- Payment providers may process billing data only after a real payment provider is implemented and configured.

## Storage And Retention

- Current local/demo modes may use memory or local file storage.
- Production target requires database-backed persistence and a hosted file storage strategy.
- Invoice files should be retained only as long as needed for review, audit, customer support, or legal obligations.
- OCR job metadata and audit logs may be retained longer for safety and traceability.
- See `DATA_RETENTION_AND_DELETION.md` for the current proposed process.

## Export And Delete Rights

- Workspaces should be able to request export of restaurant/menu/invoice-derived data.
- Deletion requests should be reviewed before destructive deletion.
- Raw invoice file deletion must be handled separately from extracted invoice metadata and audit logs.
- Backup deletion may follow backup retention windows.

## OCR Provider Caveat

External OCR is optional and environment-configured. The app does not allow OCR blind import. OCR output must be reviewed before cost changes are applied.

## Payment Provider Caveat

Live payment processing is not implemented. If a payment provider is added later, its privacy terms and processor role must be documented.

## Logging And Analytics Caveat

Operational logs must not include secrets, raw OCR payloads, or raw private invoice files. Product analytics, if added later, must be documented before use.
