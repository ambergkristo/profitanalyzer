import type {
  CalculatedDish,
  DemoDatasetSummary,
  DishAction,
  DishDetailResponse,
  OverviewResponse,
  PriceSimulationResponse
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
  getActions: (datasetId?: string) =>
    getJson<DishAction[]>(buildDatasetPath("/api/analytics/actions", datasetId)),
  getDishDetail: (dishId: string, datasetId?: string) =>
    getJson<DishDetailResponse>(buildDatasetPath(`/api/analytics/dish/${dishId}`, datasetId)),
  simulatePrice: (dishId: string, newPriceCents: number, datasetId?: string) =>
    postJson<PriceSimulationResponse>(buildDatasetPath("/api/simulate/price", datasetId), {
      dishId,
      newPriceCents
    })
};
