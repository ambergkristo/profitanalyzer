# Product Core Validation

## Scope Covered

Implemented:

- RM1: Core Engine + Basic UI
- RM2: Dashboard + Core Insights
- RM3: Dish Detail + Cost Breakdown
- RM4: Price Simulator
- RM5: Synthetic Restaurant Validation
- RM6: Premium decision-first UX polish
- RM7 first slice: mock invoice cost intake, review-confirm, cost history, and price alerts

Not started:

- RM8 OCR or vision adapter
- RM9 pilot packaging

## RM5 Validation Approach

Synthetic validation uses three canonical restaurant datasets:

- `mixed-restaurant`
- `low-margin-kitchen`
- `high-margin-bistro`

Each dataset runs through the same deterministic calculation engine, action ranking, overview metrics, and simulator logic. Validation is executable with `npm run validate:synthetic`.

The validation runner writes deterministic outputs to:

- `reports/synthetic-validation-report.json`
- `reports/synthetic-validation-report.md`

## What Synthetic Validation Proves

- The decision engine behaves consistently across distinct restaurant profiles.
- The ranking logic is deterministic.
- High-risk datasets produce more repair actions than healthy datasets.
- Actions contain reason codes and confidence.
- Missing data produces warnings instead of crashes.
- Weighted margin, revenue, cost, and profit calculations remain finite.

## What Synthetic Validation Does Not Prove

- Willingness to pay
- Retention
- Real supplier invoice quality
- OCR quality
- Real onboarding effort
- Real restaurant data hygiene
- Operational behavior under live integrations

Synthetic validation proves logic quality. It does not prove commercial demand or deployment readiness.

## Sprint 4 Demo-Readiness Note

Sprint 4 closes the demo-readiness gate for the synthetic product demo:

- scenario switching is stable and URL-driven
- dashboard, dishes, and dish detail share a more consistent premium visual system
- cost-driver and simulator outputs are legible without operator coaching
- demo narrative metadata is exposed from the dataset layer into the UI

This is enough to run a credible synthetic-data product demo.

It is still not evidence of:

- real invoice ingestion quality
- customer onboarding speed
- retention
- live commercial adoption

## Pass Criteria

- Every canonical dataset returns a passing validation report.
- Every dataset produces at least 3 actions.
- Low-margin dataset produces at least 2 high or critical actions.
- High-margin dataset is not dominated by critical actions.
- Mixed dataset produces at least 3 action types.
- No action output contains `NaN` or `Infinity`.
- No calculated dish output contains `NaN` or `Infinity`.
- Reports are deterministic across repeated runs.

## Fail Criteria

- Any canonical dataset produces a failing validation report.
- Any action is missing reason codes or confidence.
- Weighted margin is not calculable while revenue exists.
- Missing data crashes the engine instead of producing warnings.

## Current Known Limitations

- Validation is synthetic, not production-observed.
- Scenario switching is demo-mode only and not multi-tenant.
- Simulator still assumes static sales volume and does not model demand elasticity.
- Price recommendations remain heuristic and do not account for local market pricing psychology.
- `npm audit` still reports 5 moderate vulnerabilities in the transitive Vite/Vitest/esbuild chain; safe remediation requires a breaking forced upgrade.

## Sprint 5 Invoice Note

Sprint 5 adds the safe RM7 foundation:

- mock invoice parsing is deterministic
- invoice lines are reviewed before any current ingredient cost changes
- confirmed lines create `IngredientCostHistory`
- supplier price changes create alerts and affected-dish impact
- dashboard and invoice UI can surface those alerts in demo mode

This is enough to prove review-confirm logic quality on synthetic data.

It is still not evidence of:

- OCR quality
- supplier document variance at scale
- real onboarding speed
- accounting or inventory interoperability

## Next Readiness Gate Before RM8

Before OCR or image ingestion starts:

- RM5 must keep passing in CI or local validation.
- RM6 needs to remain demo-ready across dashboard, dishes, detail, and simulator flow.
- RM7 review-confirm flow must remain stable across sample invoices.
- Product copy should clearly explain actions without operator coaching.
- Error states should remain owner-friendly.
- The deterministic engine should remain the single source of truth for price and margin outcomes.
