import type {
  AffectedDishImpact,
  CalculatedDish,
  CostDriverInsight,
  DemoDatasetSummary,
  Dish,
  DishAction,
  DishActionSeverity,
  DishDetailAnalytics,
  DishStatus,
  Ingredient,
  IngredientCostHistory,
  IngredientCostBreakdown,
  InvoiceConfirmationSummary,
  InvoiceUnit,
  MockInvoiceSampleSummary,
  OverviewMetrics,
  ParsedInvoiceDraft,
  PriceChangeAlert,
  PriceSimulationResult,
  PurchaseInvoice,
  PurchaseInvoiceLine,
  Recipe,
  SimulationTargetAction,
  StoredInvoiceView,
  Supplier
} from "../../../packages/core/src/index.js";

export type {
  AffectedDishImpact,
  CalculatedDish,
  CostDriverInsight,
  DemoDatasetSummary,
  Dish,
  DishAction,
  DishActionSeverity,
  DishDetailAnalytics,
  DishStatus,
  Ingredient,
  IngredientCostHistory,
  IngredientCostBreakdown,
  InvoiceConfirmationSummary,
  InvoiceUnit,
  MockInvoiceSampleSummary,
  OverviewMetrics,
  ParsedInvoiceDraft,
  PriceChangeAlert,
  PriceSimulationResult,
  PurchaseInvoice,
  PurchaseInvoiceLine,
  Recipe,
  SimulationTargetAction,
  StoredInvoiceView,
  Supplier
};

export type OverviewResponse = OverviewMetrics;
export type DishDetailResponse = DishDetailAnalytics;
export type PriceSimulationResponse = PriceSimulationResult;
export type InvoiceDraftResponse = ParsedInvoiceDraft;
export type InvoiceDetailResponse = StoredInvoiceView;
export interface InvoiceConfirmResponse {
  confirmationSummary: InvoiceConfirmationSummary;
  costHistory: IngredientCostHistory[];
  alerts: PriceChangeAlert[];
  affectedDishes: AffectedDishImpact[];
  updatedIngredients: Ingredient[];
}

export type DishFilter = "all" | DishStatus;
export type DishSortKey = "margin" | "estimatedProfit" | "salesVolume" | "cost" | "riskPriority";
