# RM7 Preflight

Sprint 5 note: the first RM7 slice is now implemented in demo mode. This document now serves as both the original readiness brief and the boundary for what still remains before RM7 can be considered fully closed.

## Why RM7 Comes Next

The deterministic menu decision layer is now in place:

- RM1-RM5 are complete.
- RM6 is closed around demo readiness and decision-first UX.
- Synthetic validation proves the engine behaves logically across multiple restaurant profiles.

The next commercially meaningful step is turning confirmed supplier cost changes into updated ingredient costs, affected-dish visibility, and price-change alerts.

## RM7 Starting Rule

RM7 may start only if:

- RM1-RM5 are complete.
- RM6 demo-readiness is acceptable.
- `npm run validate:synthetic` passes.
- The simulator works end to end.
- The action engine can show affected dish impact clearly.

## What Existed Before RM7 Started

- Stable ingredient, recipe, dish, action, and simulation domain types.
- Deterministic cost and margin calculations.
- Scenario validation coverage for action ranking.
- Dashboard, dish detail, and simulator flow that already explain impact.
- Owner-friendly error states for incomplete or imperfect data.

## Data Model Dependencies

RM7 will need:

- `Supplier`
- `PurchaseInvoice`
- `PurchaseInvoiceLine`
- `IngredientCostHistory`
- `SupplierProductMatch` or equivalent supplier-product match concept

Current readiness:

- `Ingredient`, `Recipe`, and `Dish` were stable enough to reference from cost history.
- Sprint 5 adds `Supplier`, `PurchaseInvoice`, `PurchaseInvoiceLine`, `IngredientCostHistory`, `SupplierProductMatch`, and `PriceChangeAlert`.

## API Dependencies

RM7 will need API support for:

- invoice draft creation from mocked structured input
- invoice review fetch and update
- line-item ingredient match suggestions
- confirmation endpoint
- affected dish summary after confirmation

Current readiness:

- Existing analytics and simulation endpoints already provided the downstream impact view RM7 needed after costs change.
- Sprint 5 adds mock invoice parsing, invoice fetch, review-confirm, supplier list, alert list, and ingredient cost history endpoints.

## UI Dependencies

RM7 will need:

- mocked invoice intake entry point
- parsed invoice draft review screen
- confirm flow
- post-confirmation affected-dish summary

Current readiness:

- The dashboard and dish detail already presented the destination state RM7 should influence.
- Sprint 5 adds the `/invoices` cost-intake route, review UI, confirmation summary, and alert preview.

## Cost-History Dependency

RM7 must introduce `IngredientCostHistory` before any confirmed supplier update changes the current ingredient cost.

Requirements:

- every confirmed cost change must be traceable
- current ingredient cost should update only after confirmation
- history must be stored before recalculating affected dishes

## Alert Dependency

RM7 must add a price-change alert layer after confirmed cost updates.

The alert system should surface:

- ingredients with significant cost movement
- dishes exposed by the cost change
- candidate price or cost-reduction actions

## What RM7 Implemented First

- mock invoice input
- parsed invoice draft
- review screen
- confirm flow
- `IngredientCostHistory`
- current ingredient cost update on confirmation
- price-change alerts
- affected dish impact summary

## What RM7 Must Not Implement Yet

- real OCR
- image upload capture
- automated blind import
- accounting features
- inventory features
- supplier API integrations

## Remaining RM7 Gaps

- manual invoice entry beyond canned samples
- richer line-edit ergonomics for operators processing larger invoices
- broader dashboard action integration for invoice-driven alerts
- persistence beyond in-memory demo state

## Commercial Honesty

RM7 can prove that confirmed supplier cost changes flow into the decision engine.

RM7 will not prove:

- OCR quality
- supplier document variance handling at scale
- accounting-system parity
- inventory accuracy
- operational adoption without manual review
