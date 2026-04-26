import { describe, expect, it } from "vitest";

import {
  calculateCalculatedDishes,
  calculateDishMetrics,
  calculateOverview,
  calculateRecipeCost,
  explainDishPerformance,
  getCostDriverInsight,
  getDishStatus,
  getIngredientBreakdown,
  rankDishActions,
  roundToRestaurantFriendlyPrice,
  sampleRestaurantData,
  simulateDishPriceChange,
  suggestPriceForTargetMargin,
  syntheticRestaurantDatasets
} from "../src/index.js";

describe("calculateRecipeCost", () => {
  it("calculates recipe cost deterministically", () => {
    const recipe = sampleRestaurantData.recipes.find((item) => item.id === "recipe-caesar");
    expect(recipe).toBeDefined();

    const result = calculateRecipeCost(recipe!, sampleRestaurantData.ingredients);

    expect(result.costCents).toBe(775);
    expect(result.warnings).toHaveLength(0);
  });

  it("returns warning metadata when ingredient is missing", () => {
    const recipe = {
      id: "missing",
      name: "Missing Ingredient Soup",
      yield: 1,
      ingredients: [{ ingredientId: "ghost", quantity: 10, unit: "g" as const }]
    };

    const result = calculateRecipeCost(recipe, sampleRestaurantData.ingredients);

    expect(result.costCents).toBe(0);
    expect(result.warnings[0]?.code).toBe("MISSING_INGREDIENT");
    expect(result.breakdown[0]?.warning).toContain("Missing ingredient");
  });
});

describe("pricing helpers", () => {
  it("rounds target prices to restaurant-friendly endings", () => {
    expect(roundToRestaurantFriendlyPrice(1372)).toBe(1390);
    expect(roundToRestaurantFriendlyPrice(1395)).toBe(1400);
  });

  it("suggests the friendly price needed to hit a target margin", () => {
    expect(suggestPriceForTargetMargin(686, 50)).toBe(1390);
  });
});

describe("calculateDishMetrics", () => {
  it("calculates dish margin, cost ratio, and estimated profit", () => {
    const dish = sampleRestaurantData.dishes.find((item) => item.id === "dish-burger");
    const recipe = sampleRestaurantData.recipes.find((item) => item.id === dish?.recipeId);

    const result = calculateDishMetrics(dish!, recipe!, sampleRestaurantData.ingredients);

    expect(result.costCents).toBe(870);
    expect(result.marginPercent).toBe(35.56);
    expect(result.costRatioPercent).toBe(64.44);
    expect(result.grossProfitPerSaleCents).toBe(480);
    expect(result.estimatedPeriodProfitCents).toBe(139200);
    expect(result.status).toBe("warning");
  });

  it("classifies dishes into loss, warning, and profitable bands", () => {
    expect(getDishStatus(25)).toBe("loss");
    expect(getDishStatus(40)).toBe("warning");
    expect(getDishStatus(55)).toBe("profitable");
  });
});

describe("ingredient breakdown", () => {
  it("includes deterministic percentage-of-cost values", () => {
    const recipe = sampleRestaurantData.recipes.find((item) => item.id === "recipe-caesar");
    const breakdown = getIngredientBreakdown(recipe!, sampleRestaurantData.ingredients);
    const totalPercent = breakdown.reduce((sum, item) => sum + item.percentOfDishCost, 0);

    expect(breakdown[0]?.lineCostCents).toBe(120);
    expect(totalPercent).toBeCloseTo(100, 1);
  });

  it("detects the primary cost driver and dominant ingredient threshold", () => {
    const recipe = sampleRestaurantData.recipes.find((item) => item.id === "recipe-burger");
    const breakdown = getIngredientBreakdown(recipe!, sampleRestaurantData.ingredients);
    const insight = getCostDriverInsight(breakdown);

    expect(insight?.ingredientId).toBe("beef-patty");
    expect(insight?.isDominant).toBe(true);
    expect(insight?.message).toContain("62.1%");
  });
});

