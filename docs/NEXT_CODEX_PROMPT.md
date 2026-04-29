You are continuing work in the existing repository:

C:\Users\Kasutaja\Documents\Profit analyzer

Canonical GitHub repository:
https://github.com/ambergkristo/profitanalyzer

Current strategic state:
- RM1-RM9 are complete as a controlled pilot and founding-partner foundation
- the new target is production SaaS readiness
- production SaaS readiness is not yet claimed

Next recommended sprint:
PHASE 12 — Database + Multi-Tenant Data Model

Primary goal:
Implement a DB adapter behind the existing store boundary and introduce the first real tenant or workspace data model without breaking the current memory or file store flows.

Requirements:
- implement DB adapter behind the existing store boundary
- evaluate and select Prisma or Postgres approach if appropriate
- add tenant, workspace, restaurant, and user data model
- preserve `STORE_DRIVER=memory|file` for tests and demo where useful
- migrate ingredients, recipes, dishes, invoices, alerts, and OCR jobs into the DB model
- add migrations and seeds
- add a validation command if needed
- protect against cross-workspace data leakage at the data layer
- do not add full auth yet unless only minimal placeholder user context is needed
- do not add billing
- do not add POS integration
- do not add accounting
- do not add inventory management
- keep OCR review-confirm safety
- keep mobile-first invoice requirements

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
npm audit
```

If benchmark or audit commands exist, run them too.

Git:

- commit with: `docs: reset roadmap for production SaaS readiness`
- push to `origin/main`
- verify:

```bash
git fetch origin
git rev-parse HEAD
git rev-parse origin/main
```

Final report must include:

- what docs changed
- new production SaaS strategy summary
- new roadmap phases
- explicit statement that current product is not production SaaS ready yet
- next recommended implementation sprint
- validation command results
- current branch
- remote origin URL
- latest commit
- origin/main hash
- whether `HEAD == origin/main`
