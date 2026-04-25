import { type CalculatedDish, type OverviewMetrics, type RankedDishAction } from "./types.js";

const severityRank = {
  urgent: 3,
  warning: 2,
  opportunity: 1
} as const;

function estimateTargetImpact(dish: CalculatedDish, targetMarginPercent: number): number {
  const targetGrossProfit = Math.max(0, Math.round((dish.priceCents * targetMarginPercent) / 100));
  const improvementPerSale = Math.max(0, targetGrossProfit - dish.grossProfitPerSaleCents);

  return improvementPerSale * dish.salesVolume;
}

export function rankDishActions(calculatedDishes: CalculatedDish[]): RankedDishAction[] {
  const averageSalesVolume =
    calculatedDishes.length === 0
      ? 0
      : calculatedDishes.reduce((sum, dish) => sum + dish.salesVolume, 0) / calculatedDishes.length;

  const actions = calculatedDishes.flatMap<RankedDishAction>((dish) => {
    if (dish.marginPercent < 30) {
      return [
        {
          id: `urgent-margin-${dish.dishId}`,
          type: "urgent_margin_repair",
          title: `Repair ${dish.name} margin now`,
          message: `${dish.name} is below the 30% margin floor. Review price or recipe cost immediately.`,
          dishId: dish.dishId,
          severity: "urgent",
          estimatedImpactCents: estimateTargetImpact(dish, 30),
          confidence: dish.warnings.length === 0 ? "high" : "medium"
        }
      ];
    }

    if (dish.salesVolume >= averageSalesVolume && dish.marginPercent < 50) {
      return [
        {
          id: `price-review-${dish.dishId}`,
          type: "price_review",
          title: `Review ${dish.name} pricing`,
          message: `${dish.name} sells well but margin is weak. A small price update may unlock profit quickly.`,
          dishId: dish.dishId,
          severity: "urgent",
          estimatedImpactCents: estimateTargetImpact(dish, 50),
          confidence: dish.warnings.length === 0 ? "high" : "medium"
        }
      ];
    }

    if (dish.marginPercent < 50) {
      return [
        {
          id: `warning-review-${dish.dishId}`,
          type: "warning_review",
          title: `Watch ${dish.name} closely`,
          message: `${dish.name} is in the 30-50% margin band. Review cost drivers before it becomes a loss item.`,
          dishId: dish.dishId,
          severity: "warning",
          estimatedImpactCents: estimateTargetImpact(dish, 50),
          confidence: dish.warnings.length === 0 ? "medium" : "low"
        }
      ];
    }

    if (dish.marginPercent >= 50 && dish.salesVolume < averageSalesVolume) {
      return [
        {
          id: `promotion-${dish.dishId}`,
          type: "promotion_opportunity",
          title: `Promote ${dish.name}`,
          message: `${dish.name} has strong margin but lower sales volume. It may be worth featuring more prominently.`,
          dishId: dish.dishId,
          severity: "opportunity",
          estimatedImpactCents: Math.max(0, Math.round(dish.grossProfitPerSaleCents * Math.max(1, dish.salesVolume * 0.1))),
          confidence: dish.warnings.length === 0 ? "medium" : "low"
        }
      ];
    }

    return [];
  });

  return actions.sort((left, right) => {
    const severityDifference = severityRank[right.severity] - severityRank[left.severity];
    if (severityDifference !== 0) {
      return severityDifference;
    }

    return right.estimatedImpactCents - left.estimatedImpactCents;
  });
}

export function calculateOverview(calculatedDishes: CalculatedDish[]): OverviewMetrics {
  const profitableCount = calculatedDishes.filter((dish) => dish.status === "profitable").length;
  const warningCount = calculatedDishes.filter((dish) => dish.status === "warning").length;
  const lossCount = calculatedDishes.filter((dish) => dish.status === "loss").length;
  const totalMargin = calculatedDishes.reduce((sum, dish) => sum + dish.marginPercent, 0);
  const estimatedPeriodProfitCents = calculatedDishes.reduce(
    (sum, dish) => sum + dish.estimatedPeriodProfitCents,
    0
  );

  return {
    totalDishes: calculatedDishes.length,
    profitableCount,
    warningCount,
    lossCount,
    averageMarginPercent:
      calculatedDishes.length === 0 ? 0 : Number((totalMargin / calculatedDishes.length).toFixed(2)),
    estimatedPeriodProfitCents,
    topActions: rankDishActions(calculatedDishes).slice(0, 3)
  };
}
