import {
  type CalculatedDish,
  type DishAction,
  type DishActionConfidence,
  type DishActionReasonCode,
  type DishActionSeverity,
  type OverviewMetrics,
  type PriceChangeAlert
} from "./types.js";
import { suggestPriceForTargetMargin } from "./calculations.js";

const severityWeight: Record<DishActionSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1
};

const confidenceWeight: Record<DishActionConfidence, number> = {
  high: 3,
  medium: 2,
  low: 1
};

function formatCurrencyLabel(cents: number): string {
  return `EUR ${(cents / 100).toFixed(2)}`;
}

function getBaseConfidence(
  dish: CalculatedDish,
  inferred: boolean,
  materiallyPartial = false
): DishActionConfidence {
  if (materiallyPartial) {
    return "low";
  }

  if (dish.warnings.length > 0) {
    return "medium";
  }

  return inferred ? "medium" : "high";
}

function getSalesStats(calculatedDishes: CalculatedDish[]) {
  const averageSalesVolume =
    calculatedDishes.length === 0
      ? 0
      : calculatedDishes.reduce((sum, dish) => sum + dish.salesVolume, 0) / calculatedDishes.length;

  const averageEstimatedProfit =
    calculatedDishes.length === 0
      ? 0
      : calculatedDishes.reduce((sum, dish) => sum + dish.estimatedPeriodProfitCents, 0) /
        calculatedDishes.length;

  return {
    averageSalesVolume,
    averageEstimatedProfit
  };
}

function getRecommendedPrice(dish: CalculatedDish, targetMargins: number[]) {
  const evaluated = targetMargins
    .map((targetMarginPercent) => {
      const recommendedPriceCents = suggestPriceForTargetMargin(
        dish.costCents,
        targetMarginPercent
      );
      const increasePercent =
        dish.priceCents <= 0
          ? 0
          : Number(
              (((recommendedPriceCents - dish.priceCents) / dish.priceCents) * 100).toFixed(2)
            );

      return {
        targetMarginPercent,
        recommendedPriceCents,
        increasePercent
      };
    })
    .filter((candidate) => candidate.recommendedPriceCents > dish.priceCents);

  if (evaluated.length === 0) {
    return null;
  }

  const nonAggressive = evaluated.find((candidate) => candidate.increasePercent <= 25);
  const chosen =
    nonAggressive ??
    [...evaluated].sort(
      (left, right) => left.recommendedPriceCents - right.recommendedPriceCents
    )[0];

  return {
    ...chosen,
    isAggressive: chosen.increasePercent > 25
  };
}

function getEstimatedPriceImpact(
  dish: CalculatedDish,
  recommendedPriceCents: number | undefined
): number {
  if (!recommendedPriceCents || recommendedPriceCents <= dish.priceCents) {
    return 0;
  }

  return (recommendedPriceCents - dish.priceCents) * dish.salesVolume;
}

function dedupeReasonCodes(reasonCodes: DishActionReasonCode[]) {
  return [...new Set(reasonCodes)];
}

function compareSeverity(left: DishActionSeverity, right: DishActionSeverity) {
  return severityWeight[left] - severityWeight[right];
}

function sortActions(actions: DishAction[], calculatedDishes: CalculatedDish[]) {
  return actions.sort((left, right) => {
    const severityDifference = severityWeight[right.severity] - severityWeight[left.severity];
    if (severityDifference !== 0) {
      return severityDifference;
    }

    if (right.estimatedImpactCents !== left.estimatedImpactCents) {
      return right.estimatedImpactCents - left.estimatedImpactCents;
    }

    const rightSalesVolume =
      calculatedDishes.find((dish) => dish.dishId === right.dishId)?.salesVolume ?? 0;
    const leftSalesVolume =
      calculatedDishes.find((dish) => dish.dishId === left.dishId)?.salesVolume ?? 0;

    if (rightSalesVolume !== leftSalesVolume) {
      return rightSalesVolume - leftSalesVolume;
    }

    const confidenceDifference =
      confidenceWeight[right.confidence] - confidenceWeight[left.confidence];
    if (confidenceDifference !== 0) {
      return confidenceDifference;
    }

    return left.id.localeCompare(right.id);
  });
}

