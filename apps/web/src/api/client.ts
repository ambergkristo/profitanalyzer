import type { CalculatedDish, DishDetailResponse, OverviewResponse } from "../types.js";

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Request failed for ${path} with ${response.status}`);
  }

  return (await response.json()) as T;
}

export const apiClient = {
  getOverview: () => getJson<OverviewResponse>("/api/analytics/overview"),
  getDishes: () => getJson<CalculatedDish[]>("/api/analytics/dishes"),
  getDishDetail: (dishId: string) => getJson<DishDetailResponse>(`/api/analytics/dish/${dishId}`)
};
