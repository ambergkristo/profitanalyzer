import type { DemoDatasetSummary } from "../types.js";

export function buildDatasetSearch(datasetId?: string): string {
  return datasetId ? `?dataset=${encodeURIComponent(datasetId)}` : "";
}

export function getScenarioMeta(
  datasets: DemoDatasetSummary[],
  datasetId?: string
): DemoDatasetSummary | undefined {
  return datasets.find((dataset) => dataset.id === datasetId) ?? datasets[0];
}
