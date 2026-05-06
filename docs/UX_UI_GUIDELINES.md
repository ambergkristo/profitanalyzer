# UX and UI Guidelines

## Design Intent

The product should feel like a premium restaurant profit operating tool, not a demo cockpit, generic SaaS admin, spreadsheet, or marketing page.

Design objective: compress complex margin data into fast, confident actions while keeping the interface credible for serious restaurant owners.

## Core UX Principles

- Action first, data second
- Three-click decision path
- No Excel feel
- Mobile-first invoice flow
- Mobile usable across core flows
- Production app shell over demo-first presentation
- Premium operating-platform atmosphere
- Signal-rich but not cluttered
- Every warning must lead to a next action

## Visual Direction

- Dark mode is the default and primary design surface.
- Light mode must be available through the same design-token system.
- Surfaces should feel layered, restrained, and professional.
- KPI numbers should be visually dominant.
- Color is for status and urgency, not decoration.
- Charts should support decisions, not fill empty space.

## Color System

Use central CSS variables/design tokens for primary UI colors. Do not hardcode separate dark and light interfaces.

Dark tokens:

- Background: `#080b10`
- Surface: `#10161d`
- Elevated surface: `#151d26`
- Border: `#24313d`
- Text primary: `#f5f7fa`
- Text muted: `#94a3b8`
- Accent: `#00d1b2`
- Success: `#22c55e`
- Warning: `#f59e0b`
- Danger: `#ef4444`
- Info: `#3b82f6`

Light tokens:

- Background: `#f6f8fb`
- Surface: `#ffffff`
- Elevated surface: `#eef2f6`
- Border: `#d8e0e8`
- Text primary: `#111827`
- Text muted: `#64748b`
- Accent: `#00a996`
- Success: `#15803d`
- Warning: `#b45309`
- Danger: `#b91c1c`
- Info: `#2563eb`

Usage rules:

- Use green for strong margin and positive delta.
- Use yellow for caution and watchlist states.
- Use red for low-margin or loss states.
- Do not overload the UI with five different accent colors.
- Avoid gradients that reduce numeric readability.

## Typography

- Main UI: Inter or clean system sans
- KPI numerics: bold, compact, high contrast
- Status labels: restrained and only where they carry operational meaning

Rules:

- Headings should feel deliberate and technical, not playful.
- Numbers need stronger hierarchy than labels.
- Avoid long paragraphs in panels.

## Layout Rules

### App Shell

- Use a left navigation/work-tree on desktop.
- Use a compact top bar for workspace, user, language, and theme controls.
- Keep technical environment state in Settings/Diagnostics, not primary work views.
- Demo scenario selection may appear in demo mode only as a restrained control.
- Avoid long stacked pages; use bounded internal scroll inside work panels when content is large.

### Workspace Pages

- Use shared workspace primitives for primary product pages: header, metric strip, toolbar, bounded list, selected-detail panel, and optional context panel.
- Prefer split-pane workspaces over stacked SaaS cards.
- Keep search, sort, and primary actions in a compact toolbar.
- Lists should be compact rows/cards with clear selected state, not raw tables.
- Details should open in the main area or a right-side panel where practical.
- Empty states should explain the next operational action without marketing copy.

### Dashboard

- Top metric strip: estimated profit, weighted margin, revenue, dishes at risk.
- Main work area: priority actions, menu pressure, lowest-margin dishes, supplier alerts, recent invoices.
- Avoid synthetic/demo validation copy in the primary dashboard.
- Fit the operating view into a 1440x900-style viewport where practical.

### Menu / Dishes

- Prioritize status, margin, profit contribution, and action
- Avoid dense spreadsheet grids
- Collapse secondary metadata behind row expansion or detail view
- Use compact dish rows/cards with selected dish preview or clean navigation to detail.

### Dish Detail

- Start with verdict and recommendation
- Then show cost breakdown
- Then show assumptions and calculation notes
- Keep the simulator visible without deep desktop scrolling where practical.

### Recipes And Ingredients

- Recipe builder should use editable ingredient line cards, not a wide spreadsheet.
- Ingredient setup should expose quick cost/unit editing without making the product feel like inventory software.
- Cost previews should be visible when they materially help a restaurant owner understand margin impact.

