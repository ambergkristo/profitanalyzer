import {
  type CalculatedDish,
  type CalculationWarning,
  type CostDriverInsight,
  type Dish,
  type DishPerformanceExplanation,
  type DishStatus,
  type Ingredient,
  type IngredientCostBreakdown,
  type PriceSimulationResult,
  type Recipe,
  type RecipeCostResult,
  type SampleRestaurantData
} from "./types.js";

const HIGH_MARGIN_THRESHOLD = 60;
const WARNING_MARGIN_THRESHOLD = 50;
const LOSS_MARGIN_THRESHOLD = 30;

const restaurantFriendlyEndings = [0, 50, 90];

const roundCurrency = (value: number) => Math.round(value);
const roundPercent = (value: number) => Number(value.toFixed(2));

function formatCurrencyLabel(cents: number): string {
  return `\u20AC${(cents / 100).toFixed(2)}`;
}

export function calculateCostRatio(priceCents: number, costCents: number): number {
  if (priceCents <= 0) {
    return 0;
  }

  return roundPercent((costCents / priceCents) * 100);
}

export function calculateGrossProfitPerSale(priceCents: number, costCents: number): number {
  return roundCurrency(priceCents - costCents);
}

export function calculateEstimatedPeriodProfit(
  grossProfitPerSaleCents: number,
  salesVolume: number
): number {
  return roundCurrency(grossProfitPerSaleCents * salesVolume);
}

export function getDishStatus(marginPercent: number): DishStatus {
  if (marginPercent < LOSS_MARGIN_THRESHOLD) {
    return "loss";
  }

  if (marginPercent < WARNING_MARGIN_THRESHOLD) {
    return "warning";
  }

  return "profitable";
}

export function roundToRestaurantFriendlyPrice(priceCents: number): number {
  const safePriceCents = Math.max(0, Math.ceil(priceCents));
  const baseEuros = Math.floor(safePriceCents / 100);

  for (let euroOffset = 0; euroOffset <= 1; euroOffset += 1) {
    for (const ending of restaurantFriendlyEndings) {
      const candidate = (baseEuros + euroOffset) * 100 + ending;
      if (candidate >= safePriceCents) {
        return candidate;
      }
    }
  }

  return Math.ceil(safePriceCents / 100) * 100;
}

export function suggestPriceForTargetMargin(
  costCents: number,
  targetMarginPercent: number
): number {
  const normalizedTarget = Math.min(95, Math.max(1, targetMarginPercent));
  const divisor = 1 - normalizedTarget / 100;
  const rawSuggestion = divisor <= 0 ? costCents : Math.ceil(costCents / divisor);

  return roundToRestaurantFriendlyPrice(rawSuggestion);
}

function buildMissingIngredientBreakdownItem(item: Recipe["ingredients"][number]): IngredientCostBreakdown {
  return {
    ingredientId: item.ingredientId,
    ingredientName: "Missing ingredient",
    quantity: item.quantity,
    unit: item.unit,
    unitCostCents: null,
    lineCostCents: 0,
    percentOfDishCost: 0,
    isMissing: true,
    warning: "Missing ingredient cost data."
  };
}

function buildYieldWarning(recipe: Recipe): CalculationWarning {
  return {
    code: "INVALID_YIELD",
    message: `Recipe "${recipe.name}" has invalid yield ${recipe.yield}.`
  };
}

export function getIngredientBreakdown(
  recipe: Recipe,
  ingredients: Ingredient[]
): IngredientCostBreakdown[] {
  if (recipe.yield <= 0) {
    return recipe.ingredients.map((item) => {
      const ingredient = ingredients.find((candidate) => candidate.id === item.ingredientId);

      return {
        ingredientId: ingredient?.id ?? item.ingredientId,
        ingredientName: ingredient?.name ?? "Missing ingredient",
        quantity: item.quantity,
        unit: item.unit,
        unitCostCents: ingredient?.costPerUnitCents ?? null,
        lineCostCents: 0,
        percentOfDishCost: 0,
        isMissing: ingredient === undefined,
        warning: "Recipe yield is invalid, so per-dish cost cannot be trusted."
      };
    });
  }

  const rawBreakdown = recipe.ingredients.map<IngredientCostBreakdown>((item) => {
    const ingredient = ingredients.find((candidate) => candidate.id === item.ingredientId);

    if (!ingredient) {
      return buildMissingIngredientBreakdownItem(item);
    }

    const warning =
      ingredient.unit !== item.unit
        ? `Unit mismatch: recipe uses ${item.unit}, ingredient is tracked in ${ingredient.unit}.`
        : undefined;

    return {
      ingredientId: ingredient.id,
      ingredientName: ingredient.name,
      quantity: item.quantity,
      unit: item.unit,
      unitCostCents: ingredient.costPerUnitCents,
      lineCostCents: roundCurrency((ingredient.costPerUnitCents * item.quantity) / recipe.yield),
      percentOfDishCost: 0,
      isMissing: false,
      warning
    };
  });

  const totalKnownCost = rawBreakdown.reduce((sum, item) => sum + item.lineCostCents, 0);

  return rawBreakdown.map((item) => ({
    ...item,
    percentOfDishCost:
      totalKnownCost === 0 ? 0 : roundPercent((item.lineCostCents / totalKnownCost) * 100)
  }));
}

