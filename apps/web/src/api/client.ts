import type {
  AppConfigResponse,
  DatasetExportPayload,
  DeepHealthResponse,
  DishCreateRequest,
  DishUpdateRequest,
  ImportDatasetSummary,
  ImportValidationReport,
  InvoiceConfirmResponse,
  InvoiceDetailResponse,
  InvoiceDraftResponse,
  Ingredient,
  IngredientCostHistoryView,
  IngredientCreateRequest,
  IngredientUpdateRequest,
  ManualInvoiceDraftInput,
  MockInvoiceSampleSummary,
  OcrInvoiceDraftResponse,
  OcrInvoiceJob,
  OcrProviderConfig,
  OcrQualityReport,
  PriceChangeAlert,
  ResetDatasetSummary,
  CalculatedDish,
  DemoDatasetSummary,
  DishAction,
  DishDetailResponse,
  OverviewResponse,
  PriceSimulationResponse,
  Recipe,
  RecipeCreateRequest,
  RecipeUpdateRequest,
  Supplier
} from "../types.js";

export function buildDatasetPath(path: string, datasetId?: string): string {
  if (!datasetId) {
    return path;
  }

  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}dataset=${encodeURIComponent(datasetId)}`;
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `Request failed for ${path} with ${response.status}`);
  }

  return (await response.json()) as T;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(errorBody?.message ?? `Request failed for ${path} with ${response.status}`);
  }

  return (await response.json()) as T;
}

async function patchJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(errorBody?.message ?? `Request failed for ${path} with ${response.status}`);
  }

  return (await response.json()) as T;
}

async function getBlob(path: string): Promise<Blob> {
  const response = await fetch(path);
  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(errorBody?.message ?? `Request failed for ${path} with ${response.status}`);
  }

  return response.blob();
}

async function postFormData<T>(path: string, body: FormData): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    body
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(errorBody?.message ?? `Request failed for ${path} with ${response.status}`);
  }

  return (await response.json()) as T;
}

export const apiClient = {
  getAppConfig: () => getJson<AppConfigResponse>("/api/app/config"),
  getDeepHealth: () => getJson<DeepHealthResponse>("/api/health/deep"),
  getDemoDatasets: () => getJson<DemoDatasetSummary[]>("/api/demo/datasets"),
  getOverview: (datasetId?: string) =>
    getJson<OverviewResponse>(buildDatasetPath("/api/analytics/overview", datasetId)),
  getDishes: (datasetId?: string) =>
    getJson<CalculatedDish[]>(buildDatasetPath("/api/analytics/dishes", datasetId)),
  getIngredients: (datasetId?: string) =>
    getJson<Ingredient[]>(buildDatasetPath("/api/ingredients", datasetId)),
  getRecipes: (datasetId?: string) =>
    getJson<Recipe[]>(buildDatasetPath("/api/recipes", datasetId)),
  getMenuDishes: (datasetId?: string) =>
    getJson<import("../types.js").Dish[]>(buildDatasetPath("/api/dishes", datasetId)),
  createIngredient: (body: IngredientCreateRequest, datasetId?: string) =>
    postJson<Ingredient>(buildDatasetPath("/api/ingredients", datasetId), {
      ...body,
      dataset: datasetId
    }),
  updateIngredient: (ingredientId: string, body: IngredientUpdateRequest, datasetId?: string) =>
    patchJson<Ingredient>(buildDatasetPath(`/api/ingredients/${ingredientId}`, datasetId), {
      ...body,
      dataset: datasetId
    }),
  createRecipe: (body: RecipeCreateRequest, datasetId?: string) =>
    postJson<Recipe>(buildDatasetPath("/api/recipes", datasetId), {
      ...body,
      dataset: datasetId
    }),
  updateRecipe: (recipeId: string, body: RecipeUpdateRequest, datasetId?: string) =>
    patchJson<Recipe>(buildDatasetPath(`/api/recipes/${recipeId}`, datasetId), {
      ...body,
      dataset: datasetId
    }),
  getActions: (datasetId?: string) =>
    getJson<DishAction[]>(buildDatasetPath("/api/analytics/actions", datasetId)),
  getDishDetail: (dishId: string, datasetId?: string) =>
    getJson<DishDetailResponse>(buildDatasetPath(`/api/analytics/dish/${dishId}`, datasetId)),
  createDish: (body: DishCreateRequest, datasetId?: string) =>
    postJson<import("../types.js").Dish>(buildDatasetPath("/api/dishes", datasetId), {
      ...body,
      dataset: datasetId
    }),
  updateDish: (dishId: string, body: DishUpdateRequest, datasetId?: string) =>
    patchJson<import("../types.js").Dish>(buildDatasetPath(`/api/dishes/${dishId}`, datasetId), {
      ...body,
      dataset: datasetId
    }),
  getPriceChangeAlerts: (datasetId?: string) =>
    getJson<PriceChangeAlert[]>(buildDatasetPath("/api/alerts/price-changes", datasetId)),
  getOcrProviders: () => getJson<OcrProviderConfig[]>("/api/ocr/providers"),
  getOcrJobs: (datasetId?: string) =>
    getJson<OcrInvoiceJob[]>(buildDatasetPath("/api/ocr/jobs", datasetId)),
  getInvoiceSamples: () => getJson<MockInvoiceSampleSummary[]>("/api/invoices/samples"),
  exportDataset: (datasetId?: string) =>
    getJson<DatasetExportPayload>(buildDatasetPath("/api/export", datasetId)),
  exportDatasetBlob: (datasetId?: string) =>
    getBlob(buildDatasetPath("/api/export", datasetId)),
  validateImportDataset: (payload: DatasetExportPayload, datasetId?: string) =>
    postJson<ImportValidationReport>(buildDatasetPath("/api/import/validate", datasetId), payload),
  importDataset: (payload: DatasetExportPayload, datasetId?: string) =>
    postJson<ImportDatasetSummary>(buildDatasetPath("/api/import", datasetId), payload),
  resetDataset: (datasetId: string) =>
    postJson<ResetDatasetSummary>(`/api/datasets/${encodeURIComponent(datasetId)}/reset`, {}),
  parseMockInvoiceSample: (sampleInvoiceId: string, datasetId?: string) =>
    postJson<InvoiceDraftResponse>(buildDatasetPath("/api/invoices/parse-mock", datasetId), {
      sampleInvoiceId,
      dataset: datasetId
    }),
  createManualInvoiceDraft: (body: ManualInvoiceDraftInput, datasetId?: string) =>
    postJson<InvoiceDraftResponse>(buildDatasetPath("/api/invoices/manual-draft", datasetId), {
      ...body,
      dataset: datasetId
    }),
  uploadOcrInvoice: (file: File, datasetId?: string, providerId?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    if (datasetId) {
      formData.append("dataset", datasetId);
    }
    if (providerId) {
      formData.append("provider", providerId);
    }

    return postFormData<OcrInvoiceDraftResponse>(
      buildDatasetPath(
        providerId
          ? `/api/ocr/invoices/upload?provider=${encodeURIComponent(providerId)}`
          : "/api/ocr/invoices/upload",
        datasetId
      ),
      formData
    );
  },
  getOcrJob: (jobId: string, datasetId?: string) =>
    getJson<{
      ocrJob: OcrInvoiceJob;
      ocrResult?: import("../types.js").OcrParsedInvoiceResult;
      invoiceDraft?: import("../types.js").PurchaseInvoice;
      summary?: import("../types.js").ParsedInvoiceDraft["summary"];
      qualityReport?: OcrQualityReport;
    }>(buildDatasetPath(`/api/ocr/jobs/${jobId}`, datasetId)),
  getInvoice: (invoiceId: string, datasetId?: string) =>
    getJson<InvoiceDetailResponse>(buildDatasetPath(`/api/invoices/${invoiceId}`, datasetId)),
  confirmInvoiceReview: (
    invoiceId: string,
    body: {
      dataset?: string;
      supplierId?: string;
      invoiceDate?: string;
      invoiceNumber?: string;
      lines: Array<{
        lineId: string;
        reviewStatus: "confirmed" | "ignored";
        matchedIngredientId?: string;
        parsedQuantity: number;
        parsedUnit: string;
        parsedUnitPriceCents: number;
        parsedLineTotalCents?: number;
      }>;
    },
    datasetId?: string
  ) =>
    postJson<InvoiceConfirmResponse>(
      buildDatasetPath(`/api/invoices/${invoiceId}/review-confirm`, datasetId),
      {
        ...body,
        dataset: datasetId
      }
    ),
  getSuppliers: (datasetId?: string) =>
    getJson<Supplier[]>(buildDatasetPath("/api/suppliers", datasetId)),
  getIngredientCostHistory: (ingredientId: string, datasetId?: string) =>
    getJson<IngredientCostHistoryView>(
      buildDatasetPath(`/api/ingredients/${ingredientId}/cost-history`, datasetId)
    ),
  simulatePrice: (dishId: string, newPriceCents: number, datasetId?: string) =>
    postJson<PriceSimulationResponse>(buildDatasetPath("/api/simulate/price", datasetId), {
      dishId,
      newPriceCents
    })
};
