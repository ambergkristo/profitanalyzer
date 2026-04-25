import type {
  CalculatedDish,
  Dish,
  DishAction,
  DishDetailAnalytics,
  DishStatus,
  DishActionSeverity,
  Ingredient,
  IngredientCostBreakdown,
  OverviewMetrics,
  PriceSimulationResult,
  Recipe
} from "../../../packages/core/src/index.js";

export type {
  CalculatedDish,
  Dish,
  DishAction,
  DishActionSeverity,
  DishDetailAnalytics,
  DishStatus,
  Ingredient,
  IngredientCostBreakdown,
  OverviewMetrics,
  PriceSimulationResult,
  Recipe
};

export type OverviewResponse = OverviewMetrics;
export type DishDetailResponse = DishDetailAnalytics;
export type PriceSimulationResponse = PriceSimulationResult;

export type DishFilter = "all" | DishStatus;
export type DishSortKey = "margin" | "estimatedProfit" | "salesVolume" | "cost";
