import type {
  CalculatedDish,
  CostDriverInsight,
  DemoDatasetSummary,
  Dish,
  DishAction,
  DishActionSeverity,
  DishDetailAnalytics,
  DishStatus,
  Ingredient,
  IngredientCostBreakdown,
  OverviewMetrics,
  PriceSimulationResult,
  Recipe,
  SimulationTargetAction
} from "../../../packages/core/src/index.js";

export type {
  CalculatedDish,
  CostDriverInsight,
  DemoDatasetSummary,
  Dish,
  DishAction,
  DishActionSeverity,
  DishDetailAnalytics,
  DishStatus,
  Ingredient,
  IngredientCostBreakdown,
  OverviewMetrics,
  PriceSimulationResult,
  Recipe,
  SimulationTargetAction
};

export type OverviewResponse = OverviewMetrics;
export type DishDetailResponse = DishDetailAnalytics;
export type PriceSimulationResponse = PriceSimulationResult;

export type DishFilter = "all" | DishStatus;
export type DishSortKey = "margin" | "estimatedProfit" | "salesVolume" | "cost" | "riskPriority";
