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
- Next recommended sprint - Production Identity Provider

Sprint name:
`PRODUCTION BLOCKER SPRINT 2 - Production Identity Provider + Session Hardening`

Primary goal:
Replace the dev-session auth foundation with a production-ready identity provider/session strategy while preserving workspace isolation and the existing database store boundary.

Required scope:

- select and document the production identity approach
- replace or gate `dev-login` so it cannot be used in production
- implement production session/cookie/token handling
- require authenticated workspace context for protected routes
- validate owner/admin/member RBAC through authenticated API calls
- prove no cross-workspace data leakage through auth and database context
- keep local/dev auth available only for validation/demo modes
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

- commit with: `feat: add production identity foundation`
- push to `origin/main`
- verify `HEAD == origin/main`
