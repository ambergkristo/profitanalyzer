You are continuing work in the existing repository:

C:\Users\Kasutaja\Documents\Profit analyzer

Canonical GitHub repository:
https://github.com/ambergkristo/profitanalyzer

Current strategic state:
- RM1-RM9 are complete as a controlled pilot package
- the strategy has reset toward a founding partner launch product
- production SaaS readiness is still not claimed

Next recommended sprint:
PHASE 11 - Production Persistence + Deployment Foundation

Primary goal:
Implement a real database-ready persistence foundation behind the existing store boundary without breaking current memory or file store support.

Requirements:
- implement a real database adapter behind the existing store boundary if feasible, or create a deployable database-ready implementation path
- preserve `STORE_DRIVER=memory|file`
- add migration and seed strategy
- add deployment env validation and deployment docs
- keep export and backup posture explicit
- keep all validation commands passing
- do not add auth
- do not add billing
- do not add POS integration
- do not add accounting
- do not add inventory management
- do not weaken OCR or invoice review-confirm safety
- do not allow OCR blind import

Validation commands to run before final response:

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

If benchmark or audit commands exist, run them too:

```bash
npm run benchmark:ocr
npm run audit:pilot-demo
```

Git requirements:

- commit with: `docs: reset strategy for founding partner launch`
- push to `origin/main`
- verify:

```bash
git fetch origin
git rev-parse HEAD
git rev-parse origin/main
```

Final report must include:

- what docs or code changed
- new persistence and deployment summary
- whether production readiness is claimed or not
- validation command results
- current branch
- remote origin URL
- latest commit
- origin/main hash
- whether `HEAD == origin/main`
