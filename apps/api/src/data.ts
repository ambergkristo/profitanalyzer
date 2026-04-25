import {
  calculateDishMetrics,
  calculateOverview,
  calculateRecipeCost,
  sampleRestaurantData,
  type CalculatedDish
} from "../../../packages/core/src/index.js";

export const restaurantData = sampleRestaurantData;

export function getCalculatedDishes(): CalculatedDish[] {
  return restaurantData.dishes.map((dish) => {
    const recipe = restaurantData.recipes.find((item) => item.id === dish.recipeId);
    if (!recipe) {
      throw new Error(`Missing recipe ${dish.recipeId} for dish ${dish.name}.`);
    }

    return calculateDishMetrics(dish, recipe, restaurantData.ingredients);
  });
}

export function getOverview() {
  return calculateOverview(getCalculatedDishes());
}

export function getDishDetail(dishId: string) {
  const dish = restaurantData.dishes.find((item) => item.id === dishId);
  if (!dish) {
    return null;
  }

  const recipe = restaurantData.recipes.find((item) => item.id === dish.recipeId);
  if (!recipe) {
    return null;
  }

  const metrics = calculateDishMetrics(dish, recipe, restaurantData.ingredients);
  const recipeCost = calculateRecipeCost(recipe, restaurantData.ingredients);
  const topCostDriver = recipeCost.breakdown
    .filter((item) => !item.isMissing)
    .sort((left, right) => right.totalCostCents - left.totalCostCents)[0];

  const explanation = topCostDriver
    ? `${topCostDriver.ingredientName} is the main cost driver at €${(topCostDriver.totalCostCents / 100).toFixed(2)} per serving.`
    : "No cost driver explanation is available because recipe inputs are incomplete.";

  return {
    dish,
    recipe,
    ingredientBreakdown: recipeCost.breakdown,
    calculated: metrics,
    status: metrics.status,
    explanation,
    whyThisMatters:
      metrics.status === "loss"
        ? "This dish is destroying margin and should be reviewed immediately."
        : metrics.status === "warning"
          ? "This dish still sells, but the current margin leaves little room for cost increases."
          : "This dish is contributing healthy profit and can support promotion or premium positioning."
  };
}