describe("decision engine", () => {
  const calculated = calculateCalculatedDishes(sampleRestaurantData);

  it("ranks dish actions with critical items first", () => {
    const actions = rankDishActions(calculated);

    expect(actions[0]?.severity).toBe("high");
    expect(actions[0]?.dishId).toBe("dish-steak-frites");
    expect(actions.some((action) => action.type === "bestseller_protection")).toBe(true);
  });

  it("emits explicit reason codes and practical guidance", () => {
    const burgerAction = rankDishActions(calculated).find(
      (action) => action.dishId === "dish-burger" && action.type === "bestseller_protection"
    );

    expect(burgerAction?.reasonCodes).toContain("HIGH_SALES_LOW_MARGIN");
    expect(burgerAction?.reasonCodes).toContain("PRICE_SIMULATION_UPSIDE");
    expect(burgerAction?.message).toContain("sells often");
  });

  it("explains dish performance with structured reasons", () => {
    const duck = calculated.find((dish) => dish.dishId === "dish-duck");
    const explanation = explainDishPerformance(duck!);

    expect(explanation.reasonCodes).toContain("LOSS_MARGIN");
    expect(explanation.summary).toContain("margin");
  });

  it("calculates upgraded overview metrics", () => {
    const overview = calculateOverview(calculated);

    expect(overview.totalDishes).toBe(8);
    expect(overview.totalRevenueCents).toBeGreaterThan(0);
    expect(overview.totalCostCents).toBeGreaterThan(0);
    expect(overview.topActions).toHaveLength(3);
    expect(overview.topProfitContributors[0]?.dishId).toBe("dish-burger");
    expect(overview.weightedAverageMarginPercent).toBeCloseTo(
      ((overview.totalRevenueCents - overview.totalCostCents) / overview.totalRevenueCents) * 100,
      2
    );
  });
});

describe("simulation helper", () => {
  it("returns before-and-after statuses and deltas", () => {
    const dish = sampleRestaurantData.dishes.find((item) => item.id === "dish-burger");
    const recipe = sampleRestaurantData.recipes.find((item) => item.id === dish?.recipeId);

    const simulation = simulateDishPriceChange(
      dish!,
      recipe!,
      sampleRestaurantData.ingredients,
      1490
    );

    expect(simulation.statusBefore).toBe("warning");
    expect(simulation.statusAfter).toBe("warning");
    expect(simulation.grossProfitPerSaleDeltaCents).toBe(140);
    expect(simulation.profitDeltaCents).toBe(40600);
    expect(simulation.message).toContain("€14.90");
  });
});

describe("synthetic datasets", () => {
  it("produce deterministic action ordering and distinct risk profiles", () => {
    const highMarginActions = rankDishActions(
      calculateCalculatedDishes(syntheticRestaurantDatasets.highMargin)
    );
    const lowMarginActions = rankDishActions(
      calculateCalculatedDishes(syntheticRestaurantDatasets.lowMargin)
    );
    const mixedActions = rankDishActions(
      calculateCalculatedDishes(syntheticRestaurantDatasets.mixed)
    );

    expect(highMarginActions.length).toBeGreaterThanOrEqual(3);
    expect(lowMarginActions.length).toBeGreaterThanOrEqual(3);
    expect(mixedActions.length).toBeGreaterThanOrEqual(3);
    expect(highMarginActions.filter((action) => action.severity !== "low").length).toBeLessThan(
      lowMarginActions.filter((action) => action.severity !== "low").length
    );
    expect(
      lowMarginActions.filter((action) => action.severity === "critical" || action.severity === "high")
        .length
    ).toBeGreaterThanOrEqual(3);
    expect(new Set(mixedActions.map((action) => action.type)).size).toBeGreaterThanOrEqual(3);
    expect(rankDishActions(calculateCalculatedDishes(syntheticRestaurantDatasets.mixed)).map((action) => action.id)).toEqual(
      mixedActions.map((action) => action.id)
    );
  });
});
