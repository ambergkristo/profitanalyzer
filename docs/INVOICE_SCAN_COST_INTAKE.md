# Invoice Scan Cost Intake

## Summary

Invoice Scan / Supplier Cost Intake is a V2 build-driven validation feature that turns supplier invoice photos into confirmed ingredient cost updates and price-change alerts.

It is not a full accounting workflow.
It is not blind OCR import.
It is not supplier API integration.

The feature exists to solve stale input cost data and connect supplier price changes to dish margin impact.

## Product Rationale

The current biggest product risk is weak cost freshness:

- operators do not update ingredient costs consistently
- supplier prices move before menu decisions catch up
- margin alerts lose credibility if cost inputs are stale

Invoice Scan / Supplier Cost Intake improves the product in four ways:

1. reduces stale or missing input cost data
2. creates a recurring usage trigger
3. strengthens the decision-layer positioning
4. makes price-change alerts credible because they come from real supplier documents

The value is not OCR itself. The value is converting supplier invoices into confirmed ingredient cost changes and actionable dish-level alerts.

## User Flow

1. User takes a phone photo of a supplier invoice.
2. User uploads the image to the app.
3. System creates a structured intermediate invoice record.
4. System detects supplier and invoice date when possible.
5. System parses invoice lines into draft rows.
6. System suggests ingredient matches for parsed rows.
7. User reviews and corrects supplier, invoice date, parsed fields, and matches.
8. User confirms the invoice.
9. System writes ingredient cost history from confirmed lines only.
10. System updates current ingredient cost from confirmed lines only.
11. System generates price-change alerts and affected dish impact.
12. User sees immediate summary and top actions.

## Data Model

### Supplier

- `id`
- `restaurant_id`
- `name`

### PurchaseInvoice

- `id`
- `restaurant_id`
- `supplier_id`
- `invoice_date`
- `invoice_number`
- `source_image_url`
- `parse_status`
- `total_amount_cents`
- `created_at`

### PurchaseInvoiceLine

- `id`
- `invoice_id`
- `raw_product_name`
- `parsed_quantity`
- `parsed_unit`
- `parsed_unit_price_cents`
- `parsed_line_total_cents`
- `matched_ingredient_id`
- `match_confidence`
- `review_status`

### IngredientCostHistory

- `id`
- `ingredient_id`
- `supplier_id`
- `invoice_line_id`
- `cost_per_unit_cents`
- `unit`
- `effective_date`
- `created_at`

### SupplierProductMatch

- `id`
- `restaurant_id`
- `supplier_id`
- `raw_product_name`
- `ingredient_id`
- `confidence`
- `last_confirmed_at`

### Cost Truth Rules

- `Ingredient.cost_per_unit_cents` remains the current effective cost used in live calculations.
- `IngredientCostHistory` stores historical truth.
- Current ingredient cost is updated only by confirmed invoice lines.
- Raw OCR or vision output must never overwrite ingredient cost directly.

## Backend Services

- invoice ingestion service
- document parse service
- invoice review service
- ingredient matching service
- cost update service
- price change alert service

## API Draft

- `POST /invoices/upload`
- `GET /invoices/:id`
- `POST /invoices/:id/review-confirm`
- `GET /alerts/price-changes`
- `GET /ingredients/:id/cost-history`

### Architecture Rule

Parsing must create a structured intermediate invoice record.

Parsing must not directly update ingredients.

`POST /invoices/:id/review-confirm` is the only place where:

- ingredient current cost is written
- ingredient cost history is written
- price-change alerts are created from confirmed lines

## OCR and Vision Assumptions

First version assumptions:

- input is a phone photo upload
- parser may be mocked or structured-parser-backed during build-driven validation
- parser should attempt to detect:
  - supplier
  - invoice date
  - product name
  - quantity
  - unit
  - unit price or line total

Confidence must be tracked.
Low-confidence output must route to review, not direct write.

## Confirm-Screen Rules

Confirm screen is mandatory.

The user must be able to:

- confirm supplier
- confirm invoice date
- confirm or correct parsed rows
- confirm ingredient matches
- save cost updates

No ingredient current cost update happens before confirm.

Problem rows should be clearly visible.

Review status should distinguish:

- ready to confirm
- needs correction
- unmatched

## Ingredient Matching Logic

Matching levels:

1. high confidence exact or known supplier-product match
2. medium confidence suggested ingredient candidates
3. low confidence unmatched row requiring manual selection

Matching inputs:

- raw product name
- supplier
- known alias or match history
- unit compatibility

Confirmed mappings should strengthen future matching through `SupplierProductMatch`.

## Alerting Logic

Alert types:

- `ingredient_price_up`
- `ingredient_price_down`
- `dish_margin_at_risk_due_to_cost_change`

Alert payload should include:

- alert type
- affected ingredient
- previous cost
- new cost
- delta percent
- affected dishes
- estimated margin impact
- recommended action
- confidence

Priority should increase when:

- the ingredient change affects high-sales dishes
- the new cost pushes dish margin below warning or loss threshold

## UX Requirements

Views:

- Upload Invoice
- Invoice Review
- Price Change Alerts

UX principles:

- table-like but not Excel-like review
- confidence visible but not overly technical
- corrected rows should feel fast and operational
- after confirm, user must see:
  - ingredients updated
  - price changes detected
  - dishes affected
  - top actions

## Test Plan

### Parsing

- parse sample invoice into structured draft record
- detect supplier and invoice date when present
- parse line items with product name, quantity, unit, and price fields

### Review and Confirm

- user can correct supplier and invoice date
- user can correct parsed rows
- user can confirm ingredient matches
- unconfirmed rows do not update ingredient cost

### Cost Updates

- confirmed invoice lines create ingredient cost history
- current ingredient cost updates only after confirmation
- cost history remains traceable to invoice line and supplier

### Alerts

- price increase creates `ingredient_price_up`
- price decrease creates `ingredient_price_down`
- dish margin risk alert appears when confirmed ingredient cost increase pushes margin below threshold

### Impact

- affected dishes recalculate after confirmed cost updates
- dashboard shows affected dishes and top actions

## Non-Goals

- accounting software
- bookkeeping workflow
- full invoice management product
- blind auto-import from OCR
- inventory management replacement
- supplier API integration in first version

## Risks

- bad OCR or vision output
- inconsistent units across invoices
- supplier naming variation
- invoice formats differ widely
- overtrust in automation
- feature drift toward accounting tooling

## Acceptance Criteria

- user can upload a supplier invoice image or mocked parsed invoice
- system creates a structured intermediate invoice record
- system shows review screen before save
- ingredient current cost updates only after confirmation
- confirmed lines create ingredient cost history
- price-change alerts are generated
- affected dish margin impact is visible
- product remains positioned as profit optimization, not accounting

## Implementation Caution

Do not start building OCR integration until the repo already has a stable core calculation engine, dashboard, and dish detail flow.

This phase is documentation and product architecture alignment only.
