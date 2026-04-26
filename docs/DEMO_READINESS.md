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
5. Open the linked dish detail page.
6. Show the cost driver panel and ingredient breakdown.
7. Use the price simulator with a quick action or target-margin action.
8. Return to the dashboard and switch to `High Margin Bistro` to prove the engine does not invent false urgency.

## Current Strengths

- Scenario-aware dashboard with owner-facing diagnosis.
- Ranked actions with severity, confidence, reason codes, and impact.
- Dish detail explains why a dish is risky or profitable.
- Cost driver highlighting is visible and concrete.
- Simulator uses backend calculations only.
- Synthetic validation is deterministic and runnable by command.

## Current Limitations

- Demo data is synthetic, not customer-observed.
- Demand elasticity is not modeled.
- Price recommendations are heuristic.
- Scenario mode is for demo and validation only, not tenancy.
- No invoice cost intake is implemented yet.

## What Not To Claim Yet

- Do not claim live invoice ingestion.
- Do not claim OCR accuracy.
- Do not claim POS or accounting integrations.
- Do not claim inventory management.
- Do not claim real-world willingness to pay validation.
