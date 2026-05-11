# Hosted Deployment Execution

This is the execution checklist for a real hosted deployment rehearsal. It does not include secrets and does not claim production SaaS readiness.

## Target Topology

- Frontend: Vercel or equivalent static hosting.
- Backend: Render, Fly, Railway, or equivalent Node 20 service.
- Database: hosted Postgres.
- Uploads: persistent local disk is acceptable only for controlled deployment rehearsal; object storage remains a production blocker.
- OCR: disabled or env-gated external provider.
- Billing: manual/none until a live payment provider is selected.

## 1. Create Hosted Postgres

1. Create a managed Postgres database.
2. Enable automated provider backups.
3. Copy the hosted connection string into the backend service secret manager only.
4. Do not commit the hosted `DATABASE_URL`.
5. Confirm the database accepts TLS if required by the provider.

## 2. Set Backend Environment

```bash
NODE_ENV=production
APP_MODE=production
STORE_DRIVER=database
DATABASE_URL=<hosted-postgres-url>
AUTH_MODE=password
ALLOW_PUBLIC_SIGNUP=false
SESSION_SECRET=<strong-secret>
APP_BASE_URL=https://app.example.com
API_BASE_URL=https://api.example.com
CORS_ORIGIN=https://app.example.com
UPLOAD_STORAGE_DRIVER=local_file
UPLOAD_DATA_DIR=/var/lib/profit-analyzer/uploads
OCR_PROVIDER=disabled
BILLING_PROVIDER=manual
LOG_LEVEL=info
```

Production must not use `AUTH_MODE=dev`, `AUTH_MODE=disabled`, `STORE_DRIVER=memory`, wildcard CORS, placeholder secrets, or memory upload storage.

## 3. Run Migrations

Run before routing traffic:

```bash
npm install
npm run db:generate
npm run db:deploy:migrate
npm run db:deploy:seed
npm run validate:db
```

Use the hosted `DATABASE_URL` in the shell or hosting job environment only. Do not run destructive reset commands against hosted Postgres.

## 4. Deploy Backend

Backend build command:

```bash
npm install
npm run build -w @profit-analyzer/core
npm run build -w @profit-analyzer/api
```

Backend start command:

```bash
npm run start:api
```

Health checks:

- `GET /health`
- `GET /api/health/deep`
- `GET /api/health/readiness`

Expected readiness still includes `productionReady=false` until all non-deployment blockers are closed.

## 5. Validate Backend

```bash
curl https://api.example.com/health
curl https://api.example.com/api/health/deep
curl https://api.example.com/api/health/readiness
```

Verify:

- no raw `DATABASE_URL`
- no `SESSION_SECRET`
- `appMode=production`
- `storage.driver=database`
- `auth.mode=password`
- `productionReady=false`
- no wildcard CORS

## 6. Deploy Frontend

Frontend env:

```bash
VITE_API_BASE_URL=https://api.example.com
```

Frontend build command:

```bash
npm install
npm run build -w @profit-analyzer/web
```

Frontend output:

```text
apps/web/dist
```

Do not expose backend-only secrets through frontend env.

## 7. Validate Frontend

1. Open the hosted app URL.
2. Confirm the app shell loads.
3. Confirm login screen appears in production mode.
4. Sign in with a controlled test user.
5. Confirm dashboard loads.
6. Confirm invoice review still states: Review required before costs update.
7. Confirm no demo scenario selector dominates production UI.

## 8. Validate Auth

- `POST /api/auth/dev-login` returns blocked/forbidden in production.
- `POST /api/auth/login` works for the controlled test user.
- `GET /api/auth/me` returns only the user's workspace memberships.
- Logout invalidates the session.
- Owner/admin/member role checks still apply.

## 9. Validate Invoice Safety

Use safe fixture/demo data only.

- invoice parse/upload creates a draft only
- unresolved invoice lines block confirmation
- confirmation requires explicit review-confirm
- cost history and alerts are created only after review-confirm
- no blind import exists

## 10. Validate CORS

From the hosted frontend origin, confirm:

- API requests succeed.
- preflight requests include `Access-Control-Allow-Origin` for the hosted app origin.
- wildcard CORS is not used in production.

## 11. Run Hosted Smoke Validation

PowerShell:

```powershell
$env:HOSTED_SMOKE_ENABLED="true"
$env:HOSTED_API_BASE_URL="https://api.example.com"
$env:HOSTED_APP_BASE_URL="https://app.example.com"
$env:HOSTED_TEST_EMAIL="<test-user-email>"
$env:HOSTED_TEST_PASSWORD="<test-user-password>"
npm run validate:hosted
```

Without hosted env, `npm run validate:hosted` skip-reports and exits 0.

## 12. Rollback Steps

1. Stop routing traffic to the new backend.
2. Redeploy the previous backend artifact.
3. Redeploy the previous frontend artifact if frontend config changed.
4. Check whether migrations are backward-compatible before rollback.
5. Restore from provider backup only if data corruption occurred.
6. Re-run `/health`, `/api/health/deep`, `/api/health/readiness`.
7. Review logs by request id.

## Current Status

Hosted deployment execution is not proven in this repository environment until `HOSTED_SMOKE_ENABLED=true` validation runs against real hosted URLs.
