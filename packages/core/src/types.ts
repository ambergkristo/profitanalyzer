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

export type CalculationWarningCode = "MISSING_INGREDIENT" | "UNIT_MISMATCH" | "INVALID_YIELD";

export interface CalculationWarning {
  code: CalculationWarningCode;
  message: string;
  ingredientId?: string;
}

export interface IngredientCostBreakdown {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: IngredientUnit;
  unitCostCents: number | null;
  lineCostCents: number;
  percentOfDishCost: number;
  isMissing: boolean;
  warning?: string;
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
  costRatioPercent: number;
  contributionRank: number;
  warnings: CalculationWarning[];
}

export type DishActionSeverity = "critical" | "high" | "medium" | "low";
export type DishActionConfidence = "high" | "medium" | "low";

export type DishActionType =
  | "margin_repair"
  | "price_review"
  | "warning_review"
  | "bestseller_protection"
  | "promotion_opportunity"
  | "data_quality";

export type DishActionReasonCode =
  | "LOW_MARGIN"
  | "LOSS_MARGIN"
  | "HIGH_SALES_LOW_MARGIN"
  | "HIGH_MARGIN_LOW_SALES"
  | "NEGATIVE_PROFIT_PER_SALE"
  | "STRONG_PROFIT_CONTRIBUTOR"
  | "PRICE_SIMULATION_UPSIDE"
  | "MISSING_COST_DATA"
  | "AGGRESSIVE_PRICE_INCREASE";

export interface DishAction {
  id: string;
  type: DishActionType;
  title: string;
  message: string;
  dishId: string;
  severity: DishActionSeverity;
  estimatedImpactCents: number;
  confidence: DishActionConfidence;
  reasonCodes: DishActionReasonCode[];
  recommendedPriceCents?: number;
  currentMarginPercent?: number;
  targetMarginPercent?: number;
  createdFromRule: string;
  isAggressive?: boolean;
}

export type RankedDishAction = DishAction;

export interface DishPerformanceExplanation {
  headline: string;
  summary: string;
  highlights: string[];
  reasonCodes: DishActionReasonCode[];
}

export interface PriceSimulationResult {
  dishId: string;
  oldPriceCents: number;
  newPriceCents: number;
  oldMarginPercent: number;
  newMarginPercent: number;
  oldEstimatedPeriodProfitCents: number;
  newEstimatedPeriodProfitCents: number;
  profitDeltaCents: number;
  grossProfitPerSaleDeltaCents: number;
  statusBefore: DishStatus;
  statusAfter: DishStatus;
  message: string;
}

export interface SimulationHints {
  currentPriceCents: number;
  quickAdjustmentsCents: number[];
  recommendedPriceCents?: number;
  recommendedTargetMarginPercent?: number;
  note: string;
}

export interface DishDetailAnalytics {
  dish: Dish;
  recipe: Recipe;
  metrics: CalculatedDish;
  ingredientBreakdown: IngredientCostBreakdown[];
  explanation: DishPerformanceExplanation;
  recommendedActionsForDish: DishAction[];
  simulationHints: SimulationHints;
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
  totalRevenueCents: number;
  totalCostCents: number;
  weightedAverageMarginPercent: number;
  topActions: DishAction[];
  topProfitContributors: CalculatedDish[];
  riskiestDishes: CalculatedDish[];
  dataQualityWarnings: string[];
}
