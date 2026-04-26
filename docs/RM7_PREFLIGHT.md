# RM7 Preflight

## Why RM7 Comes Next

The deterministic menu decision layer is now in place:

- RM1-RM5 are complete.
- RM6 is being closed around demo readiness and decision-first UX.
- Synthetic validation proves the engine behaves logically across multiple restaurant profiles.

The next commercially meaningful step is turning confirmed supplier cost changes into updated ingredient costs, affected-dish visibility, and price-change alerts.

## RM7 Starting Rule

RM7 may start only if:

- RM1-RM5 are complete.
- RM6 demo-readiness is acceptable.
- `npm run validate:synthetic` passes.
- The simulator works end to end.
- The action engine can show affected dish impact clearly.

## What Must Exist Before RM7 Starts

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
- `IngredientAlias` or equivalent supplier-product match concept

Current readiness:

- `Ingredient`, `Recipe`, and `Dish` are already stable enough to reference from cost history.
- The current model does not yet track historical ingredient costs, invoice provenance, or confirmation state.

## API Dependencies

RM7 will need API support for:

- invoice draft creation from mocked structured input
- invoice review fetch and update
- line-item ingredient match suggestions
- confirmation endpoint
- affected dish summary after confirmation

Current readiness:

- Existing analytics and simulation endpoints already provide the downstream impact view RM7 will need after costs change.

## UI Dependencies

RM7 will need:

- mocked invoice intake entry point
- parsed invoice draft review screen
- confirm flow
- post-confirmation affected-dish summary

Current readiness:

- The dashboard and dish detail already present the destination state RM7 should influence.
- No invoice UI, upload UI, or parser UI should be started before RM7 begins officially.

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

## What RM7 Will Implement First

- mock invoice input
- parsed invoice draft
- review screen
- confirm flow
- `IngredientCostHistory`
- current ingredient cost update on confirmation
- price-change alerts

## What RM7 Must Not Implement Yet

- real OCR
- automated blind import
- accounting features
- inventory features
- supplier API integrations

## Commercial Honesty

RM7 can prove that confirmed supplier cost changes flow into the decision engine.

RM7 will not prove:

- OCR quality
- supplier document variance handling at scale
- accounting-system parity
- inventory accuracy
- operational adoption without manual review
