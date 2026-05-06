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

## Workspace Standard

Sprint 2 consolidates the remaining major pages into a shared workspace pattern:

- `WorkspacePage` for screen-first page composition
- `WorkspaceHeader` for compact operational page identity
- `WorkspaceToolbar` for search, sort, and primary controls
- `WorkspaceGrid` for split work areas
- `WorkspaceList` for bounded internal scrolling
- `WorkspaceDetailPanel` and `ContextPanel` for selected-item context
- `CompactMetric` for restrained metric strips
- `EmptyWorkspaceState` for clean empty/error paths

The intent is consistency, not heavy abstraction. Pages should still own their business-specific workflow, but repeated stacked-card layout should move into shared workspace primitives.

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

Sprint 3 tightened light-mode usage by moving core panels and secondary buttons away from black-transparent surfaces onto token-driven elevated surfaces. Light mode should read as a deliberate product theme, not a default white page.

## Mobile Invoice Rule

Invoice intake remains mobile-first. Upload creates a review draft only, review lines remain card/touch oriented, and ingredient costs update only after confirmation.

Browser file input with image/PDF support and camera capture hint is acceptable for the current mobile web path.

Sprint 3 reduced oversized responsive page header typography after mobile screenshots showed the invoice intake title consuming too much of the viewport.

## Visual Audit Process

Run:

```bash
npm run screenshot:ui
```

This expects a running local app and captures desktop, mobile, and light-theme screenshots into `reports/ui-screenshots/`, which is ignored from git to avoid committing binary artifacts. The committed audit summary lives in:

- `reports/ui-visual-audit-report.json`
- `reports/ui-visual-audit-report.md`

Current audit coverage includes Overview, Menu, Dish Detail, Recipes, Ingredients, Invoices, Alerts, Onboarding, Billing, Settings, light Overview, light Invoices, and mobile Overview/Menu/Dish Detail/Invoices/Onboarding/Billing.

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

Sprint 2 additionally validates that the primary workspace markers exist for Menu, Dish Detail, Recipes, Ingredients, Invoices, Alerts, Onboarding, and Billing.

## Known Remaining Visual Gaps

- Some deeper form controls still use page-local styling and can be folded further into shared input components later.
- Invoices keeps existing review-confirm business logic and tests; surrounding visual polish improved, but the full review interaction remains complex enough to deserve a later focused pass.
- Pilot Tools remains an admin/diagnostics utility rather than a primary product workspace.
- EE/EN coverage is intentionally partial.
- Full mobile browser automation is still future work; current checks are smoke/static/component-level gates.
