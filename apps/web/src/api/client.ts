import type {
  InvoiceConfirmResponse,
  InvoiceDetailResponse,
  InvoiceDraftResponse,
  Ingredient,
  IngredientCostHistoryView,
  ManualInvoiceDraftInput,
  MockInvoiceSampleSummary,
  OcrInvoiceDraftResponse,
  OcrInvoiceJob,
  OcrProviderConfig,
  OcrQualityReport,
  PriceChangeAlert,
  CalculatedDish,
  DemoDatasetSummary,
  DishAction,
  DishDetailResponse,
  OverviewResponse,
  PriceSimulationResponse,
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
  getDemoDatasets: () => getJson<DemoDatasetSummary[]>("/api/demo/datasets"),
  getOverview: (datasetId?: string) =>
    getJson<OverviewResponse>(buildDatasetPath("/api/analytics/overview", datasetId)),
  getDishes: (datasetId?: string) =>
    getJson<CalculatedDish[]>(buildDatasetPath("/api/analytics/dishes", datasetId)),
  getIngredients: (datasetId?: string) =>
    getJson<Ingredient[]>(buildDatasetPath("/api/ingredients", datasetId)),
  getActions: (datasetId?: string) =>
    getJson<DishAction[]>(buildDatasetPath("/api/analytics/actions", datasetId)),
  getDishDetail: (dishId: string, datasetId?: string) =>
    getJson<DishDetailResponse>(buildDatasetPath(`/api/analytics/dish/${dishId}`, datasetId)),
  getPriceChangeAlerts: (datasetId?: string) =>
    getJson<PriceChangeAlert[]>(buildDatasetPath("/api/alerts/price-changes", datasetId)),
  getOcrProviders: () => getJson<OcrProviderConfig[]>("/api/ocr/providers"),
  getOcrJobs: (datasetId?: string) =>
    getJson<OcrInvoiceJob[]>(buildDatasetPath("/api/ocr/jobs", datasetId)),
  getInvoiceSamples: () => getJson<MockInvoiceSampleSummary[]>("/api/invoices/samples"),
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
