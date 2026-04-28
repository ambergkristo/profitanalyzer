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
6. Choose `Photo/OCR Upload` and use `clean-invoice-photo.jpg`.
7. Show the OCR draft status and explain that nothing updates until confirmation.
8. Confirm the invoice, then open the generated alert or affected dish.
9. Show the cost driver panel, ingredient breakdown, and cost history.
10. Use the price simulator with a quick action or target-margin action.
11. Return to the dashboard and point out the new supplier price alert state.
12. Switch back to `Photo/OCR Upload` and use `blurry-invoice-photo.jpg` to prove the safety gate blocks weak OCR.
13. Switch to `High Margin Bistro` to prove the engine does not invent false urgency.

## Current Strengths

- Scenario-aware dashboard with owner-facing diagnosis.
- Ranked actions with severity, confidence, reason codes, and impact.
- Dish detail explains why a dish is risky or profitable.
- Cost driver highlighting is visible and concrete.
- Simulator uses backend calculations only.
- Synthetic validation is deterministic and runnable by command.
- Invoice cost intake shows review-confirm, cost history, alerts, and affected dishes without fake OCR.
- OCR upload now exists as a safe draft-intake adapter and reuses the same review-confirm workflow.

## Current Limitations

- Demo data is synthetic, not customer-observed.
- Demand elasticity is not modeled.
- Price recommendations are heuristic.
- Scenario mode is for demo and validation only, not tenancy.
- OCR mode is fixture-backed and does not prove real provider accuracy.

## What Not To Claim Yet

- Do not claim live external OCR provider support yet.
- Do not claim OCR accuracy from the fixture adapter.
- Do not claim POS or accounting integrations.
- Do not claim inventory management.
- Do not claim real-world willingness to pay validation.
