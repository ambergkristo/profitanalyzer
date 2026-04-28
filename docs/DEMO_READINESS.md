# Demo Readiness

## How To Run The Demo

```bash
npm install
npm run dev
```

Then open:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`

## Recommended Starting Scenario

Start with `Low Margin Kitchen`.

Reason:

- It shows the product promise fastest.
- The dashboard immediately surfaces clear high-priority actions.
- Dish detail and simulator make the value proposition obvious without extra explanation.

## Suggested Demo Flow

1. Open the dashboard.
2. Point out the scenario selector in the header.
3. Select `Low Margin Kitchen`.
4. Show the top action card and explain why it is ranked first.
5. Open `Cost Intake`.
6. Parse `Prime Butchery Co`.
7. Show the flagged line, then confirm the invoice.
8. Open the generated alert or affected dish.
9. Show the cost driver panel and ingredient breakdown.
10. Use the price simulator with a quick action or target-margin action.
11. Return to the dashboard and point out the new supplier price alert state.
12. Switch to `High Margin Bistro` to prove the engine does not invent false urgency.

## Current Strengths

- Scenario-aware dashboard with owner-facing diagnosis.
- Ranked actions with severity, confidence, reason codes, and impact.
- Dish detail explains why a dish is risky or profitable.
- Cost driver highlighting is visible and concrete.
- Simulator uses backend calculations only.
- Synthetic validation is deterministic and runnable by command.
- Invoice cost intake shows review-confirm, cost history, alerts, and affected dishes without fake OCR.

## Current Limitations

- Demo data is synthetic, not customer-observed.
- Demand elasticity is not modeled.
- Price recommendations are heuristic.
- Scenario mode is for demo and validation only, not tenancy.
- Invoice intake still uses canned structured samples rather than manual entry or OCR.

## What Not To Claim Yet

- Do not claim live invoice ingestion from photos or PDFs yet.
- Do not claim OCR accuracy.
- Do not claim POS or accounting integrations.
- Do not claim inventory management.
- Do not claim real-world willingness to pay validation.
