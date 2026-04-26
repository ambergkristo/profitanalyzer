import type { CalculatedDish, DishAction, DishFilter, DishSortKey } from "../types.js";

const severityPriority = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1
} as const;

export function filterAndSortDishes(
  dishes: CalculatedDish[],
  filter: DishFilter,
  sortKey: DishSortKey,
  primaryActions = new Map<string, DishAction>()
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
      case "riskPriority": {
        const leftAction = primaryActions.get(left.dishId);
        const rightAction = primaryActions.get(right.dishId);
        const leftSeverity = leftAction ? severityPriority[leftAction.severity] : 0;
        const rightSeverity = rightAction ? severityPriority[rightAction.severity] : 0;

        if (rightSeverity !== leftSeverity) {
          return rightSeverity - leftSeverity;
        }

        if ((rightAction?.estimatedImpactCents ?? 0) !== (leftAction?.estimatedImpactCents ?? 0)) {
          return (rightAction?.estimatedImpactCents ?? 0) - (leftAction?.estimatedImpactCents ?? 0);
        }

        if (right.salesVolume !== left.salesVolume) {
          return right.salesVolume - left.salesVolume;
        }
        break;
      }
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
