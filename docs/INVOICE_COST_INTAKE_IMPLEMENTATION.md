# Invoice Cost Intake Implementation

## What Was Built

Sprint 5 adds the first RM7 product slice:

- canonical mock invoice samples
- deterministic mock invoice parser
- review-confirm API workflow
- `/invoices` frontend route
- ingredient cost history records
- supplier product match creation and refresh
- supplier price-change alerts
- affected dish impact summary

The workflow is intentionally review-first. Parsed invoice lines do not update current ingredient costs until the user confirms them.

## Mock Parser Architecture

The mock parser lives in `packages/core/src/invoices.ts`.

It:

- resolves supplier suggestions from normalized names
- derives missing unit price from line total and quantity when possible
- resolves ingredient matches from confirmed supplier aliases first
- falls back to deterministic token-overlap matching
- assigns confidence
- raises warnings for unresolved matches or unit mismatch
- produces a structured `ParsedInvoiceDraft`

This keeps RM7 deterministic and testable before any OCR variance enters the system.

## Review-Confirm Rules

- Only `confirmed` lines with a resolved `matchedIngredientId` can update costs.
- `ignored` lines never change ingredient cost or cost history.
- `needs_review` lines block confirmation.
- Current `Ingredient.costPerUnitCents` updates only after confirmation.
- Repeated confirmation of the same invoice is blocked.
- Unit mismatch remains a review problem until the user changes the line or ignores it.

## Cost History Model

`IngredientCostHistory` stores:

- ingredient id
- supplier id
- invoice line id
- previous cost per unit
- new cost per unit
- unit
- effective date
- created timestamp

This is the historical record. Current ingredient cost remains the latest effective value in the in-memory dataset session.

## Alert Thresholds

The confirmation engine currently emits:

- `ingredient_price_up`
- `ingredient_price_down`
- `dish_margin_at_risk_due_to_cost_change`

Threshold rules:

- price increase `>= 5%` creates an up alert
- price decrease `<= -5%` creates a down alert
- strong cost rises affecting at-risk dishes create dish-margin alerts
- severity escalates for large increases, high-sales dishes, or dishes that fall into loss

Affected dishes are recalculated by finding recipes that use the updated ingredient and comparing old vs new dish metrics.

## Known Limitations

- Uses canned sample invoices only
- No manual invoice entry flow yet
- No photo upload yet
- No OCR yet
- No persistence beyond in-memory demo state
- No supplier API sync
- Invoice-driven alerts are shown on the dashboard, but not yet merged deeply into the ranked action engine

## Why OCR Is Deferred To RM8

RM7 had to prove the safe part first:

- the parser output shape
- the human review step
- the confirmation boundary
- cost history creation
- downstream margin impact

Adding OCR before this review-confirm workflow existed would have created fake automation risk. RM8 can now plug image parsing into an already-safe confirmation pipeline instead of inventing one later.