function buildPrimaryAction(
  dish: CalculatedDish,
  averageSalesVolume: number,
  averageEstimatedProfit: number
): DishAction | null {
  const highSales = dish.salesVolume >= averageSalesVolume;
  const strongContributor =
    dish.contributionRank <= 3 || dish.estimatedPeriodProfitCents >= averageEstimatedProfit;

  if (dish.grossProfitPerSaleCents < 0) {
    const recommendation = getRecommendedPrice(dish, [50]);
    const reasonCodes: DishActionReasonCode[] = [
      "LOSS_MARGIN",
      "NEGATIVE_PROFIT_PER_SALE",
      "PRICE_SIMULATION_UPSIDE"
    ];

    if (recommendation?.isAggressive) {
      reasonCodes.push("AGGRESSIVE_PRICE_INCREASE");
    }

    return {
      id: `margin-repair-${dish.dishId}`,
      type: "margin_repair",
      title: `${dish.name} is losing cash on every sale`,
      message: `${dish.name} loses ${formatCurrencyLabel(
        Math.abs(dish.grossProfitPerSaleCents)
      )} per sale. Move price toward ${formatCurrencyLabel(
        recommendation?.recommendedPriceCents ?? dish.priceCents
      )} or cut the highest-cost ingredient before it drains another ${formatCurrencyLabel(
        Math.abs(dish.estimatedPeriodProfitCents)
      )} this period.`,
      dishId: dish.dishId,
      severity: "critical",
      estimatedImpactCents: getEstimatedPriceImpact(
        dish,
        recommendation?.recommendedPriceCents
      ),
      confidence: getBaseConfidence(dish, false),
      reasonCodes: dedupeReasonCodes(reasonCodes),
      recommendedPriceCents: recommendation?.recommendedPriceCents,
      currentMarginPercent: dish.marginPercent,
      targetMarginPercent: recommendation?.targetMarginPercent,
      createdFromRule: "negative-profit-per-sale",
      isAggressive: recommendation?.isAggressive
    };
  }

  if (highSales && dish.marginPercent < 50) {
    const recommendation = getRecommendedPrice(dish, strongContributor ? [60, 50] : [50]);
    const reasonCodes: DishActionReasonCode[] = [
      "LOW_MARGIN",
      "HIGH_SALES_LOW_MARGIN",
      "PRICE_SIMULATION_UPSIDE"
    ];

    if (strongContributor) {
      reasonCodes.push("STRONG_PROFIT_CONTRIBUTOR");
    }

    if (recommendation?.isAggressive) {
      reasonCodes.push("AGGRESSIVE_PRICE_INCREASE");
    }

    return {
      id: `protect-bestseller-${dish.dishId}`,
      type: strongContributor ? "bestseller_protection" : "price_review",
      title: strongContributor
        ? `Protect ${dish.name} before volume hides the margin leak`
        : `Review ${dish.name} pricing now`,
      message: `${dish.name} sells often but margin is only ${dish.marginPercent.toFixed(
        1
      )}%. Test a ${formatCurrencyLabel(
        (recommendation?.recommendedPriceCents ?? dish.priceCents) - dish.priceCents
      )} price increase${recommendation?.recommendedPriceCents ? ` to ${formatCurrencyLabel(recommendation.recommendedPriceCents)}` : ""} or reduce the highest-cost ingredient.`,
      dishId: dish.dishId,
      severity: dish.marginPercent < 30 ? "critical" : "high",
      estimatedImpactCents: getEstimatedPriceImpact(
        dish,
        recommendation?.recommendedPriceCents
      ),
      confidence: getBaseConfidence(dish, false),
      reasonCodes: dedupeReasonCodes(reasonCodes),
      recommendedPriceCents: recommendation?.recommendedPriceCents,
      currentMarginPercent: dish.marginPercent,
      targetMarginPercent: recommendation?.targetMarginPercent,
      createdFromRule: strongContributor ? "high-sales-low-margin-bestseller" : "high-sales-low-margin",
      isAggressive: recommendation?.isAggressive
    };
  }

  if (dish.marginPercent < 30) {
    const recommendation = getRecommendedPrice(dish, [50]);
    const reasonCodes: DishActionReasonCode[] = [
      "LOW_MARGIN",
      "LOSS_MARGIN",
      "PRICE_SIMULATION_UPSIDE"
    ];

    if (recommendation?.isAggressive) {
      reasonCodes.push("AGGRESSIVE_PRICE_INCREASE");
    }

    return {
      id: `repair-margin-${dish.dishId}`,
      type: "margin_repair",
      title: `Repair ${dish.name} margin before costs move again`,
      message: `${dish.name} is running at ${dish.marginPercent.toFixed(
        1
      )}% margin. Push it toward ${formatCurrencyLabel(
        recommendation?.recommendedPriceCents ?? dish.priceCents
      )} or reduce the priciest ingredient to rebuild a usable buffer.`,
      dishId: dish.dishId,
      severity: "high",
      estimatedImpactCents: getEstimatedPriceImpact(
        dish,
        recommendation?.recommendedPriceCents
      ),
      confidence: getBaseConfidence(dish, false),
      reasonCodes: dedupeReasonCodes(reasonCodes),
      recommendedPriceCents: recommendation?.recommendedPriceCents,
      currentMarginPercent: dish.marginPercent,
      targetMarginPercent: recommendation?.targetMarginPercent,
      createdFromRule: "margin-below-30",
      isAggressive: recommendation?.isAggressive
    };
  }

  if (dish.marginPercent < 50) {
    const recommendation = getRecommendedPrice(dish, [50]);

    return {
      id: `warning-review-${dish.dishId}`,
      type: "warning_review",
      title: `${dish.name} needs a margin review`,
      message: `${dish.name} is still selling, but ${dish.marginPercent.toFixed(
        1
      )}% margin leaves little room for supplier increases. Test a smaller price move or trim the recipe before the dish slips into the loss band.`,
      dishId: dish.dishId,
      severity: "medium",
      estimatedImpactCents: getEstimatedPriceImpact(
        dish,
        recommendation?.recommendedPriceCents
      ),
      confidence: getBaseConfidence(dish, false),
      reasonCodes: dedupeReasonCodes(["LOW_MARGIN", "PRICE_SIMULATION_UPSIDE"]),
      recommendedPriceCents: recommendation?.recommendedPriceCents,
      currentMarginPercent: dish.marginPercent,
      targetMarginPercent: recommendation?.targetMarginPercent,
      createdFromRule: "margin-between-30-and-50",
      isAggressive: recommendation?.isAggressive
    };
  }

  if (dish.marginPercent >= 60 && dish.salesVolume < averageSalesVolume) {
    return {
      id: `promotion-${dish.dishId}`,
      type: "promotion_opportunity",
      title: `${dish.name} has margin headroom to promote`,
      message: `${dish.name} keeps a ${dish.marginPercent.toFixed(
        1
      )}% margin, but sales volume is only ${dish.salesVolume}. Give it better placement or a staff recommendation to let the menu's healthiest profit item pull more weight.`,
      dishId: dish.dishId,
      severity: "low",
      estimatedImpactCents: Math.max(
        0,
        Math.round(dish.grossProfitPerSaleCents * Math.max(10, dish.salesVolume * 0.15))
      ),
      confidence: getBaseConfidence(dish, true),
      reasonCodes: dedupeReasonCodes(["HIGH_MARGIN_LOW_SALES"]),
      currentMarginPercent: dish.marginPercent,
      createdFromRule: "high-margin-low-sales"
    };
  }

  return null;
}

