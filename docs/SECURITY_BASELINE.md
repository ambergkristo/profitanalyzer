# Security Baseline

This document is a production-readiness baseline, not a final security certification.

## Current Status

- Authentication/session: partial. The app has dev-session authentication, hashed session tokens, `/api/auth/me`, logout, workspace context, and role-aware protected routes. A final production identity provider is not implemented.
- RBAC: partial/pass for foundation. Owner, admin, and member roles exist for key data mutations, invoice confirmation, OCR upload, import/export/reset, and read access.
- Workspace isolation: partial. Workspace and restaurant context is enforced in access-layer flows, and database schema includes workspace/restaurant scoping. Live database runtime isolation is not validated here because `DATABASE_URL` is not configured.
- Database: blocked for production launch in this environment. Prisma/Postgres schema and driver foundation exist, but live Postgres validation is skipped without `DATABASE_URL`.
- Upload/OCR file handling: partial. Upload storage has memory and local-file drivers, filename sanitization, mime/size limits, metadata-only API responses, and ignored private upload directories. Hosted object storage is not implemented.
- OCR safety: pass. OCR/upload creates drafts only. Review-confirm remains the only path to ingredient cost mutation, cost history, and alerts. Blind import is not allowed.
- Secret hygiene: partial/pass for repository state. `.env`, `.env.*`, private benchmark folders, upload folders, and local data folders are ignored. Real deployment secrets are not configured here.
- Logging/error handling: partial. Request IDs, structured logs, safe error responses, and readiness checks exist. Full production monitoring and alerting are not complete.
- Audit log foundation: partial. Key audit entities/events exist as a foundation, but production retention and review process are not finalized.
- Dependency audit: blocked/warn. `npm audit` currently reports 5 moderate transitive Vite/Vitest/esbuild vulnerabilities. The available automated fix requires a breaking forced upgrade.

## Production Blockers

- Final production identity provider is not implemented.
- Live DB runtime validation is not complete in this environment.
- Production secrets are not configured.
- Dependency audit still has known moderate transitive issues.
- Monitoring is foundational, not complete.
- Hosted upload/object storage strategy is not implemented.
- Legal/privacy drafts are not lawyer-reviewed.
- Backup/restore rehearsal is not complete.

## Required Before Public Paid SaaS Launch

- Configure and validate production database.
- Replace or harden dev-session auth for production identity.
- Validate tenant isolation against live database-backed storage.
- Configure production secrets and rotate any test values.
- Resolve or formally accept dependency audit risk.
- Add production monitoring and alerting.
- Rehearse backup/export/restore and deletion workflows.
- Complete legal review for privacy, terms, retention, and consent documents.