export function getCostDriverInsight(
  breakdown: IngredientCostBreakdown[]
): CostDriverInsight | undefined {
  const topCostDriver = [...breakdown]
    .filter((item) => !item.isMissing)
    .sort((left, right) => right.lineCostCents - left.lineCostCents)[0];

  if (!topCostDriver) {
    return undefined;
  }

  const isDominant = topCostDriver.percentOfDishCost > 35;

  return {
    ingredientId: topCostDriver.ingredientId,
    ingredientName: topCostDriver.ingredientName,
    lineCostCents: topCostDriver.lineCostCents,
    percentOfDishCost: topCostDriver.percentOfDishCost,
    isDominant,
    message: isDominant
      ? `${topCostDriver.ingredientName} is driving ${topCostDriver.percentOfDishCost.toFixed(1)}% of the dish cost.`
      : `${topCostDriver.ingredientName} is the largest single cost input in this dish.`
  };
}

export function calculateRecipeCost(recipe: Recipe, ingredients: Ingredient[]): RecipeCostResult {
  if (recipe.yield <= 0) {
    return {
      costCents: 0,
      warnings: [buildYieldWarning(recipe)],
      breakdown: getIngredientBreakdown(recipe, ingredients)
    };
  }

  const breakdown = getIngredientBreakdown(recipe, ingredients);
  const warnings: CalculationWarning[] = [];

  for (const item of recipe.ingredients) {
    const ingredient = ingredients.find((candidate) => candidate.id === item.ingredientId);

    if (!ingredient) {
      warnings.push({
        code: "MISSING_INGREDIENT",
        ingredientId: item.ingredientId,
        message: `Missing ingredient ${item.ingredientId} for recipe "${recipe.name}".`
      });
      continue;
    }

    if (ingredient.unit !== item.unit) {
      warnings.push({
        code: "UNIT_MISMATCH",
        ingredientId: item.ingredientId,
        message: `Unit mismatch for ${ingredient.name}: ingredient is ${ingredient.unit}, recipe uses ${item.unit}.`
      });
    }
  }

  return {
    costCents: breakdown.reduce((sum, item) => sum + item.lineCostCents, 0),
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
  const grossProfitPerSaleCents = calculateGrossProfitPerSale(dish.priceCents, costCents);
  const marginPercent =
    dish.priceCents > 0
      ? roundPercent(((dish.priceCents - costCents) / dish.priceCents) * 100)
      : 0;

  return {
    dishId: dish.id,
    name: dish.name,
    priceCents: dish.priceCents,
    costCents,
    marginPercent,
    grossProfitPerSaleCents,
    estimatedPeriodProfitCents: calculateEstimatedPeriodProfit(
      grossProfitPerSaleCents,
      dish.salesVolume
    ),
    salesVolume: dish.salesVolume,
    status: getDishStatus(marginPercent),
    costRatioPercent: calculateCostRatio(dish.priceCents, costCents),
    contributionRank: 0,
    warnings: recipeCost.warnings
  };
}

export function calculateCalculatedDishes(
  restaurantData: SampleRestaurantData
): CalculatedDish[] {
  const calculated = restaurantData.dishes.map((dish) => {
    const recipe = restaurantData.recipes.find((item) => item.id === dish.recipeId);
    if (!recipe) {
      throw new Error(`Missing recipe ${dish.recipeId} for dish ${dish.name}.`);
    }

    return calculateDishMetrics(dish, recipe, restaurantData.ingredients);
  });

  const rankMap = new Map(
    [...calculated]
      .sort((left, right) => {
        if (right.estimatedPeriodProfitCents !== left.estimatedPeriodProfitCents) {
          return right.estimatedPeriodProfitCents - left.estimatedPeriodProfitCents;
        }

        return left.dishId.localeCompare(right.dishId);
      })
      .map((dish, index) => [dish.dishId, index + 1])
  );

  return calculated.map((dish) => ({
    ...dish,
    contributionRank: rankMap.get(dish.dishId) ?? calculated.length
  }));
}

export function explainDishPerformance(
  calculatedDish: CalculatedDish
): DishPerformanceExplanation {
  const reasonCodes = new Set<DishPerformanceExplanation["reasonCodes"][number]>();
  const highlights = [
    `Margin is ${calculatedDish.marginPercent.toFixed(1)}% with ${formatCurrencyLabel(
      calculatedDish.grossProfitPerSaleCents
    )} gross profit per sale.`,
    `Estimated current-period profit is ${formatCurrencyLabel(
      calculatedDish.estimatedPeriodProfitCents
    )} across ${calculatedDish.salesVolume} sales.`,
    `Ingredient cost consumes ${calculatedDish.costRatioPercent.toFixed(1)}% of the selling price.`
  ];

  if (calculatedDish.warnings.length > 0) {
    reasonCodes.add("MISSING_COST_DATA");
    highlights.push("Some recipe inputs are incomplete, so confidence is reduced.");
  }

  if (calculatedDish.grossProfitPerSaleCents < 0) {
    reasonCodes.add("LOSS_MARGIN");
    reasonCodes.add("NEGATIVE_PROFIT_PER_SALE");
  } else if (calculatedDish.marginPercent < LOSS_MARGIN_THRESHOLD) {
    reasonCodes.add("LOSS_MARGIN");
    reasonCodes.add("LOW_MARGIN");
  } else if (calculatedDish.marginPercent < WARNING_MARGIN_THRESHOLD) {
    reasonCodes.add("LOW_MARGIN");
  }

  if (calculatedDish.marginPercent >= HIGH_MARGIN_THRESHOLD && calculatedDish.salesVolume <= 80) {
    reasonCodes.add("HIGH_MARGIN_LOW_SALES");
  }

  if (calculatedDish.contributionRank <= 3 && calculatedDish.estimatedPeriodProfitCents > 0) {
    reasonCodes.add("STRONG_PROFIT_CONTRIBUTOR");
    highlights.push(`This dish ranks #${calculatedDish.contributionRank} for current-period profit contribution.`);
  }

  let headline = `${calculatedDish.name} is holding a healthy margin`;
  let summary =
    "The dish is generating usable gross profit and does not need immediate margin repair.";

  if (reasonCodes.has("NEGATIVE_PROFIT_PER_SALE")) {
    headline = `${calculatedDish.name} loses money every time it sells`;
    summary =
      "The current price does not cover ingredient cost, so every additional sale deepens the profit leak.";
  } else if (reasonCodes.has("LOSS_MARGIN")) {
    headline = `${calculatedDish.name} is below the acceptable margin floor`;
    summary =
      "The dish is technically profitable per sale or close to break-even, but the current margin leaves too little room for supplier cost movement.";
  } else if (reasonCodes.has("LOW_MARGIN")) {
    headline = `${calculatedDish.name} is profitable but exposed`;
    summary =
      "The dish still contributes profit, yet the margin is thin enough that a small cost increase could turn it into a problem.";
  } else if (reasonCodes.has("HIGH_MARGIN_LOW_SALES")) {
    headline = `${calculatedDish.name} is a strong margin item with room to grow`;
    summary =
      "The dish keeps a premium margin, but it is not selling enough times to fully capitalize on that strength.";
  }

  return {
    headline,
    summary,
    highlights,
    reasonCodes: [...reasonCodes]
  };
}

export function simulateDishPriceChange(
  dish: Dish,
  recipe: Recipe,
  ingredients: Ingredient[],
  newPriceCents: number
): PriceSimulationResult {
  const oldMetrics = calculateDishMetrics(dish, recipe, ingredients);
  const newMetrics = calculateDishMetrics({ ...dish, priceCents: newPriceCents }, recipe, ingredients);
  const profitDeltaCents =
    newMetrics.estimatedPeriodProfitCents - oldMetrics.estimatedPeriodProfitCents;
  const grossProfitPerSaleDeltaCents =
    newMetrics.grossProfitPerSaleCents - oldMetrics.grossProfitPerSaleCents;
  const statusShift = `${oldMetrics.status} to ${newMetrics.status}`;

  const message =
    profitDeltaCents > 0
      ? `At ${formatCurrencyLabel(newPriceCents)} this dish would move from ${oldMetrics.marginPercent.toFixed(
          1
        )}% to ${newMetrics.marginPercent.toFixed(
          1
        )}% margin, shift from ${statusShift}, and add about ${formatCurrencyLabel(
          profitDeltaCents
        )} per period at current sales volume.`
      : profitDeltaCents < 0
        ? `At ${formatCurrencyLabel(newPriceCents)} this dish would fall from ${oldMetrics.marginPercent.toFixed(
            1
          )}% to ${newMetrics.marginPercent.toFixed(
            1
          )}% margin, shift from ${statusShift}, and give up about ${formatCurrencyLabel(
            Math.abs(profitDeltaCents)
          )} per period at current sales volume.`
        : `At ${formatCurrencyLabel(newPriceCents)} this dish would stay near the current margin and period profit.`;

  return {
    dishId: dish.id,
    oldPriceCents: dish.priceCents,
    newPriceCents,
    oldMarginPercent: oldMetrics.marginPercent,
    newMarginPercent: newMetrics.marginPercent,
    oldEstimatedPeriodProfitCents: oldMetrics.estimatedPeriodProfitCents,
    newEstimatedPeriodProfitCents: newMetrics.estimatedPeriodProfitCents,
    profitDeltaCents,
    grossProfitPerSaleDeltaCents,
    statusBefore: oldMetrics.status,
    statusAfter: newMetrics.status,
    message
  };
}
