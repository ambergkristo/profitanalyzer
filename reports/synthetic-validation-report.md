# Synthetic Validation Report

Deterministic validation summary for the three canonical restaurant demo scenarios.

## Mixed Casual Restaurant

- Dataset ID: `mixed-restaurant`
- Result: PASS
- Dishes: 8
- Profit split: 2 profitable / 4 warning / 2 loss
- Weighted margin: 37.00%
- Estimated period profit: EUR 5569.40
- Action severity: critical 0, high 6, medium 1, low 1

Top actions:
- [high] Repair Steak Frites margin before costs move again (LOW_MARGIN, LOSS_MARGIN, PRICE_SIMULATION_UPSIDE, AGGRESSIVE_PRICE_INCREASE) - impact EUR 1245.00
- [high] Protect Beef Burger before volume hides the margin leak (LOW_MARGIN, HIGH_SALES_LOW_MARGIN, PRICE_SIMULATION_UPSIDE, STRONG_PROFIT_CONTRIBUTOR, AGGRESSIVE_PRICE_INCREASE) - impact EUR 1160.00
- [high] Protect Salmon Bowl before volume hides the margin leak (LOW_MARGIN, HIGH_SALES_LOW_MARGIN, PRICE_SIMULATION_UPSIDE, STRONG_PROFIT_CONTRIBUTOR, AGGRESSIVE_PRICE_INCREASE) - impact EUR 942.50

Warnings:
- Missing ingredient basil for recipe "Margherita Flatbread".

## Low Margin Kitchen

- Dataset ID: `low-margin-kitchen`
- Result: PASS
- Dishes: 8
- Profit split: 0 profitable / 4 warning / 4 loss
- Weighted margin: 20.99%
- Estimated period profit: EUR 3861.65
- Action severity: critical 4, high 2, medium 2, low 0

Top actions:
- [critical] Protect Beef Burger before volume hides the margin leak (LOW_MARGIN, HIGH_SALES_LOW_MARGIN, PRICE_SIMULATION_UPSIDE, STRONG_PROFIT_CONTRIBUTOR, AGGRESSIVE_PRICE_INCREASE) - impact EUR 2376.00
- [critical] Steak Frites is losing cash on every sale (LOSS_MARGIN, NEGATIVE_PROFIT_PER_SALE, PRICE_SIMULATION_UPSIDE, AGGRESSIVE_PRICE_INCREASE) - impact EUR 2232.00
- [critical] Review Salmon Bowl pricing now (LOW_MARGIN, HIGH_SALES_LOW_MARGIN, PRICE_SIMULATION_UPSIDE, AGGRESSIVE_PRICE_INCREASE) - impact EUR 2070.50

## High Margin Bistro

- Dataset ID: `high-margin-bistro`
- Result: PASS
- Dishes: 8
- Profit split: 5 profitable / 3 warning / 0 loss
- Weighted margin: 51.59%
- Estimated period profit: EUR 7266.95
- Action severity: critical 0, high 1, medium 2, low 1

Top actions:
- [high] Review Salmon Bowl pricing now (LOW_MARGIN, HIGH_SALES_LOW_MARGIN, PRICE_SIMULATION_UPSIDE) - impact EUR 199.50
- [medium] Duck a l'Orange needs a margin review (LOW_MARGIN, PRICE_SIMULATION_UPSIDE) - impact EUR 532.00
- [medium] Steak Frites needs a margin review (LOW_MARGIN, PRICE_SIMULATION_UPSIDE) - impact EUR 387.00