function buildDataQualityAction(dish: CalculatedDish): DishAction | null {
  if (dish.warnings.length === 0) {
    return null;
  }

  return {
    id: `data-quality-${dish.dishId}`,
    type: "data_quality",
    title: `Confirm ${dish.name} cost inputs`,
    message: `${dish.name} has missing or mismatched ingredient costs. Fix the recipe inputs before trusting the dish margin or acting on pricing.`,
    dishId: dish.dishId,
    severity: "high",
    estimatedImpactCents: Math.max(0, dish.estimatedPeriodProfitCents),
    confidence: getBaseConfidence(dish, false, true),
    reasonCodes: ["MISSING_COST_DATA"],
    currentMarginPercent: dish.marginPercent,
    createdFromRule: "data-quality-warning"
  };
}

export function rankDishActions(calculatedDishes: CalculatedDish[]): DishAction[] {
  const { averageSalesVolume, averageEstimatedProfit } = getSalesStats(calculatedDishes);
  const actions = calculatedDishes.flatMap<DishAction>((dish) => {
    const actionList: DishAction[] = [];
    const dataQualityAction = buildDataQualityAction(dish);
    const primaryAction = buildPrimaryAction(
      dish,
      averageSalesVolume,
      averageEstimatedProfit
    );

    if (dataQualityAction) {
      actionList.push(dataQualityAction);
    }

    if (primaryAction) {
      actionList.push(primaryAction);
    }

    return actionList;
  });

  return sortActions(actions, calculatedDishes);
}

