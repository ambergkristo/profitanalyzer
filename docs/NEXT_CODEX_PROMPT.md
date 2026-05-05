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
- Phase 16 - Production Invoice/OCR Pipeline - complete as production pipeline foundation
- Phase 17 - Billing + License Model Readiness - start next

Sprint name:
`PHASE 17 - Billing + License Model Readiness`

Primary goal:
Prepare the product for monetization and founding-partner lifetime access without forcing a payment provider dependency yet.

Requirements:
- define pricing plan model
- add founding-partner lifetime license model
- add subscription/license status model behind the store boundary
- add billing provider seam with `disabled` or `manual` default
- keep normal validation free of payment-provider credentials
- add trial/license gating where safe without blocking demo mode
- expose license status in app config/auth context if useful
- add validation command for license/billing readiness
- document terms, limitations, and production gaps

Important:
- do not add POS integration
- do not add accounting
- do not add inventory management
- do not add supplier API sync
- do not add a hard payment-provider dependency unless configured
- do not weaken review-confirm
- do not allow blind OCR import
- do not require external OCR credentials for normal validation
- do not claim production SaaS readiness yet

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
npm run validate:mobile
npm run validate:onboarding
npm run validate:invoice-pipeline
npm run benchmark:ocr
npm audit
```

Git:

- commit with: `feat: add billing and license readiness foundation`
- push to `origin/main`
- verify:

```bash
git fetch origin
git rev-parse HEAD
git rev-parse origin/main
```

Final report must include:

- billing/license readiness summary
- selected billing approach
- lifetime license model status
- validation results
- latest commit
- `HEAD == origin/main`
