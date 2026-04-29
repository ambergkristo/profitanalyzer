import type {
  AffectedDishImpact,
  CalculatedDish,
  DemoDatasetDefinition,
  DemoDatasetSummary,
  DishAction,
  DishDetailAnalytics,
  Ingredient,
  IngredientCostHistory,
  IngredientCostHistoryView,
  ManualInvoiceDraftInput,
  MockInvoiceSampleSummary,
  OcrDraftResponse,
  OcrInvoiceJob,
  OcrParsedInvoiceResult,
  OcrProviderConfig,
  OverviewMetrics,
  ParsedInvoiceDraft,
  PriceChangeAlert,
  PurchaseInvoice,
  PurchaseInvoiceLine,
  ReviewedInvoiceLineInput,
  StoredInvoiceView,
  Supplier,
  SupplierProductMatch
} from "../../../../packages/core/src/index.js";

export type AppMode = "demo" | "pilot";
export type PersistenceType = "memory" | "file" | "database";

export interface StoreContext {
  workspaceId: string;
  restaurantId: string;
  actorUserId?: string;
}

export interface StorageInfo {
  driver: PersistenceType;
  dataDir?: string;
  dataDirConfigured: boolean;
  readable: boolean;
  writable: boolean;
  databaseConfigured?: boolean;
  persistenceWarning: string | null;
}

