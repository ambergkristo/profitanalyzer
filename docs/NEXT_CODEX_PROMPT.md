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
- Phase 16 - Production Invoice/OCR Pipeline - start next

Sprint name:
`PHASE 16 - Production Invoice/OCR Pipeline`

Primary goal:
Make the invoice and OCR workflow production-safe without allowing blind import or weakening review-confirm.

Requirements:
- design and implement a production-safe upload storage strategy
- persist OCR job metadata through the store boundary
- keep uploaded file contents out of memory/file exports unless explicitly safe
- add private benchmark workflow for realistic invoice samples
- add expected JSON comparison and review-burden scoring
- add confidence thresholds and quality reporting
- make provider errors safe and observable
- add review-confirm audit log coverage
- preserve mobile-first photo/upload and review flow
- prove no OCR path can mutate ingredient costs before review-confirm

Important:
- do not add billing
- do not add POS integration
- do not add accounting
- do not add inventory management
- do not add supplier API sync
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
npm audit
```

Git:

- commit with: `feat: harden production invoice ocr pipeline`
- push to `origin/main`
- verify:

```bash
git fetch origin
git rev-parse HEAD
git rev-parse origin/main
```

Final report must include:

- invoice/OCR production-safety summary
- storage strategy
- benchmark status
- mobile invoice status
- OCR safety confirmation
- validation results
- latest commit
- `HEAD == origin/main`
