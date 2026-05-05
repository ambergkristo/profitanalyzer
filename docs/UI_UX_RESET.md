# UI/UX Reset

## Why This Reset Was Needed

The product logic had advanced faster than the interface. Primary views still felt too much like a demo cockpit: prominent scenario controls, technical badges, stacked cards, long pages, and synthetic validation language made the app look less mature than the underlying business logic.

The reset moves the frontend toward a production restaurant profit operating interface without claiming production SaaS readiness.

## Shell Model

The app uses a production shell:

- left work-tree navigation for primary work areas
- compact top bar for workspace and user context
- Settings/Diagnostics for environment and readiness details
- restrained demo scenario selector only when demo mode is active
- bounded work areas instead of long stacked pages where practical

Primary navigation:

- Overview
- Menu
- Recipes
- Ingredients
- Invoices
- Alerts
- Onboarding
- Billing
- Settings

## No-Scroll Principle

Primary work views should fit into a normal desktop viewport where practical. Internal scroll is acceptable inside bounded lists, review lines, and work panels. The default product experience should not be a long sequence of stacked cards.

## Demo Separation

Demo mode can still expose demo restaurants and scenarios, but demo mechanics must not dominate the product shell. Technical labels such as storage driver, auth mode, OCR provider state, and production readiness belong in Settings/Diagnostics.

Primary work views should not show synthetic validation copy or fixture-provider copy.

## EE/EN Language Foundation

The shell includes a persisted EE/EN language toggle. The first translation layer covers navigation and high-frequency action labels. Full string translation remains future work.

Current covered labels include Overview, Menu, Recipes, Ingredients, Invoices, Alerts, Onboarding, Billing, Settings, New invoice, Export, Confirm, and Review required.

## Dark/Light Theme Foundation

Dark theme remains the default. Light theme is available through shared CSS variables and persisted user choice. The product should not maintain separate dark and light UIs.

The current token layer defines background, surface, elevated surface, border, text, muted text, accent, success, warning, danger, and info colors.

## Mobile Invoice Rule

Invoice intake remains mobile-first. Upload creates a review draft only, review lines remain card/touch oriented, and ingredient costs update only after confirmation.

Browser file input with image/PDF support and camera capture hint is acceptable for the current mobile web path.

## Forbidden UI Patterns

- demo cockpit as the main app experience
- synthetic validation labels in primary work views
- fixture OCR/default provider labels in primary work views
- decorative status words such as idle or operative
- AI-powered or magic claims
- dense raw tables as the primary workflow
- long marketing copy inside work screens
- desktop-only invoice review

## Validation

Run:

```bash
npm run validate:ui-reset
```

This validates shell files, work-tree labels, theme/language controls, Settings diagnostics, forbidden primary copy, mobile invoice safety copy, and deterministic UI reset reports.

## Known Remaining Visual Gaps

- Menu, Recipes, and Ingredients still reuse existing pilot setup tooling in places and need dedicated production workspaces later.
- Some legacy page components still use older panel styling even though the primary shell and Overview are token-driven.
- EE/EN coverage is intentionally partial.
- Full mobile browser automation is still future work; current checks are smoke/static/component-level gates.
