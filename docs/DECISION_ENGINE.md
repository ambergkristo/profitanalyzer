# Decision Engine

## Purpose

The MVP decision engine converts margin and sales data into clear next-step recommendations. It must be simple enough to explain and strict enough to avoid vague advice.

## MVP Design Choice

Use deterministic rules, not machine learning.

Reason:

- easier to validate
- easier to debug
- easier to explain to customers
- safer with small, messy data sets

## Inputs

- dish price
- calculated dish cost
- margin percent
- margin amount
- sales volume
- profit estimate
- optional recent ingredient cost change
- confirmed ingredient cost history when available

## Core Thresholds

Initial threshold proposal:

- `margin < 50%` -> warning
- `margin < 30%` -> loss

These thresholds are starting heuristics, not universal truths. Margin expectations vary by concept, category, beverage mix, labor model, and local market.

## Rule Set v1

### Rule 1: Low Margin Warning

Condition:

- margin percent below 50%

Output:

- status: warning
- action: review price and recipe cost
- confidence: medium

### Rule 2: Severe Margin Risk

Condition:

- margin percent below 30%

Output:

- status: loss
- action: raise price, reduce cost, or remove item
- confidence: high

### Rule 3: High Sales + Low Margin

Condition:

- sales volume above restaurant median
- margin below warning threshold

Output:

- action: test price increase
- expected impact: margin amount delta times sales volume
- confidence: high

### Rule 4: Low Sales + High Margin

Condition:

- sales volume below restaurant median
- margin above target threshold

Output:

- action: promote item or improve placement
- confidence: medium

### Rule 5: Ingredient Cost Spike

Condition:

- recent ingredient cost increase materially changes dish cost

Output:

- action: review affected dishes now
- confidence: medium

## Recommendation Output Format

Each recommendation should include:

- `action`
- `reasoning`
- `expected_impact_eur`
- `confidence`

V2 price-change alert output should include:

- `alert_type`
- `affected_ingredient`
- `previous_cost`
- `new_cost`
- `delta_percent`
- `affected_dishes`
- `estimated_margin_impact`
- `recommended_action`
- `confidence`

Example:

- action: Raise burger price by 1 EUR
- reasoning: High sales volume and margin below target after ingredient cost increase
- expected impact: 420 EUR per month
- confidence: high

## Ranking Logic

Recommendations should be ranked by:

1. severity of status
2. expected impact
3. confidence

This keeps the dashboard focused on what matters first.

## Explainability Requirement

The user must always be able to answer:

- Why was this dish flagged?
- What metric triggered the action?
- What does the product want me to do?
- What is the expected upside?

If the engine cannot explain itself clearly, it will not be trusted.

## Limitations

- rule thresholds are blunt and not segment-specific
- sales volume quality may be weak in manual-input workflows
- recommendations do not understand brand, customer psychology, or competitor pricing
- raising price is not always operationally or commercially feasible
- incomplete recipe data can produce false certainty

## Future Versions

### v2

- menu engineering quadrant
- category-aware thresholds
- recommendation history
- richer stale-data warnings
- alerts for margin degradation
- invoice-confirmed ingredient cost updates
- supplier price-change alerts
- affected dish margin recalculation after confirmed cost changes

### v3

- POS-linked popularity analysis
- supplier price sync triggers
- scenario comparison across full menu
- confidence scoring informed by data quality

## Guardrails

- Never show a confident recommendation on obviously stale or incomplete data.
- Never hide assumptions behind a single score.
- Prefer no recommendation over a misleading recommendation.
- Never overwrite ingredient current cost from raw OCR or vision output before user confirmation.

## V2 Price-Change Alert Rules

### Rule 6: Ingredient Price Up

Condition:

- confirmed ingredient cost increases above configured threshold

Output:

- `alert_type: ingredient_price_up`
- recommended action: review affected dishes now
- confidence: medium to high depending on data completeness

### Rule 7: Ingredient Price Down

Condition:

- confirmed ingredient cost decreases above configured threshold

Output:

- `alert_type: ingredient_price_down`
- recommended action: review whether margin opportunity exists
- confidence: medium

### Rule 8: Dish Margin At Risk Due To Cost Change

Condition:

- confirmed ingredient cost increase pushes dish margin below warning or loss threshold

Output:

- `alert_type: dish_margin_at_risk_due_to_cost_change`
- recommended action: review price, recipe, or promotion mix
- confidence: high when ingredient match and dish linkage are strong

### Rule 9: High-Sales Dish Cost Change Priority Boost

Condition:

- ingredient price movement affects a high-sales dish

Output:

- raise alert priority
- increase estimated impact weighting
- surface the dish closer to the top actions area
