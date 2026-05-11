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
- password auth foundation exists
- dev-login is blocked in production mode
- session tokens are server-generated and only token hashes are stored
- production SaaS readiness is still not claimed

Recommended next sprint:
`PRODUCTION BLOCKER SPRINT 3 - Hosted Deployment + Production Environment Validation`

Primary goal:
Prove the app can run in a production-like hosted environment with database, password auth, upload storage, readiness checks, and safe operational configuration.

Required scope:

- create or finalize hosted deployment profile for frontend, backend, and Postgres
- validate `APP_MODE=production`, `NODE_ENV=production`, `STORE_DRIVER=database`, and `AUTH_MODE=password`
- prove migrations run in deployment-like setup
- prove `/api/health/readiness` and `/api/health/deep` work without secrets exposure
- verify dev-login remains blocked in production
- verify password login/session/logout in production-like mode
- validate workspace isolation through hosted/database-backed API smoke tests
- validate upload storage configuration is not memory-only in production
- document rollback and migration runbook
- keep productionReady=false unless all remaining launch blockers are genuinely closed

Important:

- do not add billing/payment checkout
- do not add POS/accounting/inventory/supplier API sync
- do not weaken OCR review-confirm safety
- do not allow blind OCR import
- do not commit secrets, `.env`, uploaded files, screenshots, or private invoices
- do not claim production SaaS readiness without closing legal, billing, OCR benchmark, monitoring, backup/restore, and launch-gate blockers

Validation:

```bash
npm install
npm run typecheck
npm test
npm run build
npm run lint
npm run validate:env
npm run validate:db
npm run validate:auth
npm run validate:runtime
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

If a hosted or local production-like Postgres is available:

```powershell
$env:DATABASE_URL="postgresql://..."
$env:APP_MODE="production"
$env:NODE_ENV="production"
$env:STORE_DRIVER="database"
$env:AUTH_MODE="password"
$env:SESSION_SECRET="..."
npm run db:generate
npm run db:migrate
npm run db:seed
npm run validate:db
npm run validate:auth
```

Git:

- commit with: `feat: validate hosted production deployment profile`
- push to `origin/main`
- verify `HEAD == origin/main`
