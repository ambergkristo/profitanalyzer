# Product Core Validation

## Scope Covered

Implemented:

- RM1: Core Engine + Basic UI
- RM2: Dashboard + Core Insights
- RM3: Dish Detail + Cost Breakdown
- RM4: Price Simulator
- RM5: Synthetic Restaurant Validation
- RM6: Premium decision-first UX polish
- RM7: structured invoice cost intake, review-confirm, cost history, supplier alerts, and invoice-driven actions
- RM8: OCR adapter boundary, fixture upload intake, and validation safety gate

Not started:

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
- real OCR provider accuracy
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

## Sprint 6 RM7 Validation Note

Sprint 6 closes RM7 as a deterministic product workflow:

- sample invoice parsing still works
- manual structured invoice entry goes through the same review-confirm boundary
- confirmed lines create cost history and supplier product matches
- supplier price alerts are visible in the dashboard, invoices flow, and dedicated alerts view
- invoice-driven alerts now influence ranked dashboard actions
- `npm run validate:invoice` verifies manual drafts, unresolved-line blocking, confirmation, action integration, and idempotency

This proves the product can safely convert structured supplier cost inputs into decision output on synthetic data.

It still does not prove:

- real invoice OCR quality
- real supplier document variance at scale
- real onboarding friction
- willingness to pay

## Sprint 7 RM8 Adapter Note

Sprint 7 starts RM8 without weakening the RM7 safety model:

- upload intake creates OCR drafts only
- fixture OCR output is normalized into the same review-confirm flow
- low-confidence OCR lines stay blocked until resolved or ignored
- confirmed OCR drafts create the same cost history, alerts, and invoice-driven actions as other invoice sources
- `npm run validate:ocr` proves adapter safety and downstream integration

This proves the OCR boundary is safe and reusable.

It does not prove:

- real OCR accuracy
- real supplier-format variance
- real document upload behavior in production
- real onboarding friction

## Sprint 8 RM8 Closeout Note

Sprint 8 closes RM8 at the architecture and workflow-safety level:

- provider registry keeps fixture OCR as the default path
- external provider readiness exists as an env-driven seam and stays disabled when unconfigured
- OCR quality reports are evaluated before draft review
- upload validation is enforced for provider, dataset, mime type, and file size
- OCR jobs are observable through API and UI
- `npm run validate:ocr` proves pre-confirm OCR does not mutate current ingredient costs
- post-confirm OCR drafts still create cost history, alerts, and invoice-driven actions through the same RM7 confirmation boundary

This proves workflow safety and adapter readiness.

It still does not prove:

- real external OCR provider accuracy
- real supplier invoice-format variance at scale
- provider latency, uptime, or cost
- production storage or retention behavior
- camera UX

## Next Readiness Gate Before RM9

Before pilot packaging starts:

- RM5 must keep passing in CI or local validation.
- RM6 must remain demo-ready across dashboard, dishes, detail, simulator, and invoice flow.
- RM7 review-confirm flow must remain stable across sample, manual, and OCR drafts.
- RM8 provider registry and quality gate must keep OCR on the draft-only side of the safety boundary.
- Product copy should clearly explain OCR as a starting point rather than a source of truth.
- Error states should remain owner-friendly.
- The deterministic engine should remain the single source of truth for price and margin outcomes.