function buildInvoiceAlertActions(
  calculatedDishes: CalculatedDish[],
  invoiceAlerts: PriceChangeAlert[]
) {
  const dishById = new Map(calculatedDishes.map((dish) => [dish.dishId, dish]));
  const groupedAlerts = new Map<string, PriceChangeAlert[]>();

  for (const alert of invoiceAlerts) {
    for (const dishId of alert.affectedDishIds) {
      if (!dishById.has(dishId)) {
        continue;
      }

      const key = `${dishId}:${alert.ingredientId}`;
      groupedAlerts.set(key, [...(groupedAlerts.get(key) ?? []), alert]);
    }
  }

  return [...groupedAlerts.entries()].flatMap<DishAction>(([key, alerts]) => {
    const [dishId] = key.split(":");
    const dish = dishById.get(dishId);

    if (!dish || alerts.length === 0) {
      return [];
    }

    const primaryAlert = [...alerts].sort((left, right) => {
      const severityDifference = compareSeverity(right.severity, left.severity);

      if (severityDifference !== 0) {
        return severityDifference;
      }

      return (right.estimatedMarginImpactCents ?? 0) - (left.estimatedMarginImpactCents ?? 0);
    })[0];
    const ingredientNames = [...new Set(alerts.map((alert) => alert.ingredientName).filter(Boolean))] as string[];
    const maxDeltaPercent = Math.max(...alerts.map((alert) => Math.abs(alert.deltaPercent ?? 0)));
    const estimatedImpactCents = Math.max(
      0,
      ...alerts.map((alert) => Math.abs(alert.estimatedMarginImpactCents ?? 0))
    );
    const hasSupplierPriceIncrease = alerts.some((alert) => alert.type === "ingredient_price_up");
    const hasDishMarginRisk = alerts.some(
      (alert) => alert.type === "dish_margin_at_risk_due_to_cost_change"
    );
    const recommendedPrice = dish.marginPercent < 50 ? getRecommendedPrice(dish, [50, 60]) : null;
    const reasonCodes: DishActionReasonCode[] = [
      "COST_HISTORY_UPDATED",
      "INGREDIENT_PRICE_CHANGE"
    ];

    if (hasSupplierPriceIncrease) {
      reasonCodes.push("SUPPLIER_PRICE_INCREASE");
    }

    if (hasDishMarginRisk) {
      reasonCodes.push("DISH_MARGIN_AT_RISK");
    }

    if (maxDeltaPercent >= 15) {
      reasonCodes.push("INVOICE_COST_SPIKE");
    }

    if (dish.marginPercent < 50) {
      reasonCodes.push("LOW_MARGIN");
    }

    if (dish.marginPercent < 30) {
      reasonCodes.push("LOSS_MARGIN");
    }

    if (dish.salesVolume >= 150 && dish.marginPercent < 50) {
      reasonCodes.push("HIGH_SALES_LOW_MARGIN");
    }

    const ingredientLabel =
      ingredientNames.length === 0
        ? "ingredient cost"
        : ingredientNames.length === 1
          ? ingredientNames[0]
          : `${ingredientNames[0]} and ${ingredientNames.length - 1} more inputs`;

    return [
      {
        id: `supplier-price-review-${dish.dishId}-${primaryAlert.ingredientId}`,
        type: "supplier_price_review",
        title:
          hasDishMarginRisk || dish.marginPercent < 30
            ? `Repair ${dish.name} after the latest supplier spike`
            : `Review ${dish.name} after the latest supplier cost update`,
        message: hasSupplierPriceIncrease
          ? `${dish.name} is now at risk because ${ingredientLabel} increased ${maxDeltaPercent.toFixed(1)}% on the latest supplier invoice. Review price or portion cost before more margin slips.`
          : `${dish.name} has a fresh supplier-cost update in ${ingredientLabel}. Recheck margin and decide whether to protect price or use the cost relief elsewhere.`,
        dishId: dish.dishId,
        severity:
          hasDishMarginRisk && dish.marginPercent < 30
            ? "critical"
            : primaryAlert.severity,
        estimatedImpactCents,
        confidence: alerts.every((alert) => typeof alert.deltaPercent === "number")
          ? "high"
          : "medium",
        reasonCodes: dedupeReasonCodes(reasonCodes),
        recommendedPriceCents: recommendedPrice?.recommendedPriceCents,
        currentMarginPercent: dish.marginPercent,
        targetMarginPercent: recommendedPrice?.targetMarginPercent,
        createdFromRule: "supplier-price-alert",
        isAggressive: recommendedPrice?.isAggressive
      }
    ];
  });
}

