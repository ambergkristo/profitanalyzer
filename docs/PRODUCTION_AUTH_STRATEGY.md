# Production Auth Strategy

## Current Auth Modes

- `AUTH_MODE=dev`: local/demo validation path. It is blocked in `APP_MODE=production`.
- `AUTH_MODE=disabled`: demo-only open access.
- `AUTH_MODE=password`: production-shaped password auth foundation.
- `AUTH_MODE=external_oidc_future`: documented provider seam, not implemented as a live provider.

## Password Auth Foundation

Password auth supports controlled registration and login:

- passwords are hashed with scrypt and per-user salt
- plaintext passwords are never stored or returned
- password responses do not expose password hashes
- `ALLOW_PUBLIC_SIGNUP=false` keeps registration controlled by default
- `PASSWORD_MIN_LENGTH` defaults to `10`

This is a foundation, not a complete production identity program. Rate limiting, email verification, password reset, account recovery, and abuse monitoring remain future work.

## Session Handling

Sessions use server-generated tokens. Only token hashes are stored.

Current session properties:

- expiry through `SESSION_TTL_HOURS`
- logout invalidates the session
- revoked sessions are rejected
- `lastSeenAt` is updated when sessions are used
- DB-backed sessions can be reloaded by token hash

Production deployment still needs final cookie/transport decisions, secure `SESSION_SECRET`, and hosted validation.

## Workspace And RBAC

Authenticated context resolves through workspace membership:

- user must be a workspace member
- active restaurant must belong to the active workspace
- role is attached to request context
- `actorUserId` is available for audit logging
- owner/admin/member role checks remain enforced

Client-supplied workspace or restaurant IDs are not trusted without membership checks.

## Dev Login Lockdown

`POST /api/auth/dev-login` remains useful for local/demo validation, but it is blocked in production mode.

Validation expectations:

- `APP_MODE=production + AUTH_MODE=dev` fails environment validation
- dev-login returns forbidden in production mode
- production readiness continues to list auth as partial until hosted validation and operational controls exist

## Invite Flow

Invite/workspace onboarding is not fully implemented in this sprint.

Required future work:

- invite model and token hashing
- owner/admin invite creation
- accept-invite endpoint
- email delivery provider
- invite expiry and revocation

## Production Blockers

- hosted password-auth validation is still required
- external identity provider is not implemented
- invite email delivery is not implemented
- password reset and email verification are not implemented
- rate limiting and abuse controls are not implemented
- legal/security launch review remains required

Production SaaS readiness remains false.
