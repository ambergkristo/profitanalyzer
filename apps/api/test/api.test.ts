import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";

const app = createApp();

describe("api", () => {
  it("returns health response", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, service: "profit-analyzer-api" });
  });

  it("returns analytics overview", async () => {
    const response = await request(app).get("/api/analytics/overview");
    const body = response.body as { totalDishes: number; topActions: unknown[] };

    expect(response.status).toBe(200);
    expect(body.totalDishes).toBe(6);
    expect(body.topActions).toHaveLength(3);
  });

  it("returns analytics dishes", async () => {
    const response = await request(app).get("/api/analytics/dishes");
    const body = response.body as Array<Record<string, unknown>>;

    expect(response.status).toBe(200);
    expect(body).toHaveLength(6);
    expect(body[0]).toHaveProperty("marginPercent");
    expect(body[0]).toHaveProperty("status");
  });

  it("returns a dish detail payload", async () => {
    const response = await request(app).get("/api/analytics/dish/dish-burger");
    const body = response.body as {
      dish: { id: string };
      ingredientBreakdown: unknown[];
      explanation: string;
    };

    expect(response.status).toBe(200);
    expect(body.dish.id).toBe("dish-burger");
    expect(body.ingredientBreakdown.length).toBeGreaterThan(0);
    expect(body.explanation).toBeTruthy();
  });

  it("simulates a dish price change", async () => {
    const response = await request(app)
      .post("/api/simulate/price")
      .send({ dishId: "dish-burger", newPriceCents: 1690 });
    const body = response.body as {
      dishId: string;
      newPriceCents: number;
      profitDeltaCents: number;
    };

    expect(response.status).toBe(200);
    expect(body.dishId).toBe("dish-burger");
    expect(body.newPriceCents).toBe(1690);
    expect(body.profitDeltaCents).toBeGreaterThan(0);
  });
});