### Mobile

- Use stacked cards over wide tables where possible
- Preserve decision signal before detailed line items
- Critical actions must be reachable with one thumb
- No horizontal scrolling as the primary interaction
- Dashboard KPI cards must stack cleanly
- Dish detail and simulator must remain usable inside a narrow viewport
- Expandable panels such as cost history must collapse cleanly on mobile

## Core Components

- App shell
- Side navigation/work-tree
- Top workspace bar
- Settings/Diagnostics panel
- Theme toggle
- Language toggle
- KPI card
- Recommendation card
- Status badge
- Dish list row/card
- Ingredient breakdown list
- Margin meter
- Scenario simulator panel
- Invoice upload panel
- Invoice review row/card
- Price change alert card
- Empty state with guided next action
- Import or manual-entry stepper

## Interaction Rules

- Any flagged dish must expose why it is flagged.
- Any recommendation must show estimated impact and confidence.
- Any simulation change must update outputs immediately.
- Invoice scan must always route through a confirm screen before cost updates are saved.
- Use progressive disclosure for formula detail.
- Use hover states on desktop, but never rely on hover for core meaning.
- Use confirmation only for destructive actions, not for routine data edits.

## Invoice Scan UI Guidance

### Upload Invoice View

- Support phone photo upload as the primary path.
- Present upload as a cost-intake action, not accounting admin.
- Emphasize the user outcome: updated ingredient costs and margin alerts.
- Browser file input with camera capture is acceptable for the first launch-quality version.

### Invoice Review View

- Review screen must not depend on desktop tables.
- On mobile, invoice lines should render as responsive line cards.
- Each line should show raw product name, parsed quantity or unit, parsed price, matched ingredient, and confidence.
- Problem rows must be visually highlighted.
- Confidence must be visible but not overly technical.
- Unresolved rows must be obvious on small screens.
- Touch targets for confirm, ignore, and ingredient selection must be large enough for thumb use.
- Main user actions:
  - confirm supplier
  - confirm invoice date
  - confirm or correct parsed rows
  - confirm ingredient matches
  - save cost updates

Primary CTA rule:

- the confirm CTA must stay visually obvious
- unresolved-line count must stay clear
- the user must understand that no cost changes happen before confirmation

### Price Change Alerts View

- Show ingredient-level price movement first.
- Show affected dishes and estimated impact without pushing the user into bookkeeping detail.
- Allow quick drill-down from alert to affected dish and updated cost reason.

## Copy Rules

- Use operational language, not finance jargon where avoidable.
- Say "Raise price by 1 EUR" instead of "Optimize pricing strategy."
- Say "3 ingredient costs updated" instead of "invoice synchronization complete."
- Keep recommendation text short and imperative.
- Always explain consequences in euros or percent where possible.

## Post-Confirmation Summary

After invoice confirmation, show an immediate summary:

- ingredients updated
- price changes detected
- dishes affected
- top actions

## Mobile Validation Requirements

Before founding partner launch, the product should pass:

- mobile viewport smoke test
- invoice upload flow on mobile viewport
- invoice review card layout test
- simulator mobile layout test
- dashboard mobile layout test
- app shell navigation mobile smoke test
- EE/EN and theme persistence smoke test

## Language Requirements

- Provide an EE/EN selector in the app shell.
- Persist language choice locally.
- Translate key navigation and primary action labels before broad copy translation.
- Do not block feature delivery on complete translation coverage, but avoid scattering future-incompatible hardcoded copy.

## Premium Feel Requirements

- Strong panel hierarchy
- Subtle glow or edge lighting around critical status elements
- Sharp typography rhythm
- Dense but controlled data layout
- Meaningful micro-animation only on state change, not everywhere

## Forbidden Anti-Patterns

- Plain white dashboard
- default Tailwind-looking card grid
- demo-first cockpit as the main application shell
- synthetic/demo validation labels in primary work views
- decorative status words such as "idle" or "operative"
- "AI-powered" or "magic" claims in product screens
- spreadsheet-first layout
- OCR results saved directly without a human review step
- giant empty hero sections inside product UI
- decorative charts with no decision value
- all-gray status treatment
- buried recommendation logic
- forms with excessive fields on one screen
- long setup wizard before the user sees any value
