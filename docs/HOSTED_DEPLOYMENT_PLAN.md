# Hosted Deployment Plan

## Recommended Topology

- Frontend: Vercel or equivalent static hosting.
- Backend API: Render, Fly, Railway, or equivalent Node 20 service.
- Database: hosted Postgres.
- Uploads: `local_file` is acceptable only with a persistent disk for controlled environments; hosted object storage remains a production blocker.
- OCR provider: `fixture`, `disabled`, or `external_env` through environment config. Live OCR accuracy is not claimed.
- Billing provider: `none` or `manual` for controlled launch; live checkout remains future work.

This plan does not claim production SaaS readiness.

## Concrete Recommended Path

Use Vercel for `apps/web`, Render for `apps/api`, and Render Postgres or another managed Postgres provider.

Frontend build:

```bash
npm install
npm run build -w @profit-analyzer/web
```

Frontend output:

```text
apps/web/dist
```

Backend build:

```bash
npm install
npm run build -w @profit-analyzer/api
```

Backend start:

```bash
npm run start:api
```

## Environment Variables

Backend:

- `NODE_ENV=production`
- `APP_MODE=production`
- `STORE_DRIVER=database`
- `DATABASE_URL=<hosted-postgres-url>`
- `AUTH_MODE=password`
- `SESSION_SECRET=<strong-secret>`
- `APP_BASE_URL=https://app.example.com`
- `API_BASE_URL=https://api.example.com`
- `CORS_ORIGIN=https://app.example.com`
- `UPLOAD_STORAGE_DRIVER=local_file`
- `UPLOAD_DATA_DIR=/var/lib/profit-analyzer/uploads`
- `OCR_PROVIDER=disabled` or `external_env`
- `BILLING_PROVIDER=manual`
- `LOG_LEVEL=info`

Frontend:

- `VITE_API_BASE_URL=https://api.example.com` when the API is on a separate origin.

No backend secrets may be exposed as frontend env variables.

## Database Migration

Run before routing traffic:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
npm run validate:db
```

Use the hosted `DATABASE_URL` only in the deployment environment or local shell. Do not commit it.

## Health And Readiness

- `GET /health`
- `GET /api/health/deep`
- `GET /api/health/readiness`

Readiness must show `productionReady=false` until all launch blockers are closed.

## CORS And Base URLs

- `CORS_ORIGIN` must be an explicit HTTP(S) origin.
- Wildcard CORS is blocked in production validation.
- `APP_BASE_URL` and `API_BASE_URL` are required in production mode.
- Vercel rewrites can be used instead of `VITE_API_BASE_URL`, but the split-origin path should set it explicitly.

## Deployment Checklist

- Run the full validation suite.
- Run `npm run build:production`.
- Run `npm run validate:deployment`.
- Follow `docs/HOSTED_DEPLOYMENT_EXECUTION.md`.
- Apply migrations against hosted Postgres.
- Confirm `/api/health/readiness`.
- Confirm dev-login is blocked in production.
- Confirm password login/logout in production-like mode.
- Confirm CORS from frontend origin.
- Run `npm run validate:hosted` with hosted smoke env when URLs and test credentials are available.
- Confirm upload disk or object-storage blocker is accepted.

## Rollback Checklist

- Stop routing traffic to the new backend.
- Redeploy the previous backend artifact.
- Confirm migrations are backward-compatible before rollback.
- Restore database backup if a migration caused data corruption.
- Confirm `/health` and `/api/health/readiness`.
- Review request logs by request id.

## Known Blockers

- Hosted deployment has not been executed end-to-end in this repository environment.
- `validate:hosted` skip-reports until real hosted URLs and controlled test credentials are provided.
- Hosted object storage is not implemented.
- Backup/restore rehearsal is not complete.
- Live OCR benchmark is not proven.
- Live payment provider is not implemented.
- Legal/privacy docs are not lawyer-reviewed.
- UI/UX final quality is still open.
