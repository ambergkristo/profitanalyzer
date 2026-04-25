import { describe, expect, it } from "vitest";

import type { DishAction, CalculatedDish } from "../types.js";
import { filterAndSortDishes, mapPrimaryActionByDish } from "../utils/dishes.js";

const dishes: CalculatedDish[] = [
  {
    dishId: "loss",
    name: "Loss Dish",
    priceCents: 1000,
    costCents: 1100,
    marginPercent: -10,
    grossProfitPerSaleCents: -100,
    estimatedPeriodProfitCents: -1000,
    salesVolume: 10,
    status: "loss",
    costRatioPercent: 110,
    contributionRank: 3,
    warnings: []
  },
  {
    dishId: "warning",
    name: "Warning Dish",
    priceCents: 1200,
    costCents: 700,
    marginPercent: 41.67,
    grossProfitPerSaleCents: 500,
    estimatedPeriodProfitCents: 5000,
    salesVolume: 10,
    status: "warning",
    costRatioPercent: 58.33,
    contributionRank: 2,
    warnings: []
  },
  {
    dishId: "profit",
    name: "Profit Dish",
    priceCents: 1500,
    costCents: 500,
    marginPercent: 66.67,
    grossProfitPerSaleCents: 1000,
    estimatedPeriodProfitCents: 12000,
    salesVolume: 12,
    status: "profitable",
    costRatioPercent: 33.33,
    contributionRank: 1,
    warnings: []
  }
];

describe("dish utilities", () => {
  it("filters and sorts dishes deterministically", () => {
    expect(filterAndSortDishes(dishes, "warning", "margin").map((dish) => dish.dishId)).toEqual([
      "warning"
    ]);
    expect(filterAndSortDishes(dishes, "all", "estimatedProfit").map((dish) => dish.dishId)).toEqual([
      "profit",
      "warning",
      "loss"
    ]);
  });

  it("maps the first ranked action per dish", () => {
    const actions: DishAction[] = [
      {
        id: "a-1",
        type: "margin_repair",
        title: "Fix loss",
        message: "Loss Dish loses money.",
        dishId: "loss",
        severity: "critical",
        estimatedImpactCents: 2000,
        confidence: "high",
        reasonCodes: ["LOSS_MARGIN"],
        createdFromRule: "negative-profit-per-sale"
      },
      {
        id: "a-2",
        type: "data_quality",
        title: "Fix inputs",
        message: "Loss Dish data issue.",
        dishId: "loss",
        severity: "high",
        estimatedImpactCents: 1000,
        confidence: "low",
        reasonCodes: ["MISSING_COST_DATA"],
        createdFromRule: "data-quality-warning"
      }
    ];

    const actionMap = mapPrimaryActionByDish(actions);

    expect(actionMap.get("loss")?.id).toBe("a-1");
  });
});
