import request from "supertest";
import { describe, expect, it } from "vitest";

import type {
  CalculatedDish,
  DemoDatasetSummary,
  DishAction,
  DishDetailAnalytics,
  OverviewMetrics,
  PriceSimulationResult
} from "../../../packages/core/src/index.js";
import { createApp } from "../src/app.js";

const app = createApp();

describe("api", () => {
  it("returns health response", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, service: "profit-analyzer-api" });
  });

  it("returns demo datasets", async () => {
    const response = await request(app).get("/api/demo/datasets");
    const body = response.body as DemoDatasetSummary[];

    expect(response.status).toBe(200);
    expect(body.map((dataset) => dataset.id)).toEqual([
      "mixed-restaurant",
      "low-margin-kitchen",
      "high-margin-bistro"
    ]);
  });

  it("returns upgraded analytics overview for the selected dataset", async () => {
    const response = await request(app).get("/api/analytics/overview?dataset=mixed-restaurant");
    const body = response.body as OverviewMetrics;

    expect(response.status).toBe(200);
    expect(body.totalDishes).toBe(8);
    expect(body).toHaveProperty("weightedAverageMarginPercent");
    expect(body).toHaveProperty("totalRevenueCents");
    expect(body).toHaveProperty("totalCostCents");
    expect(body.topActions).toHaveLength(3);
    expect(body.topProfitContributors.length).toBeGreaterThan(0);
    expect(body.riskiestDishes.length).toBeGreaterThan(0);
  });

  it("returns riskier overview metrics for the low-margin dataset than the high-margin dataset", async () => {
    const [lowMarginResponse, highMarginResponse] = await Promise.all([
      request(app).get("/api/analytics/overview?dataset=low-margin-kitchen"),
      request(app).get("/api/analytics/overview?dataset=high-margin-bistro")
    ]);

    const lowMargin = lowMarginResponse.body as OverviewMetrics;
    const highMargin = highMarginResponse.body as OverviewMetrics;

    expect(lowMargin.lossCount + lowMargin.warningCount).toBeGreaterThan(
      highMargin.lossCount + highMargin.warningCount
    );
    expect(lowMargin.weightedAverageMarginPercent).toBeLessThan(
      highMargin.weightedAverageMarginPercent
    );
  });

  it("returns analytics dishes for the selected dataset", async () => {
    const response = await request(app).get("/api/analytics/dishes?dataset=low-margin-kitchen");
    const body = response.body as CalculatedDish[];

    expect(response.status).toBe(200);
    expect(body).toHaveLength(8);
    expect(body[0]).toHaveProperty("marginPercent");
    expect(body[0]).toHaveProperty("status");
    expect(body[0]).toHaveProperty("costRatioPercent");
  });

  it("returns a dish detail payload with breakdown, cost driver insight, and target margin hints", async () => {
    const response = await request(app).get(
      "/api/analytics/dish/dish-burger?dataset=mixed-restaurant"
    );
    const body = response.body as DishDetailAnalytics;

    expect(response.status).toBe(200);
    expect(body.dish.id).toBe("dish-burger");
    expect(body.metrics.dishId).toBe("dish-burger");
    expect(body.ingredientBreakdown[0]).toHaveProperty("percentOfDishCost");
    expect(body.explanation).toHaveProperty("headline");
    expect(body.recommendedActionsForDish.length).toBeGreaterThan(0);
    expect(body.simulationHints.quickAdjustmentsCents).toEqual([50, 100, 200]);
    expect(body.simulationHints.targetMarginActions[0]).toHaveProperty("targetMarginPercent");
    expect(body.costDriverInsight).toHaveProperty("message");
  });

  it("returns all ranked actions for the selected dataset", async () => {
    const response = await request(app).get("/api/analytics/actions?dataset=low-margin-kitchen");
    const body = response.body as DishAction[];

    expect(response.status).toBe(200);
    expect(body.length).toBeGreaterThanOrEqual(3);
    expect(body[0]).toHaveProperty("reasonCodes");
  });

  it("simulates a dish price change with the selected dataset", async () => {
    const response = await request(app)
      .post("/api/simulate/price?dataset=low-margin-kitchen")
      .send({ dishId: "dish-burger", newPriceCents: 1290 });
    const body = response.body as PriceSimulationResult;

    expect(response.status).toBe(200);
    expect(body.dishId).toBe("dish-burger");
    expect(body.newPriceCents).toBe(1290);
    expect(body.statusBefore).toBe("loss");
    expect(body.statusAfter).toBe("warning");
    expect(body.profitDeltaCents).toBeGreaterThan(0);
  });

  it("validates simulator payloads", async () => {
    const missingDishId = await request(app)
      .post("/api/simulate/price?dataset=mixed-restaurant")
      .send({ newPriceCents: 1490 });
    const invalidPrice = await request(app)
      .post("/api/simulate/price?dataset=mixed-restaurant")
      .send({ dishId: "dish-burger", newPriceCents: 0 });

    expect(missingDishId.status).toBe(400);
    expect(invalidPrice.status).toBe(400);
  });

  it("returns 404 for unknown datasets", async () => {
    const response = await request(app).get("/api/analytics/overview?dataset=ghost-dataset");

    expect(response.status).toBe(404);
  });
});