function mergeDishActions(primary: DishAction, secondary: DishAction): DishAction {
  return {
    ...primary,
    type: secondary.type,
    title: secondary.title,
    message: secondary.message,
    severity:
      compareSeverity(primary.severity, secondary.severity) >= 0
        ? primary.severity
        : secondary.severity,
    estimatedImpactCents: Math.max(primary.estimatedImpactCents, secondary.estimatedImpactCents),
    confidence:
      confidenceWeight[secondary.confidence] >= confidenceWeight[primary.confidence]
        ? secondary.confidence
        : primary.confidence,
    reasonCodes: dedupeReasonCodes([...primary.reasonCodes, ...secondary.reasonCodes]),
    recommendedPriceCents: secondary.recommendedPriceCents ?? primary.recommendedPriceCents,
    currentMarginPercent: secondary.currentMarginPercent ?? primary.currentMarginPercent,
    targetMarginPercent: secondary.targetMarginPercent ?? primary.targetMarginPercent,
    createdFromRule: `${primary.createdFromRule}+${secondary.createdFromRule}`,
    isAggressive: secondary.isAggressive ?? primary.isAggressive
  };
}

export function rankCombinedActions(params: {
  calculatedDishes: CalculatedDish[];
  invoiceAlerts: PriceChangeAlert[];
}): DishAction[] {
  const baseActions = rankDishActions(params.calculatedDishes);
  const invoiceActions = buildInvoiceAlertActions(
    params.calculatedDishes,
    params.invoiceAlerts.filter((alert) => alert.status === "open")
  );
  const combined = [...baseActions];

  for (const invoiceAction of invoiceActions) {
    const existingIndex = combined.findIndex(
      (action) => action.dishId === invoiceAction.dishId && action.type !== "data_quality"
    );

    if (existingIndex >= 0) {
      combined[existingIndex] = mergeDishActions(combined[existingIndex], invoiceAction);
      continue;
    }

    combined.push(invoiceAction);
  }

  return sortActions(combined, params.calculatedDishes);
}

