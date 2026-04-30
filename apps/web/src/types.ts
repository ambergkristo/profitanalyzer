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
export type PersistenceDriver = "memory" | "file" | "database";
export type RecipeInputUnit = Ingredient["unit"] | "kg" | "l" | "pcs" | "pack";
export type AuthMode = "disabled" | "dev";
export type WorkspaceRole = "owner" | "admin" | "member";

export interface StorageInfo {
  driver: PersistenceDriver;
  dataDir?: string;
  dataDirConfigured: boolean;
  readable: boolean;
  writable: boolean;
  databaseConfigured?: boolean;
  persistenceWarning: string | null;
}

export interface AppConfigResponse {
  appMode: AppMode;
  version: string;
  productionReadinessClaimed: false;
  storage: StorageInfo;
  workspaceContext: {
    workspaceId: string;
    restaurantId: string;
    actorUserId?: string;
  } | null;
  auth: {
    mode: AuthMode;
    required: boolean;
  };
  features: {
    invoiceIntake: boolean;
    ocrFixture: boolean;
    externalOcrConfigured: boolean;
    databaseConfigured: boolean;
  };
}

export interface DeepHealthResponse {
  ok: boolean;
  storage: StorageInfo;
  appMode: AppMode;
  workspaceContext: AppConfigResponse["workspaceContext"];
  externalOcrConfigured: boolean;
  auth: AppConfigResponse["auth"];
  checks: Array<{
    key: string;
    status: "pass" | "warn" | "fail";
    message: string;
  }>;
}

export interface AuthWorkspaceMembership {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  restaurants: Array<{
    restaurantId: string;
    restaurantName: string;
  }>;
}

export interface AuthUserProfile {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface AuthMeResponse {
  user: AuthUserProfile;
  workspaces: AuthWorkspaceMembership[];
  activeWorkspaceId: string;
  activeRestaurantId: string;
}

export interface DevLoginResponse {
  token: string;
  me: AuthMeResponse;
}

export interface DatasetExportPayload {
  schemaVersion: 1;
  datasetId: string;
  exportedFromAppVersion: string;
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

export interface ImportValidationSummary {
  ingredients: number;
  recipes: number;
  dishes: number;
  suppliers: number;
  invoices: number;
}

export interface ImportValidationReport {
  valid: boolean;
  summary: ImportValidationSummary;
  warnings: string[];
  errors: string[];
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

export interface IngredientCreateRequest {
  id?: string;
  name: string;
  costPerUnitCents: number;
  unit: Ingredient["unit"];
}

export interface IngredientUpdateRequest {
  name?: string;
  costPerUnitCents?: number;
  unit?: Ingredient["unit"];
}

export interface RecipeCreateRequest {
  id?: string;
  name: string;
  yield: number;
  ingredients: Array<{
    ingredientId: string;
    quantity: number;
    unit: RecipeInputUnit;
  }>;
}

export interface RecipeUpdateRequest {
  name?: string;
  yield?: number;
  ingredients?: Array<{
    ingredientId: string;
    quantity: number;
    unit: RecipeInputUnit;
  }>;
}

export interface DishCreateRequest {
  id?: string;
  name: string;
  recipeId: string;
  priceCents: number;
  salesVolume: number;
}

export interface DishUpdateRequest {
  name?: string;
  recipeId?: string;
  priceCents?: number;
  salesVolume?: number;
}

export type DishFilter = "all" | DishStatus;
export type DishSortKey = "margin" | "estimatedProfit" | "salesVolume" | "cost" | "riskPriority";
