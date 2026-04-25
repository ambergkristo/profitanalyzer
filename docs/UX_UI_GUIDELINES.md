# UX and UI Guidelines

## Design Intent

The product should feel like a premium decision console, not office software. The mood is closer to a trading terminal or F1 telemetry panel than a generic SaaS admin.

Design objective: compress complex margin data into fast, confident actions.

## Core UX Principles

- Action first, data second
- Three-click decision path
- No Excel feel
- Mobile usable
- Premium dashboard atmosphere
- Signal-rich but not cluttered
- Every warning must lead to a next action

## Visual Direction

- Dark mode is the default and primary design surface.
- Surfaces should feel layered and instrument-like.
- KPI numbers should be visually dominant.
- Color is for status and urgency, not decoration.
- Charts should support decisions, not fill empty space.

## Color System

- Background: `#0b0b0f`
- Panel: `#16161c`
- Panel border: `#24242d`
- Profit green: `#00ff7b`
- Warning yellow: `#ffd400`
- Danger red: `#ff2e2e`
- Accent cyan: `#38d9ff`
- Text primary: `#eaeaf0`
- Text secondary: `#9aa0a6`
- Muted grid/lines: `#2b2f36`

Usage rules:

- Use green for strong margin and positive delta.
- Use yellow for caution and watchlist states.
- Use red for low-margin or loss states.
- Do not overload the UI with five different accent colors.
- Avoid gradients that reduce numeric readability.

## Typography

- Heading direction: Orbitron or Rajdhani style
- Body direction: Inter or clean system sans
- KPI numerics: bold, compact, high contrast
- Status labels: uppercase or semi-condensed styling where appropriate

Rules:

- Headings should feel deliberate and technical, not playful.
- Numbers need stronger hierarchy than labels.
- Avoid long paragraphs in panels.

## Layout Rules

### Dashboard

- Top row reserved for KPIs and main action signal
- Main content split into:
  - priority actions
  - dish status table
  - compact trend or scenario panel
- Keep the primary recommendation above the fold on desktop and mobile

### Dish Table

- Prioritize status, margin, profit contribution, and action
- Avoid dense spreadsheet grids
- Collapse secondary metadata behind row expansion or detail view

### Dish Detail

- Start with verdict and recommendation
- Then show cost breakdown
- Then show assumptions and calculation notes

### Mobile

- Use stacked cards over wide tables where possible
- Preserve decision signal before detailed line items
- Critical actions must be reachable with one thumb

## Core Components

- KPI card
- Recommendation card
- Status badge
- Dish list row/card
- Ingredient breakdown list
- Margin meter
- Scenario simulator panel
- Empty state with guided next action
- Import or manual-entry stepper

## Interaction Rules

- Any flagged dish must expose why it is flagged.
- Any recommendation must show estimated impact and confidence.
- Any simulation change must update outputs immediately.
- Use progressive disclosure for formula detail.
- Use hover states on desktop, but never rely on hover for core meaning.
- Use confirmation only for destructive actions, not for routine data edits.

## Copy Rules

- Use operational language, not finance jargon where avoidable.
- Say "Raise price by 1 EUR" instead of "Optimize pricing strategy."
- Keep recommendation text short and imperative.
- Always explain consequences in euros or percent where possible.

## Premium Feel Requirements

- Strong panel hierarchy
- Subtle glow or edge lighting around critical status elements
- Sharp typography rhythm
- Dense but controlled data layout
- Meaningful micro-animation only on state change, not everywhere

## Forbidden Anti-Patterns

- Plain white dashboard
- default Tailwind-looking card grid
- spreadsheet-first layout
- giant empty hero sections inside product UI
- decorative charts with no decision value
- all-gray status treatment
- buried recommendation logic
- forms with excessive fields on one screen
- long setup wizard before the user sees any value

