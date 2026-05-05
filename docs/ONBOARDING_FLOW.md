# Onboarding Flow

## Purpose

The onboarding flow lets a restaurant owner or manager prepare a workspace without editing JSON or needing developer support.

It is a setup workflow, not marketing. It should stay compact, operational, and usable on mobile.

## Steps

1. Restaurant Profile
2. Ingredients
3. Recipes
4. Dishes
5. Suppliers
6. First Invoice
7. Dashboard Review

## Data Requirements

Minimum useful data for dashboard review:

- restaurant profile saved
- at least 5 ingredients
- at least 2 recipes
- at least 2 dishes linked to recipes
- at least one supplier, or supplier setup consciously skipped
- first invoice confirmed through review-confirm, or skipped for menu-only setup

## API

- `GET /api/onboarding/status`
- `PATCH /api/onboarding/status`
- `POST /api/onboarding/complete-step`
- `POST /api/onboarding/skip-step`
- `GET /api/onboarding/checklist`
- `GET /api/restaurant/profile`
- `PATCH /api/restaurant/profile`
- `GET /api/suppliers`
- `POST /api/suppliers`
- `PATCH /api/suppliers/:id`

All non-demo protected setup mutations require owner/admin role.

Members can view setup status but cannot mutate restaurant setup data.

## Mobile Rules

- no onboarding step may require a desktop table
- recipe ingredient lines must be editable as touch-friendly cards
- dish setup must support recipe selection and price/sales input on phone-sized screens
- first invoice setup must route into the existing mobile-first invoice intake flow
- invoice/OCR output still creates drafts only
- review-confirm remains mandatory before ingredient costs update

## Validation

Run:

```bash
npm run validate:onboarding
npm run validate:mobile
```

`validate:onboarding` checks:

- onboarding status endpoint
- checklist endpoint
- complete-step and skip-step
- restaurant profile save
- ingredient setup
- recipe setup
- dish setup
- supplier setup
- owner/member role behavior
- analytics after setup
- export safety for onboarding state

## Known Limitations

- database-backed onboarding runtime validation still depends on a configured `DATABASE_URL`
- real restaurant onboarding time is not proven
- production SaaS readiness is still not claimed
- first invoice confirmation remains in the invoice intake route rather than fully embedded in onboarding
