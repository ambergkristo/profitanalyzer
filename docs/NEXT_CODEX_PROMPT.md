You are continuing work in the existing repository:

C:\Users\Kasutaja\Documents\Profit analyzer

Canonical GitHub repository:
https://github.com/ambergkristo/profitanalyzer

Current strategic target:
Production SaaS readiness.

Current roadmap:
- Phase 11 — Production SaaS Architecture Reset — complete
- Phase 12 — Database + Multi-Tenant Data Model — implemented as SaaS data foundation
- Phase 13 — Auth + Workspace Access Control — start now

Sprint name:
PHASE 13 — Auth + Workspace Access Control

Primary goal:
Add the first real auth and workspace access-control layer on top of the new DB foundation without weakening invoice or OCR safety.

Requirements:
- select and implement an auth/session strategy appropriate for the current stack
- add user session flow
- replace default store context with authenticated workspace context
- add workspace membership enforcement
- support owner, admin, and member roles
- protect API routes
- add route guards in the frontend
- prove no cross-workspace leakage through authenticated requests
- keep `memory` and `file` drivers usable for demo and local test workflows if practical
- keep OCR draft-only review-confirm safety unchanged
- keep mobile-first invoice workflow usable

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
npm audit
```

If benchmark or audit commands exist, run them too.

Git:

- commit with: `feat: add auth and workspace access control foundation`
- push to `origin/main`
- verify:

```bash
git fetch origin
git rev-parse HEAD
git rev-parse origin/main
```

Final report must include:

- auth strategy selected
- workspace isolation strategy
- protected route status
- validation results
- current branch
- remote origin URL
- latest commit
- origin/main hash
- whether `HEAD == origin/main`
