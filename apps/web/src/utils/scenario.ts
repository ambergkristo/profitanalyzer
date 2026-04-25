import type { DemoDatasetSummary } from "../types.js";

export function buildDatasetSearch(datasetId?: string): string {
  return datasetId ? `?dataset=${encodeURIComponent(datasetId)}` : "";
}

export function getScenarioDiagnosis(profile: DemoDatasetSummary["profile"]): string {
  switch (profile) {
    case "high-margin":
      return "Menu is mostly healthy. Focus on growth and protecting winners.";
    case "low-margin":
      return "Margin pressure detected. Prioritize high-sales low-margin repairs.";
    case "mixed":
      return "Mixed performance. Fix leaks while protecting top contributors.";
  }
}
