import {
  calculateCalculatedDishes,
  calculateOverview,
  calculateRecipeCost,
  explainDishPerformance,
  getCostDriverInsight,
  getDemoDataset,
  listDemoDatasets,
  rankDishActions,
  sampleRestaurantData,
  suggestPriceForTargetMargin,
  type CalculatedDish,
  type DemoDatasetDefinition,
  type DemoDatasetSummary,
  type DishAction,
  type DishDetailAnalytics,
  type SimulationTargetAction
} from "../../../packages/core/src/index.js";

export const restaurantData = sampleRestaurantData;

export function getResolvedDataset(datasetId?: string): DemoDatasetDefinition | null {
  return getDemoDataset(datasetId) ?? null;
}

export function getDemoDatasets(): DemoDatasetSummary[] {
  return listDemoDatasets();
}

function getAnalyticsSnapshot(datasetId?: string) {
  const dataset = getResolvedDataset(datasetId);

  if (!dataset) {
    return null;
  }

  const calculatedDishes = calculateCalculatedDishes(dataset.data);
  const actions = rankDishActions(calculatedDishes);

  return {
    dataset,
    calculatedDishes,
    actions,
    overview: calculateOverview(calculatedDishes)
  };
}

function buildTargetMarginActions(
  priceCents: number,
  costCents: number
): SimulationTargetAction[] {
  const targets = [50, 60]
    .map((targetMarginPercent) => {
      const targetPriceCents = suggestPriceForTargetMargin(costCents, targetMarginPercent);
      const increasePercent =
        priceCents <= 0 ? 0 : ((targetPriceCents - priceCents) / priceCents) * 100;

      return {
        label: `Reach ${targetMarginPercent}% margin`,
        targetMarginPercent,
        priceCents: targetPriceCents,
        isAggressive: increasePercent > 25
      };
    })
    .filter((target) => target.priceCents > priceCents)
    .filter((target) => target.targetMarginPercent === 50 || !target.isAggressive);

  return targets;
}

export function getCalculatedDishes(datasetId?: string): CalculatedDish[] | null {
  return getAnalyticsSnapshot(datasetId)?.calculatedDishes ?? null;
}

export function getAllActions(datasetId?: string): DishAction[] | null {
  return getAnalyticsSnapshot(datasetId)?.actions ?? null;
}

export function getOverview(datasetId?: string) {
  return getAnalyticsSnapshot(datasetId)?.overview ?? null;
}

export function getDishDetail(dishId: string, datasetId?: string): DishDetailAnalytics | null {
  const snapshot = getAnalyticsSnapshot(datasetId);

  if (!snapshot) {
    return null;
  }

  const dish = snapshot.dataset.data.dishes.find((item) => item.id === dishId);
  if (!dish) {
    return null;
  }

  const recipe = snapshot.dataset.data.recipes.find((item) => item.id === dish.recipeId);
  if (!recipe) {
    return null;
  }

  const metrics = snapshot.calculatedDishes.find((item) => item.dishId === dishId);

  if (!metrics) {
    return null;
  }

  const recipeCost = calculateRecipeCost(recipe, snapshot.dataset.data.ingredients);
  const recommendedActionsForDish = snapshot.actions.filter((action) => action.dishId === dishId);
  const simulationAction = recommendedActionsForDish.find(
    (action) => action.recommendedPriceCents !== undefined
  );
  const costDriverInsight = getCostDriverInsight(recipeCost.breakdown);

  return {
    dish,
    recipe,
    metrics,
    ingredientBreakdown: recipeCost.breakdown,
    costDriverInsight,
    explanation: explainDishPerformance(metrics),
    recommendedActionsForDish,
    simulationHints: {
      currentPriceCents: dish.priceCents,
      quickAdjustmentsCents: [50, 100, 200],
      targetMarginActions: buildTargetMarginActions(dish.priceCents, metrics.costCents),
      recommendedPriceCents: simulationAction?.recommendedPriceCents,
      recommendedTargetMarginPercent: simulationAction?.targetMarginPercent,
      note: simulationAction?.recommendedPriceCents
        ? `Use the suggested price as a decision test, then compare the new margin before touching the live menu.`
        : "Start with a small price move and compare the simulated status change before updating the live menu."
    }
  };
}
