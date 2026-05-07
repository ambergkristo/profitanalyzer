# Billing And License Model

## Status

Phase 17 adds a billing and license foundation only.

The product still does not process payments, collect card data, or run live checkout.

## Plans

The plan model supports:

- `starter`
- `pro`
- `multi_location`
- `founding_partner`
- `internal_demo`

Each plan records monthly price, currency, included restaurants, included users, optional invoice allowance, feature labels, and public/internal visibility.

## Workspace Subscription

Each workspace can have a subscription state:

- `trialing`
- `active`
- `past_due`
- `cancelled`
- `expired`
- `lifetime`
- `internal`

The current billing providers are:

- `none`
- `manual`
- `stripe_future`

`stripe_future` is a seam only. It does not create checkout sessions and remains disabled unless future server-side env is configured.

## License Entitlements

Lifetime founding partner access is represented explicitly with `founding_partner_lifetime`.

Other supported entitlement types are:

- `internal_demo`
- `manual_comp`
- `paid_subscription`
- `trial`

Lifetime access must have a reason or notes. It is not represented as an undocumented free account.

## Usage Counters

Usage counters track workspace-scoped operational usage:

- invoice confirmations
- OCR uploads
- users
- restaurants

This is not full metering or billing enforcement yet.

## API

- `GET /api/billing/plans`
- `GET /api/billing/status`
- `GET /api/billing/usage`
- `POST /api/billing/start-trial`
- `POST /api/billing/manual-license`

Manual license grants are controlled owner/admin operations. They are not public checkout.

## Validation

Run:

```bash
npm run validate:billing
```

The command validates plan seed, billing status, manual founding partner license grant, trial status, usage counters, role protection, provider env behavior, and secret-safe responses.

## Production Limitations

- no payment provider is live
- no card collection exists
- no customer-facing checkout exists
- no webhook handling exists
- database-backed billing runtime remains environment-dependent until `DATABASE_URL` is configured and validated
- production SaaS readiness remains false
## Phase 18 Legal And Launch Gate Caveat

The billing/license foundation is not live payment processing.

Before public paid SaaS launch:

- final pricing and terms must be legally reviewed
- founding partner lifetime access must remain an explicit entitlement
- manual licenses must not be confused with paid subscription automation
- payment provider choice and webhook/security model must be decided
- privacy/terms must cover billing data and provider processing

Current status: billing/license foundation exists, live payment provider does not.
