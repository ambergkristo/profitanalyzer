import type {
  InvoiceConfirmResponse,
  InvoiceDetailResponse,
  InvoiceDraftResponse,
  Ingredient,
  IngredientCostHistory,
  MockInvoiceSampleSummary,
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
    throw new Error(`Request failed for ${path} with ${response.status}`);
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
    throw new Error(`Request failed for ${path} with ${response.status}`);
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
  getInvoiceSamples: () => getJson<MockInvoiceSampleSummary[]>("/api/invoices/samples"),
  parseMockInvoiceSample: (sampleInvoiceId: string, datasetId?: string) =>
    postJson<InvoiceDraftResponse>(buildDatasetPath("/api/invoices/parse-mock", datasetId), {
      sampleInvoiceId,
      dataset: datasetId
    }),
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
    getJson<IngredientCostHistory[]>(
      buildDatasetPath(`/api/ingredients/${ingredientId}/cost-history`, datasetId)
    ),
  simulatePrice: (dishId: string, newPriceCents: number, datasetId?: string) =>
    postJson<PriceSimulationResponse>(buildDatasetPath("/api/simulate/price", datasetId), {
      dishId,
      newPriceCents
    })
};
