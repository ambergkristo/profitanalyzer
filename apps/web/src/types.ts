import type {
  CalculatedDish,
  Ingredient,
  IngredientCostBreakdown,
  RankedDishAction,
  Recipe,
  Dish
} from "../../../packages/core/src/index.js";

export type { CalculatedDish, Dish, Ingredient, IngredientCostBreakdown, RankedDishAction, Recipe };

export interface OverviewResponse {
  totalDishes: number;
  profitableCount: number;
  warningCount: number;
  lossCount: number;
  averageMarginPercent: number;
  estimatedPeriodProfitCents: number;
  topActions: RankedDishAction[];
}

export interface DishDetailResponse {
  dish: Dish;
  recipe: Recipe;
  ingredientBreakdown: IngredientCostBreakdown[];
  calculated: CalculatedDish;
  status: CalculatedDish["status"];
  explanation: string;
  whyThisMatters: string;
}
