import { describe, expect, it } from "vitest";

import {
  calculateCalculatedDishes,
  canonicalDemoDatasets,
  rankDishActions,
  validateCanonicalDatasets,
  validateRestaurantDataset,
  type DemoDatasetDefinition
} from "../src/index.js";

describe("synthetic validation", () => {
  it("passes the high-margin dataset with a mostly healthy profile", () => {
    const report = validateCanonicalDatasets().find(
      (candidate) => candidate.datasetId === "high-margin-bistro"
    );

    expect(report?.pass).toBe(true);
    expect(report?.severityCounts.critical).toBe(0);
    expect(report?.profitableCount).toBeGreaterThan(report?.lossCount ?? 0);
  });

  it("produces high or critical actions for the low-margin dataset", () => {
    const report = validateCanonicalDatasets().find(
      (candidate) => candidate.datasetId === "low-margin-kitchen"
    );

    expect((report?.severityCounts.critical ?? 0) + (report?.severityCounts.high ?? 0)).toBeGreaterThanOrEqual(2);
  });

  it("produces varied actions for the mixed dataset", () => {
    const report = validateCanonicalDatasets().find(
      (candidate) => candidate.datasetId === "mixed-restaurant"
    );

    expect(report?.pass).toBe(true);
    expect(Object.keys(report?.actionTypeCounts ?? {})).toHaveLength(5);
    expect(report?.warnings[0]).toContain("basil");
  });

  it("detects a noisy dataset with invalid financial outputs", () => {
    const noisyDataset: DemoDatasetDefinition = {
      id: "bad-dataset",
      name: "Bad Dataset",
      description: "Broken validation fixture",
      profile: "mixed",
      data: {
        ingredients: [{ id: "ing", name: "Ingredient", costPerUnitCents: 10, unit: "g" }],
        recipes: [{ id: "recipe", name: "Recipe", yield: 1, ingredients: [{ ingredientId: "ing", quantity: 10, unit: "g" }] }],
        dishes: [{ id: "dish", name: "Dish", recipeId: "recipe", priceCents: Number.NaN, salesVolume: 10 }]
      }
    };

    const report = validateRestaurantDataset(noisyDataset);

    expect(report.pass).toBe(false);
    expect(report.failures.some((failure) => failure.includes("non-finite"))).toBe(true);
  });

  it("keeps calculated outputs finite across canonical datasets", () => {
    for (const report of validateCanonicalDatasets()) {
      expect(Number.isFinite(report.weightedAverageMarginPercent)).toBe(true);
      expect(Number.isFinite(report.totalRevenueCents)).toBe(true);
      expect(Number.isFinite(report.totalCostCents)).toBe(true);
    }
  });

  it("keeps action ranking deterministic across repeated runs", () => {
    const reports = validateCanonicalDatasets();
    const mixedDataset = reports.find((candidate) => candidate.datasetId === "mixed-restaurant");

    expect(mixedDataset?.failures).toEqual([]);
  });

  it("keeps canonical action ranking deterministic by id", () => {
    const mixedDataset = canonicalDemoDatasets.find(
      (candidate) => candidate.id === "mixed-restaurant"
    );
    const firstRun = rankDishActions(calculateCalculatedDishes(mixedDataset!.data)).map(
      (action) => action.id
    );
    const secondRun = rankDishActions(calculateCalculatedDishes(mixedDataset!.data)).map(
      (action) => action.id
    );

    expect(firstRun).toEqual(secondRun);
  });
});
