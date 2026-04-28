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

export type PersistenceType = "memory";
export type AppMode = "demo" | "pilot";

export interface DatasetExportPayload {
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

export interface AppStore {
  restaurantData: {
    ingredients: Ingredient[];
    recipes: DemoDatasetDefinition["data"]["recipes"];
    dishes: DemoDatasetDefinition["data"]["dishes"];
  };
  getStorageType(): PersistenceType;
  getResolvedDataset(datasetId?: string): DemoDatasetDefinition | null;
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
