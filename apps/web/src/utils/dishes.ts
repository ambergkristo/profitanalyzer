import type { CalculatedDish, DishAction, DishFilter, DishSortKey } from "../types.js";

export function filterAndSortDishes(
  dishes: CalculatedDish[],
  filter: DishFilter,
  sortKey: DishSortKey
): CalculatedDish[] {
  const filtered = filter === "all" ? dishes : dishes.filter((dish) => dish.status === filter);

  return [...filtered].sort((left, right) => {
    switch (sortKey) {
      case "margin":
        if (left.marginPercent !== right.marginPercent) {
          return left.marginPercent - right.marginPercent;
        }
        break;
      case "estimatedProfit":
        if (right.estimatedPeriodProfitCents !== left.estimatedPeriodProfitCents) {
          return right.estimatedPeriodProfitCents - left.estimatedPeriodProfitCents;
        }
        break;
      case "salesVolume":
        if (right.salesVolume !== left.salesVolume) {
          return right.salesVolume - left.salesVolume;
        }
        break;
      case "cost":
        if (right.costCents !== left.costCents) {
          return right.costCents - left.costCents;
        }
        break;
    }

    return left.name.localeCompare(right.name);
  });
}

export function mapPrimaryActionByDish(actions: DishAction[]): Map<string, DishAction> {
  const byDish = new Map<string, DishAction>();

  for (const action of actions) {
    if (!byDish.has(action.dishId)) {
      byDish.set(action.dishId, action);
    }
  }

  return byDish;
}
