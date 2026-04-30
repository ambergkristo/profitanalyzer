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
- Phase 15 - Mobile-First Restaurant Onboarding - start now

Sprint name:
`PHASE 15 - Mobile-First Restaurant Onboarding`

Primary goal:
Make a real restaurant able to onboard from mobile or desktop without founder hand-holding, while preserving the current premium UI direction and OCR safety rules.

Requirements:
- add a mobile-first onboarding wizard
- support restaurant profile setup
- support ingredient setup
- support recipe builder
- support dish builder
- support supplier setup
- keep invoice upload/review mobile-first
- add a setup checklist
- avoid desktop-only critical paths
- preserve clean premium UI
- keep OCR draft-only review-confirm safety unchanged

Important:
- do not add billing yet
- do not add POS integration
- do not add accounting
- do not add inventory management
- do not add supplier API sync
- do not weaken review-confirm
- do not allow blind OCR import
- do not introduce generic SaaS clutter

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
npm audit
```

If benchmark or audit commands exist, run them too.

Git:

- commit with: `feat: add mobile-first onboarding foundation`
- push to `origin/main`
- verify:

```bash
git fetch origin
git rev-parse HEAD
git rev-parse origin/main
```

Final report must include:

- onboarding flow summary
- mobile readiness summary
- setup-tool coverage
- validation status
- validation results
- current branch
- remote origin URL
- latest commit
- origin/main hash
- whether `HEAD == origin/main`
