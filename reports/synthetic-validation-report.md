# Synthetic Validation Report

Deterministic validation summary for the three canonical restaurant demo scenarios.

| Scenario | Profile | Result | Weighted Margin | Actions | Diagnosis |
| --- | --- | --- | --- | --- | --- |
| Mixed Casual Restaurant | mixed | PASS | 37.00% | 8 | Mixed performance. Fix leaks while protecting top contributors. |
| Low Margin Kitchen | low-margin | PASS | 20.99% | 8 | Margin pressure detected. Start with high-sales dishes below 50% margin. |
| High Margin Bistro | high-margin | PASS | 51.59% | 4 | Menu is mostly healthy. Protect winners and grow high-margin dishes. |

## Mixed Casual Restaurant

- Dataset ID: `mixed-restaurant`
- Profile: `mixed`
- Result: PASS
- Dishes: 8
- Profit split: 2 profitable / 4 warning / 2 loss
- Weighted margin: 37.00%
- Estimated period profit: EUR 5569.40
- Owner diagnosis: Mixed performance. Fix leaks while protecting top contributors.
- Expected behavior: A balanced action stack with profitable dishes, warning dishes, and at least one clear data-quality or margin-repair action.
- Action severity: critical 0, high 6, medium 1, low 1

Top actions:
- [high] Repair Steak Frites margin before costs move again (LOW_MARGIN, LOSS_MARGIN, PRICE_SIMULATION_UPSIDE, AGGRESSIVE_PRICE_INCREASE) - impact EUR 1245.00
- [high] Protect Beef Burger before volume hides the margin leak (LOW_MARGIN, HIGH_SALES_LOW_MARGIN, PRICE_SIMULATION_UPSIDE, STRONG_PROFIT_CONTRIBUTOR, AGGRESSIVE_PRICE_INCREASE) - impact EUR 1160.00
- [high] Protect Salmon Bowl before volume hides the margin leak (LOW_MARGIN, HIGH_SALES_LOW_MARGIN, PRICE_SIMULATION_UPSIDE, STRONG_PROFIT_CONTRIBUTOR, AGGRESSIVE_PRICE_INCREASE) - impact EUR 942.50

Warnings:
- Missing ingredient basil for recipe "Margherita Flatbread".

## Low Margin Kitchen

- Dataset ID: `low-margin-kitchen`
- Profile: `low-margin`
- Result: PASS
- Dishes: 8
- Profit split: 0 profitable / 4 warning / 4 loss
- Weighted margin: 20.99%
- Estimated period profit: EUR 3861.65
- Owner diagnosis: Margin pressure detected. Start with high-sales dishes below 50% margin.
- Expected behavior: High and critical actions should dominate, with bestseller margin repair and pricing review at the top.
- Action severity: critical 4, high 2, medium 2, low 0

Top actions:
- [critical] Protect Beef Burger before volume hides the margin leak (LOW_MARGIN, HIGH_SALES_LOW_MARGIN, PRICE_SIMULATION_UPSIDE, STRONG_PROFIT_CONTRIBUTOR, AGGRESSIVE_PRICE_INCREASE) - impact EUR 2376.00
- [critical] Steak Frites is losing cash on every sale (LOSS_MARGIN, NEGATIVE_PROFIT_PER_SALE, PRICE_SIMULATION_UPSIDE, AGGRESSIVE_PRICE_INCREASE) - impact EUR 2232.00
- [critical] Review Salmon Bowl pricing now (LOW_MARGIN, HIGH_SALES_LOW_MARGIN, PRICE_SIMULATION_UPSIDE, AGGRESSIVE_PRICE_INCREASE) - impact EUR 2070.50

## High Margin Bistro

- Dataset ID: `high-margin-bistro`
- Profile: `high-margin`
- Result: PASS
- Dishes: 8
- Profit split: 5 profitable / 3 warning / 0 loss
- Weighted margin: 51.59%
- Estimated period profit: EUR 7266.95
- Owner diagnosis: Menu is mostly healthy. Protect winners and grow high-margin dishes.
- Expected behavior: Mostly profitable dishes, few urgent fixes, and some promotion or growth actions instead of repair-heavy output.
- Action severity: critical 0, high 1, medium 2, low 1

Top actions:
- [high] Review Salmon Bowl pricing now (LOW_MARGIN, HIGH_SALES_LOW_MARGIN, PRICE_SIMULATION_UPSIDE) - impact EUR 199.50
- [medium] Duck a l'Orange needs a margin review (LOW_MARGIN, PRICE_SIMULATION_UPSIDE) - impact EUR 532.00
- [medium] Steak Frites needs a margin review (LOW_MARGIN, PRICE_SIMULATION_UPSIDE) - impact EUR 387.00

