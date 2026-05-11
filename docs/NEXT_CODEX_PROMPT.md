You are continuing work in the existing repository:

`C:\Users\Kasutaja\Documents\Profit analyzer`

Canonical GitHub repository:
`https://github.com/ambergkristo/profitanalyzer`

Current strategic target:
Production SaaS readiness.

Current status:

- RM1-RM9 complete as controlled pilot / founding-partner foundation
- Phase 11-18 foundations complete
- local Postgres runtime validation passes when `DATABASE_URL` is configured
- password auth foundation exists and dev-login is blocked in production mode
- hosted deployment validation foundation exists locally
- hosted deployment execution checklist exists
- `npm run validate:hosted` exists and skip-reports without hosted env
- production SaaS readiness is still not claimed

Recommended next sprint:
`PRODUCTION BLOCKER SPRINT 5 - Execute Hosted Deploy Or Close Hosted Smoke Gaps`

Primary goal:
Run the hosted deployment smoke validation against real hosted frontend/backend/Postgres URLs, or close the exact hosted deploy gaps that prevent it from running.

Required scope:

- provision or select hosted frontend, backend, and Postgres targets
- configure backend env vars in the hosting provider, without committing secrets
- run hosted migrations and seed using `db:deploy:migrate` and `db:deploy:seed`
- deploy backend and frontend
- set frontend `VITE_API_BASE_URL`
- create a controlled hosted test user
- run `HOSTED_SMOKE_ENABLED=true npm run validate:hosted`
- verify `/health`, `/api/health/deep`, and `/api/health/readiness`
- verify production CORS from hosted frontend to hosted backend
- verify password auth, dev-login lockdown, analytics, billing status, and invoice review-confirm safety
- keep `productionReady=false` unless every remaining blocker is genuinely closed

If hosted validation passes, recommend the next blocker:

- backup/restore rehearsal, or
- live OCR provider benchmark, or
- UI/UX Sprint 5 for full EE coverage and premium finish

Validation:

```bash
npm install
npm run typecheck
npm test
npm run build
npm run build:production
npm run lint
npm run validate:env
npm run validate:db
npm run validate:auth
npm run validate:runtime
npm run validate:deployment
npm run validate:hosted
npm run validate:production-readiness
npm run validate:launch-gate
npm run validate:ui-reset
npm run validate:mobile
npm run validate:onboarding
npm run validate:invoice
npm run validate:invoice-pipeline
npm run validate:billing
npm run benchmark:ocr
npm audit
```

Git:

- commit with: `feat: execute hosted deployment smoke`
- push to `origin/main`
- verify `HEAD == origin/main`
