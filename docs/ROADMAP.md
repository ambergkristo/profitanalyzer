# Roadmap

## RM0 - Validation Before Product

### Goal

Prove that owners care enough about dish-level profit decisions to pay for an audit or pilot.

### Scope

- customer interviews
- manual audit workflow
- pricing test
- clickable or spreadsheet-backed demo

### Exit Criteria

- 15 qualified interviews completed
- 5 restaurants agree to receive an audit or demo
- at least 2 say they would pay after seeing output

### Validation Check

Manual check: interview notes and audit outcomes documented, with clear yes/no buying signals.

## RM1 - Core Engine + Manual Data Entry

### Goal

Build a trustworthy dish costing and margin engine.

### Scope

- ingredients
- recipes
- dishes
- yield-aware costing
- margin formulas

### Exit Criteria

- dish cost and margin calculations are reproducible and traceable
- sample data set covers at least 10 dishes
- incorrect inputs are surfaced clearly

### Validation Check

Manual check: create a dish from ingredients and verify the displayed cost matches a hand calculation.

## RM2 - Dashboard + Action Layer

### Goal

Turn raw calculations into obvious owner-facing decisions.

### Scope

- KPI cards
- top actions panel
- dish status table
- margin status labels

### Exit Criteria

- dashboard highlights the top problem dishes without opening detail views
- each flagged dish includes recommendation, impact, and confidence

### Validation Check

Manual check: with seeded data, a user can identify the worst margin issue in under 30 seconds.

## RM3 - Dish Detail + Cost Breakdown

### Goal

Make every margin result explainable.

### Scope

- dish detail page
- ingredient line-item cost breakdown
- yield and assumption display

### Exit Criteria

- user can see why a dish is flagged
- user can identify the major cost driver for a dish

### Validation Check

Manual check: open a flagged dish and explain the result without external notes.

## RM4 - Price Simulator

### Goal

Show the business effect of changing price or cost assumptions.

### Scope

- price simulation input
- recalculated margin
- profit delta output
- before/after comparison

### Exit Criteria

- user can test at least one price change and see immediate effect
- delta is shown in both percent and euros

### Validation Check

Manual check: simulate a 1 EUR price increase and confirm updated margin and profit delta render instantly.

## RM5 - First Customer Ready UX

### Goal

Make the product credible enough for real pilot use.

### Scope

- mobile usability fixes
- empty states
- onboarding clarity
- premium dashboard polish

### Exit Criteria

- first demo can be run on laptop and phone
- product no longer feels like a spreadsheet wrapper

### Validation Check

Manual check: complete the demo flow on mobile without horizontal table dependency.

## RM6 - Pilot Readiness

### Goal

Prepare for first live restaurant usage.

### Scope

- account setup flow
- CSV import for menu data
- stale data warnings
- basic support/admin tooling

### Exit Criteria

- pilot customer can enter or import enough data to get value
- stale or incomplete data does not silently produce misleading advice

### Validation Check

Manual check: onboard one pilot menu end to end and produce at least one credible recommendation.

## RM7 - Invoice Scan Cost Intake

### Goal

Turn supplier invoices into confirmed ingredient cost updates and price-change alerts.

This milestone belongs to V2 build-driven validation and depends on a stable core calculation engine, dashboard, and dish detail flow. It extends the core. It does not replace RM1-RM6 foundations.

### Scope

- Supplier model
- Purchase invoice model
- Invoice line model
- Cost history model
- Mock parser or structured parser interface
- Upload, review, and confirm flow
- Ingredient matching suggestions
- Price-change alert generation
- Affected dish margin recalculation

### Exit Criteria

- User can upload or submit a sample invoice image or mocked parsed invoice
- System shows parsed invoice review screen
- User can confirm or correct lines
- Confirmed lines create ingredient cost history
- Current ingredient cost updates only after confirmation
- Price-change alerts are created
- Dashboard shows affected dishes

### Validation Check

Manual check: upload a sample invoice image or mocked parsed invoice, confirm the rows, verify ingredient cost history is created, and confirm the dashboard shows price-change alerts with affected dishes.
