import request from "supertest";
import { describe, expect, it } from "vitest";

import type {
  CalculatedDish,
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

  it("returns upgraded analytics overview", async () => {
    const response = await request(app).get("/api/analytics/overview");
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

  it("returns analytics dishes", async () => {
    const response = await request(app).get("/api/analytics/dishes");
    const body = response.body as CalculatedDish[];

    expect(response.status).toBe(200);
    expect(body).toHaveLength(8);
    expect(body[0]).toHaveProperty("marginPercent");
    expect(body[0]).toHaveProperty("status");
    expect(body[0]).toHaveProperty("costRatioPercent");
  });

  it("returns a dish detail payload with breakdown and recommended actions", async () => {
    const response = await request(app).get("/api/analytics/dish/dish-burger");
    const body = response.body as DishDetailAnalytics;

    expect(response.status).toBe(200);
    expect(body.dish.id).toBe("dish-burger");
    expect(body.metrics.dishId).toBe("dish-burger");
    expect(body.ingredientBreakdown[0]).toHaveProperty("percentOfDishCost");
    expect(body.explanation).toHaveProperty("headline");
    expect(body.recommendedActionsForDish.length).toBeGreaterThan(0);
    expect(body.simulationHints.quickAdjustmentsCents).toEqual([50, 100, 200]);
  });

  it("returns all ranked actions", async () => {
    const response = await request(app).get("/api/analytics/actions");
    const body = response.body as DishAction[];

    expect(response.status).toBe(200);
    expect(body.length).toBeGreaterThanOrEqual(3);
    expect(body[0]).toHaveProperty("reasonCodes");
  });

  it("simulates a dish price change with status transitions", async () => {
    const response = await request(app)
      .post("/api/simulate/price")
      .send({ dishId: "dish-burger", newPriceCents: 1490 });
    const body = response.body as PriceSimulationResult;

    expect(response.status).toBe(200);
    expect(body.dishId).toBe("dish-burger");
    expect(body.newPriceCents).toBe(1490);
    expect(body.statusBefore).toBe("warning");
    expect(body.statusAfter).toBe("warning");
    expect(body.grossProfitPerSaleDeltaCents).toBe(100);
    expect(body.profitDeltaCents).toBeGreaterThan(0);
  });

  it("validates simulator payloads", async () => {
    const missingDishId = await request(app).post("/api/simulate/price").send({ newPriceCents: 1490 });
    const invalidPrice = await request(app)
      .post("/api/simulate/price")
      .send({ dishId: "dish-burger", newPriceCents: 0 });

    expect(missingDishId.status).toBe(400);
    expect(invalidPrice.status).toBe(400);
  });

  it("returns 404 for unknown simulation dishes", async () => {
    const response = await request(app)
      .post("/api/simulate/price")
      .send({ dishId: "dish-missing", newPriceCents: 1490 });

    expect(response.status).toBe(404);
  });
});
