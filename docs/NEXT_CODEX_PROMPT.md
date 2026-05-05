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
- Phase 18 - Security, Privacy, Legal, and Launch Gate - start next

Sprint name:
`PHASE 18 - Security, Privacy, Legal, and Launch Gate`

Primary goal:
Create the final production SaaS launch gate foundation without falsely claiming production readiness.

Required scope:

- privacy policy draft
- terms draft
- data retention policy
- data export and deletion process
- security checklist
- secret hygiene validation
- case study and founding partner consent rules
- production go/no-go report
- launch readiness checklist
- final production readiness report remains honest

Important:

- do not add billing/payment implementation beyond the current foundation
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
npm run validate:mobile
npm run validate:onboarding
npm run validate:invoice-pipeline
npm run validate:billing
npm run benchmark:ocr
npm audit
```

Git:

- commit with: `feat: add security privacy and launch gate foundation`
- push to `origin/main`
- verify `HEAD == origin/main`
