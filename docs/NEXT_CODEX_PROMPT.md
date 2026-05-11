You are continuing work in the existing repository:

`C:\Users\Kasutaja\Documents\Profit analyzer`

Canonical GitHub repository:
`https://github.com/ambergkristo/profitanalyzer`

Current strategic target:
Production SaaS readiness.

Current status:

- RM1-RM9 complete as controlled pilot / founding-partner foundation
- Phase 11-18 foundations complete
- local Postgres runtime validation passes when `DATABASE_URL` is configured
- password auth foundation exists and dev-login is blocked in production mode
- hosted deployment validation foundation exists locally
- production SaaS readiness is still not claimed

Recommended next sprint:
`PRODUCTION BLOCKER SPRINT 4 - Hosted Deploy Execution + Production Smoke`

Primary goal:
Execute a real hosted deployment rehearsal for frontend, backend, and hosted Postgres, then prove production-like runtime behavior through smoke validation.

Required scope:

- select actual hosting targets for frontend, backend, and Postgres
- configure hosted env vars without committing secrets
- run hosted DB migrations and seed
- deploy backend build and confirm `npm run start:api`
- deploy frontend build with `VITE_API_BASE_URL` or provider rewrites
- verify CORS from hosted frontend to hosted backend
- verify `/health`, `/api/health/deep`, and `/api/health/readiness`
- verify password login/logout and dev-login production lockdown
- verify workspace isolation through hosted API smoke checks
- verify invoice/OCR draft-only safety in hosted environment
- update deployment reports and launch gate honestly
- keep `productionReady=false` unless every remaining blocker is genuinely closed

Important:

- do not commit `.env`, hosted secrets, uploaded files, private invoices, or screenshots
- do not add billing/payment checkout
- do not add POS/accounting/inventory/supplier API sync
- do not weaken OCR review-confirm safety
- do not claim production SaaS readiness if legal, billing, OCR benchmark, monitoring, backup/restore, UI finalization, or launch-gate blockers remain

Validation:

```bash
npm install
npm run typecheck
npm test
npm run build
npm run build:production
npm run lint
npm run validate:env
npm run validate:db
npm run validate:auth
npm run validate:runtime
npm run validate:deployment
npm run validate:production-readiness
npm run validate:launch-gate
npm run validate:ui-reset
npm run validate:mobile
npm run validate:onboarding
npm run validate:invoice
npm run validate:invoice-pipeline
npm run validate:billing
npm run benchmark:ocr
npm audit
```

Git:

- commit with: `feat: validate hosted deployment smoke path`
- push to `origin/main`
- verify `HEAD == origin/main`
