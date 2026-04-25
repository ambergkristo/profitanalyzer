import {
  calculateCalculatedDishes,
  calculateOverview,
  calculateRecipeCost,
  explainDishPerformance,
  rankDishActions,
  sampleRestaurantData,
  type CalculatedDish,
  type DishDetailAnalytics,
  type DishAction
} from "../../../packages/core/src/index.js";

export const restaurantData = sampleRestaurantData;

function getAnalyticsSnapshot() {
  const calculatedDishes = calculateCalculatedDishes(restaurantData);
  const actions = rankDishActions(calculatedDishes);

  return {
    calculatedDishes,
    actions,
    overview: calculateOverview(calculatedDishes)
  };
}

export function getCalculatedDishes(): CalculatedDish[] {
  return getAnalyticsSnapshot().calculatedDishes;
}

export function getAllActions(): DishAction[] {
  return getAnalyticsSnapshot().actions;
}

export function getOverview() {
  return getAnalyticsSnapshot().overview;
}

export function getDishDetail(dishId: string): DishDetailAnalytics | null {
  const dish = restaurantData.dishes.find((item) => item.id === dishId);
  if (!dish) {
    return null;
  }

  const recipe = restaurantData.recipes.find((item) => item.id === dish.recipeId);
  if (!recipe) {
    return null;
  }

  const { calculatedDishes, actions } = getAnalyticsSnapshot();
  const metrics = calculatedDishes.find((item) => item.dishId === dishId);

  if (!metrics) {
    return null;
  }

  const recipeCost = calculateRecipeCost(recipe, restaurantData.ingredients);
  const recommendedActionsForDish = actions.filter((action) => action.dishId === dishId);
  const simulationAction = recommendedActionsForDish.find(
    (action) => action.recommendedPriceCents !== undefined
  );

  return {
    dish,
    recipe,
    metrics,
    ingredientBreakdown: recipeCost.breakdown,
    explanation: explainDishPerformance(metrics),
    recommendedActionsForDish,
    simulationHints: {
      currentPriceCents: dish.priceCents,
      quickAdjustmentsCents: [50, 100, 200],
      recommendedPriceCents: simulationAction?.recommendedPriceCents,
      recommendedTargetMarginPercent: simulationAction?.targetMarginPercent,
      note: simulationAction?.recommendedPriceCents
        ? `Start by testing the suggested price and compare the new margin before changing the live menu.`
        : "Try small EUR 0.50 to EUR 2.00 price moves before changing the live menu."
    }
  };
}
