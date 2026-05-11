import type {
  AffectedDishImpact,
  BillingStatus,
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
  LicenseEntitlement,
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
  Plan,
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
  BillingStatus,
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
  LicenseEntitlement,
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
  Plan,
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
export type AppMode = "demo" | "pilot" | "production";
export type PersistenceDriver = "memory" | "file" | "database";
export type RecipeInputUnit = Ingredient["unit"] | "kg" | "l" | "pcs" | "pack";
export type AuthMode = "disabled" | "dev" | "password" | "external_oidc_future";
export type WorkspaceRole = "owner" | "admin" | "member";
export type OnboardingStepId =
  | "restaurant_profile"
  | "ingredients"
  | "recipes"
  | "dishes"
  | "suppliers"
  | "first_invoice"
  | "dashboard_review";
export type OnboardingStepStatus = "not_started" | "in_progress" | "complete" | "skipped";

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
  nodeEnv: "development" | "test" | "production";
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
  runtime: {
    logLevel: "debug" | "info" | "warn" | "error";
    appBaseUrlConfigured: boolean;
    apiBaseUrlConfigured: boolean;
    corsOriginConfigured: boolean;
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
  nodeEnv: "development" | "test" | "production";
  workspaceContext: AppConfigResponse["workspaceContext"];
  externalOcrConfigured: boolean;
  auth: AppConfigResponse["auth"];
  checks: Array<{
    key: string;
    status: "pass" | "warn" | "fail";
    message: string;
  }>;
}

export interface ReadinessResponse {
  ok: boolean;
  appMode: AppMode;
  nodeEnv: "development" | "test" | "production";
  productionReady: false;
  storage: {
    driver: PersistenceDriver;
    databaseConfigured: boolean;
    databaseReachable: boolean | null;
  };
  auth: {
    mode: AuthMode;
    required: boolean;
    sessionSecretConfigured: boolean;
  };
  ocr: {
    provider: string;
    externalConfigured: boolean;
  };
  uploadStorage: {
    driver: "memory" | "local_file";
    maxFileSizeBytes: number;
  };
  checks: Array<{
    name: string;
    status: "pass" | "warn" | "fail" | "skipped";
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
  status?: "active" | "disabled" | "invited";
  emailVerifiedAt?: string;
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

export type AuthLoginResponse = DevLoginResponse;

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
  plans?: Plan[];
  subscription?: BillingStatus["subscription"];
  entitlements?: LicenseEntitlement[];
  usage?: BillingStatus["usage"];
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

export interface RestaurantProfile {
  workspaceId: string;
  restaurantId: string;
  name: string;
  currency: string;
  country?: string;
  concept?: string;
  averageMonthlyDishSalesEstimate?: number;
  updatedAt: string;
}

export interface RestaurantProfileUpdateRequest {
  dataset?: string;
  name?: string;
  currency?: string;
  country?: string;
  concept?: string;
  averageMonthlyDishSalesEstimate?: number;
}

export interface OnboardingState {
  workspaceId: string;
  restaurantId: string;
  currentStep: OnboardingStepId;
  completedSteps: OnboardingStepId[];
  skippedSteps: OnboardingStepId[];
  progressPercent: number;
  createdAt: string;
  updatedAt: string;
}

export interface OnboardingChecklistItem {
  step: OnboardingStepId;
  label: string;
  status: OnboardingStepStatus;
  complete: boolean;
  count?: number;
  minimum?: number;
  message: string;
}

export interface OnboardingChecklist {
  workspaceId: string;
  restaurantId: string;
  progressPercent: number;
  readyForDashboard: boolean;
  items: OnboardingChecklistItem[];
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

export interface SupplierCreateRequest {
  id?: string;
  name: string;
  contactLabel?: string;
}

export interface SupplierUpdateRequest {
  name?: string;
  contactLabel?: string;
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
