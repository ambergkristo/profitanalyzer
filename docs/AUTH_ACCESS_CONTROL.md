# Auth And Access Control

## Current Scope

Phase 13 adds a production-oriented auth and workspace access foundation.

It does not claim production-complete identity yet.

Current implementation goals:

- protect restaurant data in non-demo mode
- derive workspace and restaurant scope from authenticated membership
- enforce owner, admin, and member roles on key mutations
- preserve demo mode for product walkthroughs
- keep OCR and invoice safety unchanged

## Auth Modes

- `AUTH_MODE=dev`
- `AUTH_MODE=disabled`
- `AUTH_MODE=password`
- `AUTH_MODE=external_oidc_future`

`AUTH_MODE=dev` is the local/demo validation auth path.

It provides:

- local and validation-safe login
- server-generated session tokens
- hashed server-side token storage
- active workspace and restaurant context
- role-aware request handling

`AUTH_MODE=disabled` is only appropriate for demo mode or deliberately open local workflows.

`AUTH_MODE=password` adds the first production-shaped login path:

- email/password registration and login
- scrypt password hashing with per-user salt
- no plaintext password storage
- server-generated session tokens with hashed token storage
- session expiry and logout invalidation
- controlled public signup through `ALLOW_PUBLIC_SIGNUP`

`AUTH_MODE=external_oidc_future` is a documented future provider seam. It is not a live identity provider integration yet.

## Current Endpoints

- `POST /api/auth/dev-login`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `POST /api/auth/context`

## Session Model

Current auth uses:

- a `User`
- `WorkspaceMembership`
- `AuthSession`

Session tokens are issued by the server and only token hashes are stored.

Password auth stores only password hashes. Dev login is blocked in production mode.

## Roles

- `owner`
- `admin`
- `member`

Current enforcement:

- owner/admin can edit ingredients, recipes, and dishes
- owner/admin can import, export, and reset
- owner/admin can upload OCR drafts and confirm invoices
- members can read dashboard, dish, alert, and analytics views
- members are blocked from protected write flows

## StoreContext

Protected data access should resolve through:

```ts
type StoreContext = {
  workspaceId: string
  restaurantId: string
  actorUserId?: string
}
```

Key rule:

- non-demo protected flows must not trust arbitrary client workspace IDs for data access

## Demo Mode Vs Pilot Mode

### Demo Mode

- may bypass auth for product demonstrations
- keeps scenario-based flows usable without login
- still preserves invoice and OCR review-confirm safety

### Pilot Or Production-Like Mode

- protected restaurant routes require auth
- route scope must come from membership context
- unauthenticated access returns `401`
- out-of-scope workspace access returns `403`

## Protected Route Categories

Protected in non-demo mode:

- ingredients
- recipes
- dishes
- suppliers
- invoices
- invoice confirmation
- alerts
- analytics
- OCR jobs and upload
- import, export, and reset

Unprotected:

- `/health`
- `/api/health/deep`
- `/api/health/readiness`
- `/api/app/config`
- auth endpoints

## Audit Log Foundation

Phase 13 adds an audit log service foundation for key protected mutations:

- ingredient create and update
- recipe create and update
- dish create and update
- invoice review-confirm
- import and reset
- OCR upload

Database-backed audit persistence is ready when the database path is configured.

## Known Limitations

- external identity provider flow is not implemented
- invite flow is not implemented beyond documented future work
- password auth still needs hosted production validation and rate limiting
- production cookie/session deployment behavior still needs final hosting validation
- live DB-backed auth validation depends on `DATABASE_URL`

## Phase 14 Handoff

Phase 14 is now complete as a foundation and adds:

- structured logging with request ids
- deploy-safe error handling
- stronger operational readiness checks
- DB deployment runbooks
- production environment profile validation

What still remains after Phase 14:

- final production identity provider selection
- hardened session lifecycle for hosted production
- membership/invite management UX
- full production monitoring and incident response maturity