export interface DatasetExportPayload {
  schemaVersion: 1;
  datasetId: string;
  exportedFromAppVersion: string;
  dataset: DemoDatasetDefinition;
  ingredients: Ingredient[];
  recipes: DemoDatasetDefinition["data"]["recipes"];
  dishes: DemoDatasetDefinition["data"]["dishes"];
  suppliers: Supplier[];
  supplierProductMatches: SupplierProductMatch[];
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

export interface AnalyticsInputSnapshot {
  ingredients: Ingredient[];
  recipes: DemoDatasetDefinition["data"]["recipes"];
  dishes: DemoDatasetDefinition["data"]["dishes"];
  alerts: PriceChangeAlert[];
}

export interface IngredientCreateInput {
  id?: string;
  name: string;
  costPerUnitCents: number;
  unit: Ingredient["unit"];
}

export interface IngredientUpdateInput {
  name?: string;
  costPerUnitCents?: number;
  unit?: Ingredient["unit"];
}

export interface RecipeCreateInput {
  id?: string;
  name: string;
  yield: number;
  ingredients: DemoDatasetDefinition["data"]["recipes"][number]["ingredients"];
}

export interface RecipeUpdateInput {
  name?: string;
  yield?: number;
  ingredients?: DemoDatasetDefinition["data"]["recipes"][number]["ingredients"];
}

export interface DishCreateInput {
  id?: string;
  name: string;
  recipeId: string;
  priceCents: number;
  salesVolume: number;
}

export interface DishUpdateInput {
  name?: string;
  recipeId?: string;
  priceCents?: number;
  salesVolume?: number;
}

export interface AppStore {
  restaurantData: {
    ingredients: Ingredient[];
    recipes: DemoDatasetDefinition["data"]["recipes"];
    dishes: DemoDatasetDefinition["data"]["dishes"];
  };
  initialize(): Promise<void>;
  getStoreContext(datasetId?: string): StoreContext | null;
  getStorageType(): PersistenceType;
  getStorageInfo(): StorageInfo;
  getResolvedDataset(datasetId?: string): DemoDatasetDefinition | null;
  flushDataset(datasetId: string): boolean;
  flushDatasetAsync(datasetId: string): Promise<boolean>;
  listDatasets(): DemoDatasetSummary[];
  getDemoDatasets(): DemoDatasetSummary[];
  getMockInvoiceSampleSummaries(): MockInvoiceSampleSummary[];
  getAnalyticsInput(datasetId?: string): AnalyticsInputSnapshot | null;
  getIngredients(datasetId?: string): Ingredient[] | null;
  getRecipes(datasetId?: string): DemoDatasetDefinition["data"]["recipes"] | null;
  getDishes(datasetId?: string): DemoDatasetDefinition["data"]["dishes"] | null;
  getSuppliers(datasetId?: string): Supplier[] | null;
  getCalculatedDishes(datasetId?: string): CalculatedDish[] | null;
  getAllActions(datasetId?: string): DishAction[] | null;
  getOverview(datasetId?: string): OverviewMetrics | null;
  getPriceChangeAlerts(datasetId?: string): PriceChangeAlert[] | null;
  getIngredientCostHistory(ingredientId: string, datasetId?: string): IngredientCostHistoryView | null | undefined;
  getDishDetail(dishId: string, datasetId?: string): DishDetailAnalytics | null;
  parseMockInvoice(sampleInvoiceId: string, datasetId?: string): ParsedInvoiceDraft | null | undefined;
  createManualInvoiceDraft(input: ManualInvoiceDraftInput, datasetId?: string): ParsedInvoiceDraft | null;
  createOcrDraft(
    input: {
      providerConfig: OcrProviderConfig;
      parsedResult: OcrParsedInvoiceResult;
      fileName: string;
      mimeType: string;
      fileSizeBytes: number;
    },
    datasetId?: string
  ): OcrDraftResponse | null;
  createFailedOcrJob(
    input: {
      providerConfig: OcrProviderConfig;
      fileName: string;
      mimeType: string;
      fileSizeBytes: number;
      failureReason: string;
    },
    datasetId?: string
  ): OcrInvoiceJob | null;
  getOcrJob(
    jobId: string,
    datasetId?: string
  ): {
    ocrJob: OcrInvoiceJob;
    ocrResult?: OcrParsedInvoiceResult;
    invoiceDraft?: PurchaseInvoice;
    summary?: ParsedInvoiceDraft["summary"];
    qualityReport?: OcrDraftResponse["qualityReport"];
  } | null | undefined;
  listOcrJobs(datasetId?: string): OcrInvoiceJob[] | null;
  getInvoice(invoiceId: string, datasetId?: string): StoredInvoiceView | null;
  createIngredient(input: IngredientCreateInput, datasetId?: string): Ingredient | null;
  updateIngredient(
    ingredientId: string,
    input: IngredientUpdateInput,
    datasetId?: string
  ): Ingredient | null | undefined;
  createRecipe(
    input: RecipeCreateInput,
    datasetId?: string
  ): DemoDatasetDefinition["data"]["recipes"][number] | null | undefined;
  updateRecipe(
    recipeId: string,
    input: RecipeUpdateInput,
    datasetId?: string
  ): DemoDatasetDefinition["data"]["recipes"][number] | null | undefined;
  createDish(
    input: DishCreateInput,
    datasetId?: string
  ): DemoDatasetDefinition["data"]["dishes"][number] | null | undefined;
  updateDish(
    dishId: string,
    input: DishUpdateInput,
    datasetId?: string
  ): DemoDatasetDefinition["data"]["dishes"][number] | null | undefined;
  confirmInvoice(
    invoiceId: string,
    datasetId: string | undefined,
    input: {
      supplierId?: string;
      invoiceDate?: string;
      invoiceNumber?: string;
      lines: ReviewedInvoiceLineInput[];
    }
  ):
    | {
        confirmedInvoice: PurchaseInvoice;
        confirmedLines: PurchaseInvoiceLine[];
        confirmationSummary: StoredInvoiceView["confirmationSummary"];
        costHistory: IngredientCostHistory[];
        alerts: PriceChangeAlert[];
        affectedDishes: AffectedDishImpact[];
        updatedIngredients: Ingredient[];
        supplierProductMatches: SupplierProductMatch[];
      }
    | null
    | undefined;
  resetDataset(datasetId: string): ResetDatasetSummary | null;
  exportDataset(datasetId: string): DatasetExportPayload | null;
  importDataset(payload: DatasetExportPayload, datasetId?: string): ImportDatasetSummary;
}
