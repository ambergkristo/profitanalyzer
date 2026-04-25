export type IngredientUnit = "g" | "ml" | "piece";

export interface Ingredient {
  id: string;
  name: string;
  costPerUnitCents: number;
  unit: IngredientUnit;
}

export interface RecipeIngredient {
  ingredientId: string;
  quantity: number;
  unit: IngredientUnit;
}

export interface Recipe {
  id: string;
  name: string;
  yield: number;
  ingredients: RecipeIngredient[];
}

export interface Dish {
  id: string;
  name: string;
  recipeId: string;
  priceCents: number;
  salesVolume: number;
}

export type DishStatus = "loss" | "warning" | "profitable";

export interface CalculationWarning {
  code: "MISSING_INGREDIENT" | "UNIT_MISMATCH" | "INVALID_YIELD";
  message: string;
  ingredientId?: string;
}

export interface IngredientCostBreakdown {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: IngredientUnit;
  unitCostCents: number | null;
  totalCostCents: number;
  isMissing: boolean;
}

export interface RecipeCostResult {
  costCents: number;
  warnings: CalculationWarning[];
  breakdown: IngredientCostBreakdown[];
}

export interface CalculatedDish {
  dishId: string;
  name: string;
  priceCents: number;
  costCents: number;
  marginPercent: number;
  grossProfitPerSaleCents: number;
  estimatedPeriodProfitCents: number;
  salesVolume: number;
  status: DishStatus;
  warnings: CalculationWarning[];
}

export type ActionSeverity = "urgent" | "warning" | "opportunity";
export type ActionType =
  | "urgent_margin_repair"
  | "price_review"
  | "warning_review"
  | "promotion_opportunity";

export interface RankedDishAction {
  id: string;
  type: ActionType;
  title: string;
  message: string;
  dishId: string;
  severity: ActionSeverity;
  estimatedImpactCents: number;
  confidence: "low" | "medium" | "high";
}

export interface SampleRestaurantData {
  ingredients: Ingredient[];
  recipes: Recipe[];
  dishes: Dish[];
}

export interface OverviewMetrics {
  totalDishes: number;
  profitableCount: number;
  warningCount: number;
  lossCount: number;
  averageMarginPercent: number;
  estimatedPeriodProfitCents: number;
  topActions: RankedDishAction[];
}
