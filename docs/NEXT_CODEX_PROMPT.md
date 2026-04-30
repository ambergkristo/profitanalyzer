You are continuing work in the existing repository:

`C:\Users\Kasutaja\Documents\Profit analyzer`

Canonical GitHub repository:
`https://github.com/ambergkristo/profitanalyzer`

Current strategic target:
Production SaaS readiness.

Current roadmap:
- Phase 11 - Production SaaS Architecture Reset - complete
- Phase 12 - Database + Multi-Tenant Data Model - implemented as SaaS data foundation
- Phase 13 - Auth + Workspace Access Control - complete as auth foundation
- Phase 14 - Production Deployment + Observability - start now

Sprint name:
`PHASE 14 - Production Deployment + Observability`

Primary goal:
Make the app deployable and operable on a production-oriented profile without weakening invoice or OCR safety.

Requirements:
- define and harden the production environment profile
- add structured logging and production-safe error handling
- improve health and deep health checks
- validate DB connectivity and migration readiness
- document deploy steps, rollback expectations, and backup/export process
- keep `memory` and `file` drivers usable for demo and local workflows if practical
- add deployment-oriented validation where feasible
- keep auth and workspace context intact
- keep OCR draft-only review-confirm safety unchanged
- keep the mobile-first invoice workflow usable

Important:
- do not add billing yet
- do not add POS integration
- do not add accounting
- do not add inventory management
- do not add supplier API sync
- do not weaken review-confirm
- do not allow blind OCR import

Validation:

```bash
npm install
npm run typecheck
npm test
npm run build
npm run lint
npm run validate:synthetic
npm run validate:demo
npm run validate:invoice
npm run validate:ocr
npm run validate:ocr:provider
npm run validate:pilot
npm run validate:env
npm run validate:db
npm run validate:auth
npm audit
```

If benchmark or audit commands exist, run them too.

Git:

- commit with: `feat: add deployment and observability foundation`
- push to `origin/main`
- verify:

```bash
git fetch origin
git rev-parse HEAD
git rev-parse origin/main
```

Final report must include:

- deployment profile summary
- logging and error-handling status
- health and readiness status
- DB validation status
- validation results
- current branch
- remote origin URL
- latest commit
- origin/main hash
- whether `HEAD == origin/main`
