import { describe, expect, it } from "vitest";

import {
  calculateDishMetrics,
  calculateOverview,
  calculateRecipeCost,
  getDishStatus,
  rankDishActions,
  sampleRestaurantData
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
  });
});

describe("calculateDishMetrics", () => {
  it("calculates dish margin and estimated profit", () => {
    const dish = sampleRestaurantData.dishes.find((item) => item.id === "dish-burger");
    const recipe = sampleRestaurantData.recipes.find((item) => item.id === dish?.recipeId);

    const result = calculateDishMetrics(dish!, recipe!, sampleRestaurantData.ingredients);

    expect(result.costCents).toBe(855);
    expect(result.marginPercent).toBe(46.23);
    expect(result.grossProfitPerSaleCents).toBe(735);
    expect(result.estimatedPeriodProfitCents).toBe(191100);
    expect(result.status).toBe("warning");
  });

  it("classifies dishes into loss, warning, and profitable bands", () => {
    expect(getDishStatus(25)).toBe("loss");
    expect(getDishStatus(40)).toBe("warning");
    expect(getDishStatus(55)).toBe("profitable");
  });
});

describe("decision engine", () => {
  const calculated = sampleRestaurantData.dishes.map((dish) => {
    const recipe = sampleRestaurantData.recipes.find((item) => item.id === dish.recipeId)!;
    return calculateDishMetrics(dish, recipe, sampleRestaurantData.ingredients);
  });

  it("ranks dish actions with urgent items first", () => {
    const actions = rankDishActions(calculated);

    expect(actions[0]?.severity).toBe("urgent");
    expect(actions.some((action) => action.type === "urgent_margin_repair")).toBe(true);
    expect(actions.some((action) => action.type === "price_review")).toBe(true);
  });

  it("calculates overview metrics", () => {
    const overview = calculateOverview(calculated);

    expect(overview.totalDishes).toBe(6);
    expect(overview.profitableCount).toBeGreaterThanOrEqual(2);
    expect(overview.warningCount).toBeGreaterThanOrEqual(2);
    expect(overview.lossCount).toBeGreaterThanOrEqual(1);
    expect(overview.topActions).toHaveLength(3);
  });
});