export function calculateOverview(
  calculatedDishes: CalculatedDish[],
  invoiceAlerts: PriceChangeAlert[] = []
): OverviewMetrics {
  const profitableCount = calculatedDishes.filter((dish) => dish.status === "profitable").length;
  const warningCount = calculatedDishes.filter((dish) => dish.status === "warning").length;
  const lossCount = calculatedDishes.filter((dish) => dish.status === "loss").length;
  const totalMargin = calculatedDishes.reduce((sum, dish) => sum + dish.marginPercent, 0);
  const estimatedPeriodProfitCents = calculatedDishes.reduce(
    (sum, dish) => sum + dish.estimatedPeriodProfitCents,
    0
  );
  const totalRevenueCents = calculatedDishes.reduce(
    (sum, dish) => sum + dish.priceCents * dish.salesVolume,
    0
  );
  const totalCostCents = calculatedDishes.reduce(
    (sum, dish) => sum + dish.costCents * dish.salesVolume,
    0
  );
  const weightedAverageMarginPercent =
    totalRevenueCents === 0
      ? 0
      : Number((((totalRevenueCents - totalCostCents) / totalRevenueCents) * 100).toFixed(2));

  const actions = rankCombinedActions({ calculatedDishes, invoiceAlerts });
  const latestSupplierAlerts = [...invoiceAlerts]
    .sort((left, right) => {
      const severityDifference = compareSeverity(right.severity, left.severity);

      if (severityDifference !== 0) {
        return severityDifference;
      }

      return right.createdAt.localeCompare(left.createdAt);
    })
    .slice(0, 4);

  return {
    totalDishes: calculatedDishes.length,
    profitableCount,
    warningCount,
    lossCount,
    averageMarginPercent:
      calculatedDishes.length === 0 ? 0 : Number((totalMargin / calculatedDishes.length).toFixed(2)),
    estimatedPeriodProfitCents,
    totalRevenueCents,
    totalCostCents,
    weightedAverageMarginPercent,
    topActions: actions.slice(0, 3),
    topProfitContributors: [...calculatedDishes]
      .sort((left, right) => {
        if (right.estimatedPeriodProfitCents !== left.estimatedPeriodProfitCents) {
          return right.estimatedPeriodProfitCents - left.estimatedPeriodProfitCents;
        }

        return left.dishId.localeCompare(right.dishId);
      })
      .slice(0, 4),
    riskiestDishes: [...calculatedDishes]
      .filter((dish) => dish.status !== "profitable")
      .sort((left, right) => {
        const statusDifference =
          (left.status === "loss" ? 0 : 1) - (right.status === "loss" ? 0 : 1);

        if (statusDifference !== 0) {
          return statusDifference;
        }

        if (right.salesVolume !== left.salesVolume) {
          return right.salesVolume - left.salesVolume;
        }

        if (left.marginPercent !== right.marginPercent) {
          return left.marginPercent - right.marginPercent;
        }

        return left.dishId.localeCompare(right.dishId);
      })
      .slice(0, 4),
    supplierAlertCount: invoiceAlerts.length,
    highSeveritySupplierAlertCount: invoiceAlerts.filter(
      (alert) => alert.severity === "high" || alert.severity === "critical"
    ).length,
    latestSupplierAlerts,
    dataQualityWarnings: [...new Set(calculatedDishes.flatMap((dish) => dish.warnings.map((warning) => warning.message)))]
  };
}
