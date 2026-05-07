You are continuing work in the existing repository:

`C:\Users\Kasutaja\Documents\Profit analyzer`

Canonical GitHub repository:
`https://github.com/ambergkristo/profitanalyzer`

Current strategic target:
Production SaaS readiness.

Current roadmap:

- Phase 11 - Production SaaS Architecture Reset - complete
- Phase 12 - Database + Multi-Tenant Data Model - partial / architectural pass
- Phase 13 - Auth + Workspace Access Control - complete as auth foundation
- Phase 14 - Production Deployment + Observability - complete as deployment and observability foundation
- Phase 15 - Mobile-First Restaurant Onboarding - complete as onboarding foundation
- Phase 16 - Production Invoice/OCR Pipeline - complete as invoice/OCR pipeline foundation
- Phase 17 - Billing + License Model Readiness - complete as billing/license foundation
- Phase 18 - Security, Privacy, Legal, and Launch Gate - complete as launch-gate foundation
- Next recommended sprint - Live Postgres + deployment validation

Sprint name:
`PRODUCTION BLOCKER SPRINT 1 - Live Postgres + Deployment Validation`

Primary goal:
Close the highest production blocker by validating a real hosted or local-production Postgres runtime behind the existing database store driver and deployment profile.

Required scope:

- configure `DATABASE_URL` for a safe non-production validation database
- run Prisma generate/migrate/seed against that database
- validate `STORE_DRIVER=database`
- validate workspace/restaurant isolation through the database store
- validate export/import scoped to workspace
- validate invoice review-confirm through database-backed persistence if adapter parity supports it
- validate OCR job metadata persistence through database store where implemented
- document migration and rollback runbook
- keep memory/file store working for demo/tests
- do not claim production SaaS readiness unless all launch-gate blockers are closed

Important:

- preserve the production app shell, work-tree navigation, EE/EN toggle, and dark/light theme token system
- keep technical diagnostics in Settings rather than primary work views
- do not add billing/payment implementation beyond the current foundation
- do not add new product features
- do not add POS integration
- do not add accounting
- do not add inventory management
- do not add supplier API sync
- do not weaken OCR review-confirm safety
- do not allow blind OCR import
- do not claim production SaaS readiness unless every launch gate is actually closed
- keep mobile-first invoice and onboarding requirements

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
npm run validate:runtime
npm run validate:production-readiness
npm run validate:launch-gate
npm run validate:mobile
npm run validate:onboarding
npm run validate:invoice-pipeline
npm run validate:billing
npm run benchmark:ocr
npm audit
```

Git:

- commit with: `feat: validate live database deployment foundation`
- push to `origin/main`
- verify `HEAD == origin/main`
