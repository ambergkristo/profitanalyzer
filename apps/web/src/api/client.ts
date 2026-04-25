import type {
  CalculatedDish,
  DishAction,
  DishDetailResponse,
  OverviewResponse,
  PriceSimulationResponse
} from "../types.js";

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
  getOverview: () => getJson<OverviewResponse>("/api/analytics/overview"),
  getDishes: () => getJson<CalculatedDish[]>("/api/analytics/dishes"),
  getActions: () => getJson<DishAction[]>("/api/analytics/actions"),
  getDishDetail: (dishId: string) => getJson<DishDetailResponse>(`/api/analytics/dish/${dishId}`),
  simulatePrice: (dishId: string, newPriceCents: number) =>
    postJson<PriceSimulationResponse>("/api/simulate/price", { dishId, newPriceCents })
};
