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
  IngredientCostHistoryView,
  IngredientCostBreakdown,
  InvoiceConfirmationSummary,
  InvoiceUnit,
  ManualInvoiceDraftInput,
  MockInvoiceSampleSummary,
  OcrDraftResponse,
  OcrInvoiceJob,
  OcrParsedInvoiceResult,
  OcrProviderConfig,
  OcrQualityReport,
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
  IngredientCostHistoryView,
  IngredientCostBreakdown,
  InvoiceConfirmationSummary,
  InvoiceUnit,
  ManualInvoiceDraftInput,
  MockInvoiceSampleSummary,
  OcrDraftResponse,
  OcrInvoiceJob,
  OcrParsedInvoiceResult,
  OcrProviderConfig,
  OcrQualityReport,
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
export type OcrInvoiceDraftResponse = OcrDraftResponse;
export type InvoiceDetailResponse = StoredInvoiceView;
export type AppMode = "demo" | "pilot";

export interface AppConfigResponse {
  appMode: AppMode;
  version: string;
  features: {
    invoiceIntake: boolean;
    ocrFixture: boolean;
    externalOcrConfigured: boolean;
    persistence: "memory";
  };
}

export interface DeepHealthResponse {
  ok: boolean;
  storage: "memory";
  appMode: AppMode;
  externalOcrConfigured: boolean;
  checks: Array<{
    key: string;
    status: "pass" | "warn";
    message: string;
  }>;
}

export interface DatasetExportPayload {
  dataset: import("../../../packages/core/src/index.js").DemoDatasetDefinition;
  ingredients: Ingredient[];
  recipes: Recipe[];
  dishes: Dish[];
  suppliers: Supplier[];
  supplierProductMatches: import("../../../packages/core/src/index.js").SupplierProductMatch[];
  costHistory: IngredientCostHistory[];
  alerts: PriceChangeAlert[];
  invoices: StoredInvoiceView[];
  ocrJobs: OcrInvoiceJob[];
}

export interface ResetDatasetSummary {
  datasetId: string;
  clearedInvoices: number;
  clearedCostHistory: number;
  clearedAlerts: number;
  clearedOcrJobs: number;
  restoredDishCount: number;
}

export interface ImportDatasetSummary {
  datasetId: string;
  ingredientCount: number;
  recipeCount: number;
  dishCount: number;
  supplierCount: number;
}

export interface InvoiceConfirmResponse {
  confirmationSummary: InvoiceConfirmationSummary;
  costHistory: IngredientCostHistory[];
  alerts: PriceChangeAlert[];
  affectedDishes: AffectedDishImpact[];
  updatedIngredients: Ingredient[];
}

export type DishFilter = "all" | DishStatus;
export type DishSortKey = "margin" | "estimatedProfit" | "salesVolume" | "cost" | "riskPriority";
