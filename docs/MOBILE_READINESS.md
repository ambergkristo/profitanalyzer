# Mobile Readiness

## Product Rule

The product is not considered founding-partner or production-path ready if a critical workflow requires a desktop-only layout.

## Core Requirement

Invoice intake is mobile-first.

The app must support:

- opening the app on a phone
- choosing or taking an invoice photo through browser file input when available
- uploading image or PDF from mobile
- seeing file type and size before upload
- OCR creating a review draft only
- seeing confidence policy and quality warnings after parse
- mobile review and confirm
- no cost update before confirmation

## Current UI Expectations

- the app shell uses a compact navigation model that remains usable on mobile
- primary work views avoid desktop-only long-page layouts where practical
- Menu, Recipes, Ingredients, Alerts, Onboarding, and Billing use workspace layouts that collapse into compact panels rather than wide tables
- onboarding uses compact step cards and mobile forms
- restaurant profile, ingredients, recipes, dishes, suppliers, and first invoice setup must be usable on phone-sized screens
- recipe setup uses line cards and large touch controls rather than a wide table
- invoice review uses card-style rows, not a wide desktop-only table
- unresolved lines stay visually obvious
- touch targets for confirm, ignore, and ingredient selection remain usable
- dashboard KPI cards stack cleanly
- top actions remain readable
- dish detail simulator remains usable on smaller screens
- no horizontal scrolling as the primary interaction

## Future Camera Note

No native mobile app is required yet.

For the current web product:

- browser file input with camera capture is acceptable
- mobile web or PWA-style use is acceptable if the UX is strong

## Mobile Smoke Checklist

- app shell work-tree routes exist for primary workspaces
- menu workspace renders compact dish cards/rows
- recipe workspace renders editable ingredient line cards
- ingredient workspace renders quick edit panels
- alerts workspace renders a supplier-risk worklist
- onboarding wizard renders
- ingredient setup cards render
- recipe builder renders
- dish builder renders
- supplier setup renders
- first invoice step links to invoice intake
- invoice upload mode renders
- invoice upload accepts `image/*,application/pdf`
- invoice upload exposes browser camera capture hint where supported
- invoice review-confirm CTA renders
- invoice page does not depend on a desktop-only table
- dashboard supplier/action surfaces still render
- dish detail simulator controls still render
- language and theme controls remain available without blocking core work

## Current Validation

Run:

```bash
npm run validate:mobile
npm run validate:ui-reset
npm run screenshot:ui
```

Current validation is a smoke gate, not full browser automation.

It now checks onboarding source/tests and mobile invoice upload assumptions, including image/PDF accept, browser capture hint, and draft-only safety copy.

`validate:ui-reset` adds a shell-level smoke gate for the work-tree navigation, theme/language controls, forbidden primary copy, and mobile invoice safety copy.

`screenshot:ui` captures mobile screenshots for Overview, Menu, Dish Detail, Invoices, Onboarding, and Billing against a running local app. The screenshots are local artifacts; the committed report summarizes the visual audit.

## Launch Blockers

The product must not be called launch ready if:

- invoice scan/upload is desktop-only
- invoice review-confirm is desktop-only
- unresolved OCR lines are unreadable on mobile
- dashboard/actions require horizontal scrolling to function
- dish simulator cannot be used from a phone-sized viewport
- onboarding setup requires desktop-only tables or tiny controls
