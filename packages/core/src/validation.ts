import { calculateCalculatedDishes } from "./calculations.js";
import { calculateOverview, rankDishActions } from "./decisionEngine.js";
import { canonicalDemoDatasets } from "./seed.js";
import type {
  CalculatedDish,
  DemoDatasetDefinition,
  DishAction,
  DishActionSeverity,
  ValidationReport
} from "./types.js";

function countActionTypes(actions: DishAction[]): ValidationReport["actionTypeCounts"] {
  return actions.reduce<ValidationReport["actionTypeCounts"]>((counts, action) => {
    counts[action.type] = (counts[action.type] ?? 0) + 1;
    return counts;
  }, {});
}

function countSeverities(actions: DishAction[]): ValidationReport["severityCounts"] {
  const counts: ValidationReport["severityCounts"] = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  };

  for (const action of actions) {
    counts[action.severity] += 1;
  }

  return counts;
}

function collectFiniteFailuresForDish(dish: CalculatedDish): string[] {
  const numericFields: Array<[string, number]> = [
    ["priceCents", dish.priceCents],
    ["costCents", dish.costCents],
    ["marginPercent", dish.marginPercent],
    ["grossProfitPerSaleCents", dish.grossProfitPerSaleCents],
    ["estimatedPeriodProfitCents", dish.estimatedPeriodProfitCents],
    ["salesVolume", dish.salesVolume],
    ["costRatioPercent", dish.costRatioPercent],
    ["contributionRank", dish.contributionRank]
  ];

  return numericFields
    .filter(([, value]) => !Number.isFinite(value))
    .map(([field]) => `Calculated dish ${dish.dishId} has non-finite ${field}.`);
}

function collectFiniteFailuresForAction(action: DishAction): string[] {
  const failures: string[] = [];
  const numericFields: Array<[string, number | undefined]> = [
    ["estimatedImpactCents", action.estimatedImpactCents],
    ["recommendedPriceCents", action.recommendedPriceCents],
    ["currentMarginPercent", action.currentMarginPercent],
    ["targetMarginPercent", action.targetMarginPercent]
  ];

  for (const [field, value] of numericFields) {
    if (value !== undefined && !Number.isFinite(value)) {
      failures.push(`Action ${action.id} has non-finite ${field}.`);
    }
  }

  if (action.reasonCodes.length === 0) {
    failures.push(`Action ${action.id} is missing reason codes.`);
  }

  if (!action.confidence) {
    failures.push(`Action ${action.id} is missing confidence.`);
  }

  return failures;
}

function validateProfileExpectations(
  dataset: DemoDatasetDefinition,
  actions: DishAction[],
  severityCounts: Record<DishActionSeverity, number>,
  failures: string[]
) {
  if (dataset.profile === "low-margin") {
    if (severityCounts.critical + severityCounts.high < 2) {
      failures.push("Low-margin dataset must produce at least 2 high/critical actions.");
    }
  }

  if (dataset.profile === "high-margin") {
    if (severityCounts.critical > Math.floor(actions.length / 2)) {
      failures.push("High-margin dataset should not be dominated by critical actions.");
    }
  }

  if (dataset.profile === "mixed") {
    const actionTypes = new Set(actions.map((action) => action.type));
    if (actionTypes.size < 3) {
      failures.push("Mixed dataset must produce at least 3 different action types.");
    }
  }
}

export function validateRestaurantDataset(dataset: DemoDatasetDefinition): ValidationReport {
  const calculatedDishes = calculateCalculatedDishes(dataset.data);
  const overview = calculateOverview(calculatedDishes);
  const actions = rankDishActions(calculatedDishes);
  const repeatedRanking = rankDishActions(calculatedDishes);
  const actionTypeCounts = countActionTypes(actions);
  const severityCounts = countSeverities(actions);
  const warnings = [...overview.dataQualityWarnings];
  const failures: string[] = [];

  if (actions.length < 3) {
    failures.push("Dataset must produce at least 3 ranked actions.");
  }

  if (
    JSON.stringify(actions.map((action) => action.id)) !==
    JSON.stringify(repeatedRanking.map((action) => action.id))
  ) {
    failures.push("Action ranking is not deterministic across repeated runs.");
  }

  if (overview.totalRevenueCents > 0 && !Number.isFinite(overview.weightedAverageMarginPercent)) {
    failures.push("Weighted average margin must be calculable when revenue exists.");
  }

  for (const dish of calculatedDishes) {
    failures.push(...collectFiniteFailuresForDish(dish));
  }

  for (const action of actions) {
    failures.push(...collectFiniteFailuresForAction(action));
  }

  validateProfileExpectations(dataset, actions, severityCounts, failures);

  return {
    datasetId: dataset.id,
    datasetName: dataset.name,
    totalDishes: overview.totalDishes,
    profitableCount: overview.profitableCount,
    warningCount: overview.warningCount,
    lossCount: overview.lossCount,
    averageMarginPercent: overview.averageMarginPercent,
    weightedAverageMarginPercent: overview.weightedAverageMarginPercent,
    estimatedPeriodProfitCents: overview.estimatedPeriodProfitCents,
    totalRevenueCents: overview.totalRevenueCents,
    totalCostCents: overview.totalCostCents,
    topActions: actions.slice(0, 3),
    actionTypeCounts,
    severityCounts,
    pass: failures.length === 0,
    warnings,
    failures
  };
}

export function validateCanonicalDatasets(): ValidationReport[] {
  return canonicalDemoDatasets.map((dataset) => validateRestaurantDataset(dataset));
}
