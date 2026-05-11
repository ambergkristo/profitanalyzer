# Security Checklist

Status values: pass, partial, blocked, not started.

## Secrets And Environment

- pass: `.env`, `.env.*`, private samples, local data, and upload directories are ignored.
- partial: `.env.example` uses placeholders.
- blocked: production secrets are not configured or rotated in this environment.

## Auth And Session

- partial: dev-login is locked to non-production, password auth foundation exists, and password/session hashes are stored instead of raw secrets.
- blocked: hosted production identity validation, email verification/reset, invite delivery, and final external-provider decision remain open.

## RBAC

- partial: owner/admin/member role checks exist for key mutations and protected routes.
- blocked: production invitation/user management is not complete.

## Workspace Isolation

- partial: workspace/restaurant context exists in access and data layers.
- blocked: live DB tenant isolation is not validated without `DATABASE_URL`.

## Database

- partial: Prisma/Postgres schema and migration foundation exist.
- blocked: live DB runtime validation is skipped in this environment.

## Upload/OCR

- pass: OCR/upload creates drafts only; no blind import.
- partial: memory/local-file upload storage exists with safe metadata.
- blocked: hosted object storage and live OCR accuracy benchmark are not proven.

## Logging And Error Handling

- partial: request IDs, structured logs, safe error payloads, readiness checks.
- blocked: full production monitoring and alerting are not complete.

## Backups

- partial: export/import exists for controlled data.
- blocked: production DB backup/restore rehearsal is not complete.

## Dependency Audit

- blocked: `npm audit` reports 5 moderate transitive Vite/Vitest/esbuild vulnerabilities. Forced remediation is breaking.

## Privacy And Legal

- partial: privacy, terms, retention, and consent drafts exist.
- blocked: legal review is not complete.

## Billing And License

- partial: billing/license foundation and founding partner lifetime entitlement exist.
- blocked: live payment provider and final billing/legal terms are not complete.

## Monitoring

- partial: health/readiness and runtime validation exist.
- blocked: production alerting and incident process are not complete.

## Launch Blockers

- partial: password auth foundation.
- blocked: external identity/email lifecycle decision.
- blocked: live database validation.
- blocked: production monitoring.
- blocked: backup/restore rehearsal.
- blocked: legal review.
- blocked: live OCR benchmark.
- blocked: dependency audit remediation or risk acceptance.
