import {
  type CalculatedDish,
  type CalculationWarning,
  type Dish,
  type DishStatus,
  type Ingredient,
  type Recipe,
  type RecipeCostResult
} from "./types.js";

const roundCurrency = (value: number) => Math.round(value);

export function getDishStatus(marginPercent: number): DishStatus {
  if (marginPercent < 30) {
    return "loss";
  }

  if (marginPercent < 50) {
    return "warning";
  }

  return "profitable";
}

export function calculateRecipeCost(recipe: Recipe, ingredients: Ingredient[]): RecipeCostResult {
  const warnings: CalculationWarning[] = [];

  if (recipe.yield <= 0) {
    warnings.push({
      code: "INVALID_YIELD",
      message: `Recipe "${recipe.name}" has invalid yield ${recipe.yield}.`
    });

    return { costCents: 0, warnings, breakdown: [] };
  }

  let totalCost = 0;

  const breakdown = recipe.ingredients.map((item) => {
    const ingredient = ingredients.find((candidate) => candidate.id === item.ingredientId);

    if (!ingredient) {
      warnings.push({
        code: "MISSING_INGREDIENT",
        ingredientId: item.ingredientId,
        message: `Missing ingredient ${item.ingredientId} for recipe "${recipe.name}".`
      });

      return {
        ingredientId: item.ingredientId,
        ingredientName: "Missing ingredient",
        quantity: item.quantity,
        unit: item.unit,
        unitCostCents: null,
        totalCostCents: 0,
        isMissing: true
      };
    }

    if (ingredient.unit !== item.unit) {
      warnings.push({
        code: "UNIT_MISMATCH",
        ingredientId: item.ingredientId,
        message: `Unit mismatch for ${ingredient.name}: ingredient is ${ingredient.unit}, recipe uses ${item.unit}.`
      });
    }

    const ingredientCost = roundCurrency(ingredient.costPerUnitCents * item.quantity);
    totalCost += ingredientCost;

    return {
      ingredientId: ingredient.id,
      ingredientName: ingredient.name,
      quantity: item.quantity,
      unit: item.unit,
      unitCostCents: ingredient.costPerUnitCents,
      totalCostCents: ingredientCost,
      isMissing: false
    };
  });

  return {
    costCents: roundCurrency(totalCost / recipe.yield),
    warnings,
    breakdown
  };
}

export function calculateDishMetrics(
  dish: Dish,
  recipe: Recipe,
  ingredients: Ingredient[]
): CalculatedDish {
  const recipeCost = calculateRecipeCost(recipe, ingredients);
  const costCents = recipeCost.costCents;
  const grossProfitPerSaleCents = dish.priceCents - costCents;
  const marginPercent = dish.priceCents > 0 ? Number((((dish.priceCents - costCents) / dish.priceCents) * 100).toFixed(2)) : 0;
  const estimatedPeriodProfitCents = grossProfitPerSaleCents * dish.salesVolume;

  return {
    dishId: dish.id,
    name: dish.name,
    priceCents: dish.priceCents,
    costCents,
    marginPercent,
    grossProfitPerSaleCents,
    estimatedPeriodProfitCents,
    salesVolume: dish.salesVolume,
    status: getDishStatus(marginPercent),
    warnings: recipeCost.warnings
  };
}
