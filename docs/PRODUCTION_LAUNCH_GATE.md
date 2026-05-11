# Production Launch Gate

This is the central go/no-go document for production launch readiness.

## Current Launch Status

- Controlled demo: YES.
- Founding partner controlled launch: CONDITIONAL.
- Public paid SaaS launch: NO-GO.

## Go/No-Go Verdict

Public paid SaaS launch is NO-GO.

The product has strong controlled-pilot and founding-partner foundations, but production SaaS readiness is not claimed.

## Critical Blockers

- Local Postgres/database runtime validation passes, but hosted deployment execution is not complete.
- Password auth foundation and session hardening exist, but hosted production identity validation is not complete.
- External identity provider and email delivery are not implemented.
- Live payment provider is not implemented.
- Legal/privacy documents are drafts and not lawyer-reviewed.
- Live OCR accuracy is not proven with private benchmark samples.
- Hosted object storage strategy is not implemented.
- Backup/restore runbook exists, but hosted backup/restore rehearsal is not complete.
- UI/UX final quality is still open according to product owner.
- Production monitoring/alerting is foundational only.
- Production backup/restore rehearsal is not complete.
- `npm audit` has known moderate transitive Vite/Vitest/esbuild vulnerabilities.

## Non-Blocking Warnings

- EE/EN localization is partial.
- Mobile readiness is smoke/static tested, not fully browser-automated.
- File store is useful for local pilot, not hosted SaaS persistence.
- Case-study advocacy must remain permission-based and value-based.

## Required Validation Commands

```bash
npm install
npm run typecheck
npm test
npm run build
npm run lint
npm run validate:ui-reset
npm run validate:mobile
npm run validate:synthetic
npm run validate:demo
npm run validate:invoice
npm run validate:ocr
npm run validate:ocr:provider
npm run validate:pilot
npm run validate:env
npm run validate:db
npm run validate:auth
npm run validate:runtime
npm run validate:deployment
npm run validate:production-readiness
npm run validate:onboarding
npm run validate:invoice-pipeline
npm run validate:billing
npm run validate:launch-gate
npm run benchmark:ocr
npm audit
```

## Required Manual Checks

- Mobile invoice upload and review on real phone viewport.
- Workspace isolation using production database.
- Auth/session behavior in hosted production-like deployment.
- Frontend/backend CORS and base URL behavior in hosted deployment.
- Backup/export/restore rehearsal.
- OCR benchmark with 5-10 permissioned private invoice samples.
- Legal review of privacy, terms, retention, and consent docs.
- Case-study material approval workflow rehearsal.

## Required Legal Review

- Privacy policy.
- Terms of service.
- Data retention and deletion.
- Case-study/testimonial consent.
- Billing/license and founding partner lifetime access terms.

## Required Live DB Validation

- Run local validation with `docs/DATABASE_RUNTIME_VALIDATION.md`.
- Run migrations against production-like hosted Postgres.
- Seed default workspace/restaurant safely.
- Validate workspace isolation.
- Validate export/import scoped to workspace.
- Validate backup/restore.
- Run `npm run validate:deployment` after production build.

## Required Auth Hardening

- Validate password auth in hosted production-like deployment.
- Keep dev-login blocked in production mode.
- Decide whether password auth is sufficient for first paid launch or select an external identity provider.
- Add invite email delivery or controlled account provisioning.
- Validate RBAC and tenant isolation through authenticated routes.
- Configure session secrets and cookie/security settings.

## Required Payment Provider Decision

- Decide whether launch requires live checkout or manual invoicing.
- If live payments are used, add provider integration, webhook validation, and secret handling.
- If manual billing is used, document operational process and license enforcement.

## Required Live OCR Benchmark

- Use permissioned private invoices only.
- Store private samples in ignored folders.
- Compare expected JSON to provider output.
- Report extraction quality and review burden honestly.
- Keep OCR draft-only and review-confirm mandatory.

## Required Mobile Manual Check

- Invoice upload from phone.
- Review line cards from phone.
- Confirm CTA disabled/enabled behavior from phone.
- Onboarding setup from phone.
- Dashboard/action readability from phone.

## Required Backup/Restore Rehearsal

- Database backup restore.
- Dataset export restore.
- Raw invoice file backup/delete.
- Audit log retention behavior.
