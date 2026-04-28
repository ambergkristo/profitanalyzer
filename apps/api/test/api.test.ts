import request from "supertest";
import { describe, expect, it } from "vitest";

import type {
  CalculatedDish,
  DemoDatasetSummary,
  DishAction,
  DishDetailAnalytics,
  MockInvoiceSampleSummary,
  OverviewMetrics,
  PriceChangeAlert,
  PriceSimulationResult,
  StoredInvoiceView
} from "../../../packages/core/src/index.js";
import { createApp } from "../src/app.js";

const buildApp = () => createApp();

describe("api", () => {
  it("returns health response", async () => {
    const response = await request(buildApp()).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, service: "profit-analyzer-api" });
  });

  it("returns demo datasets", async () => {
    const response = await request(buildApp()).get("/api/demo/datasets");
    const body = response.body as DemoDatasetSummary[];

    expect(response.status).toBe(200);
    expect(body.map((dataset) => dataset.id)).toEqual([
      "mixed-restaurant",
      "low-margin-kitchen",
      "high-margin-bistro"
    ]);
    expect(body[0]).toHaveProperty("ownerDiagnosis");
    expect(body[0]).toHaveProperty("demoNarrative");
  });

  it("returns upgraded analytics overview for the selected dataset", async () => {
    const response = await request(buildApp()).get("/api/analytics/overview?dataset=mixed-restaurant");
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
      request(buildApp()).get("/api/analytics/overview?dataset=low-margin-kitchen"),
      request(buildApp()).get("/api/analytics/overview?dataset=high-margin-bistro")
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
    const response = await request(buildApp()).get("/api/analytics/dishes?dataset=low-margin-kitchen");
    const body = response.body as CalculatedDish[];

    expect(response.status).toBe(200);
    expect(body).toHaveLength(8);
    expect(body[0]).toHaveProperty("marginPercent");
    expect(body[0]).toHaveProperty("status");
    expect(body[0]).toHaveProperty("costRatioPercent");
  });

  it("returns a dish detail payload with breakdown, cost driver insight, and target margin hints", async () => {
    const response = await request(buildApp()).get(
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

  it("returns 404 when a dish does not exist in the selected dataset", async () => {
    const response = await request(buildApp()).get(
      "/api/analytics/dish/dish-ghost?dataset=mixed-restaurant"
    );
    const body = response.body as { message: string };

    expect(response.status).toBe(404);
    expect(body.message).toContain("Dish not found");
  });

  it("returns all ranked actions for the selected dataset", async () => {
    const response = await request(buildApp()).get("/api/analytics/actions?dataset=low-margin-kitchen");
    const body = response.body as DishAction[];

    expect(response.status).toBe(200);
    expect(body.length).toBeGreaterThanOrEqual(3);
    expect(body[0]).toHaveProperty("reasonCodes");
  });

  it("simulates a dish price change with the selected dataset", async () => {
    const response = await request(buildApp())
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
    const missingDishId = await request(buildApp())
      .post("/api/simulate/price?dataset=mixed-restaurant")
      .send({ newPriceCents: 1490 });
    const invalidPrice = await request(buildApp())
      .post("/api/simulate/price?dataset=mixed-restaurant")
      .send({ dishId: "dish-burger", newPriceCents: 0 });

    expect(missingDishId.status).toBe(400);
    expect(invalidPrice.status).toBe(400);
  });

  it("returns 404 for unknown datasets", async () => {
    const response = await request(buildApp()).get("/api/analytics/overview?dataset=ghost-dataset");
    const body = response.body as unknown as { message: string };

    expect(response.status).toBe(404);
    expect(body.message).toContain('Unknown dataset "ghost-dataset"');
  });

  it("returns sample invoice metadata", async () => {
    const response = await request(buildApp()).get("/api/invoices/samples");
    const body = response.body as MockInvoiceSampleSummary[];

    expect(response.status).toBe(200);
    expect(body).toHaveLength(3);
    expect(body[0]).toHaveProperty("expectedImpact");
  });

  it("parses a mock invoice draft for the selected dataset", async () => {
    const response = await request(buildApp())
      .post("/api/invoices/parse-mock?dataset=mixed-restaurant")
      .send({ sampleInvoiceId: "normal-supplier-invoice" });

    const body = response.body as unknown as {
      invoiceDraft: { id: string; parseStatus: string };
      summary: { totalLines: number; highConfidenceCount: number };
    };

    expect(response.status).toBe(200);
    expect(body.invoiceDraft.parseStatus).toBeTruthy();
    expect(body.summary.totalLines).toBe(7);
  });

  it("returns 404 for an unknown sample invoice id", async () => {
    const response = await request(buildApp())
      .post("/api/invoices/parse-mock?dataset=mixed-restaurant")
      .send({ sampleInvoiceId: "ghost-sample" });
    const body = response.body as unknown as { message: string };

    expect(response.status).toBe(404);
    expect(body.message).toContain('Unknown sample invoice "ghost-sample"');
  });

  it("returns a stored invoice draft by id", async () => {
    const app = buildApp();
    const parseResponse = await request(app)
      .post("/api/invoices/parse-mock?dataset=mixed-restaurant")
      .send({ sampleInvoiceId: "normal-supplier-invoice" });
    const parsedInvoice = parseResponse.body as unknown as {
      invoiceDraft: { id: string };
    };
    const invoiceId = parsedInvoice.invoiceDraft.id;

    const response = await request(app).get(`/api/invoices/${invoiceId}?dataset=mixed-restaurant`);
    const body = response.body as StoredInvoiceView;

    expect(response.status).toBe(200);
    expect(body.invoice.id).toBe(invoiceId);
    expect(body.lines).toHaveLength(7);
  });

  it("returns 404 for an unknown invoice id", async () => {
    const response = await request(buildApp()).get(
      "/api/invoices/invoice-ghost?dataset=mixed-restaurant"
    );
    const body = response.body as unknown as { message: string };

    expect(response.status).toBe(404);
    expect(body.message).toContain("Invoice not found");
  });

  it("blocks confirmation when unresolved lines are submitted as confirmed", async () => {
    const app = buildApp();
    const parseResponse = await request(app)
      .post("/api/invoices/parse-mock?dataset=mixed-restaurant")
      .send({ sampleInvoiceId: "messy-supplier-invoice" });

    const invoice = parseResponse.body as {
      invoiceDraft: { id: string; supplierId: string; invoiceDate: string; invoiceNumber?: string };
      lines: Array<{
        id: string;
        matchedIngredientId?: string;
        parsedQuantity: number;
        parsedUnit: string;
        parsedUnitPriceCents?: number;
        parsedLineTotalCents?: number;
      }>;
    };

    const mysteryLine = invoice.lines.find((line) => line.matchedIngredientId === undefined);

    const response = await request(app)
      .post(`/api/invoices/${invoice.invoiceDraft.id}/review-confirm?dataset=mixed-restaurant`)
      .send({
        supplierId: invoice.invoiceDraft.supplierId,
        invoiceDate: invoice.invoiceDraft.invoiceDate,
        invoiceNumber: invoice.invoiceDraft.invoiceNumber,
        lines: invoice.lines.map((line) => ({
          lineId: line.id,
          reviewStatus: "confirmed",
          matchedIngredientId: line.id === mysteryLine?.id ? undefined : line.matchedIngredientId,
          parsedQuantity: line.parsedQuantity,
          parsedUnit: line.parsedUnit,
          parsedUnitPriceCents: line.parsedUnitPriceCents ?? 1,
          parsedLineTotalCents: line.parsedLineTotalCents
        }))
      });
    const body = response.body as unknown as { message: string };

    expect(response.status).toBe(400);
    expect(body.message).toContain("matchedIngredientId");
  });

  it("confirms a reviewed invoice, updates cost history, and ignores skipped lines", async () => {
    const app = buildApp();
    const parseResponse = await request(app)
      .post("/api/invoices/parse-mock?dataset=mixed-restaurant")
      .send({ sampleInvoiceId: "normal-supplier-invoice" });

    const invoice = parseResponse.body as {
      invoiceDraft: { id: string; supplierId: string; invoiceDate: string; invoiceNumber?: string };
      lines: Array<{
        id: string;
        rawProductName: string;
        matchedIngredientId?: string;
        parsedQuantity: number;
        parsedUnit: string;
        parsedUnitPriceCents?: number;
        parsedLineTotalCents?: number;
      }>;
    };

    const romaineLine = invoice.lines.find((line) => line.rawProductName === "Romaine Lettuce Hearts");

    const confirmResponse = await request(app)
      .post(`/api/invoices/${invoice.invoiceDraft.id}/review-confirm?dataset=mixed-restaurant`)
      .send({
        supplierId: invoice.invoiceDraft.supplierId,
        invoiceDate: invoice.invoiceDraft.invoiceDate,
        invoiceNumber: invoice.invoiceDraft.invoiceNumber,
        lines: invoice.lines.map((line) => ({
          lineId: line.id,
          reviewStatus: line.id === romaineLine?.id ? "ignored" : "confirmed",
          matchedIngredientId: line.id === romaineLine?.id ? undefined : line.matchedIngredientId,
          parsedQuantity: line.parsedQuantity,
          parsedUnit: line.parsedUnit,
          parsedUnitPriceCents: line.parsedUnitPriceCents ?? 1,
          parsedLineTotalCents: line.parsedLineTotalCents
        }))
      });
    const body = confirmResponse.body as unknown as {
      confirmationSummary: {
        confirmedLineCount: number;
        ignoredLineCount: number;
      };
      costHistory: Array<{ ingredientId: string }>;
    };

    expect(confirmResponse.status).toBe(200);
    expect(body.confirmationSummary.confirmedLineCount).toBe(6);
    expect(body.confirmationSummary.ignoredLineCount).toBe(1);
    expect(body.costHistory.some((entry) => entry.ingredientId === "romaine")).toBe(false);

    const historyResponse = await request(app).get(
      "/api/ingredients/parmesan/cost-history?dataset=mixed-restaurant"
    );
    expect(historyResponse.status).toBe(200);
    expect(historyResponse.body).toHaveLength(1);
  });

  it("returns price-change alerts after invoice confirmation", async () => {
    const app = buildApp();
    const parseResponse = await request(app)
      .post("/api/invoices/parse-mock?dataset=mixed-restaurant")
      .send({ sampleInvoiceId: "high-impact-price-spike" });

    const invoice = parseResponse.body as {
      invoiceDraft: { id: string; supplierId: string; invoiceDate: string; invoiceNumber?: string };
      lines: Array<{
        id: string;
        matchedIngredientId?: string;
        parsedQuantity: number;
        parsedUnit: string;
        parsedUnitPriceCents?: number;
        parsedLineTotalCents?: number;
      }>;
    };

    await request(app)
      .post(`/api/invoices/${invoice.invoiceDraft.id}/review-confirm?dataset=mixed-restaurant`)
      .send({
        supplierId: invoice.invoiceDraft.supplierId,
        invoiceDate: invoice.invoiceDraft.invoiceDate,
        invoiceNumber: invoice.invoiceDraft.invoiceNumber,
        lines: invoice.lines.map((line) => ({
          lineId: line.id,
          reviewStatus: "confirmed",
          matchedIngredientId: line.matchedIngredientId,
          parsedQuantity: line.parsedQuantity,
          parsedUnit: line.parsedUnit,
          parsedUnitPriceCents: line.parsedUnitPriceCents ?? 1,
          parsedLineTotalCents: line.parsedLineTotalCents
        }))
      });

    const response = await request(app).get("/api/alerts/price-changes?dataset=mixed-restaurant");
    const body = response.body as PriceChangeAlert[];

    expect(response.status).toBe(200);
    expect(body.length).toBeGreaterThan(0);
    expect(body.some((alert) => alert.type === "dish_margin_at_risk_due_to_cost_change")).toBe(
      true
    );
  });

  it("changes analytics after invoice confirmation", async () => {
    const app = buildApp();
    const beforeResponse = await request(app).get("/api/analytics/overview?dataset=mixed-restaurant");
    const before = beforeResponse.body as OverviewMetrics;

    const parseResponse = await request(app)
      .post("/api/invoices/parse-mock?dataset=mixed-restaurant")
      .send({ sampleInvoiceId: "high-impact-price-spike" });

    const invoice = parseResponse.body as {
      invoiceDraft: { id: string; supplierId: string; invoiceDate: string; invoiceNumber?: string };
      lines: Array<{
        id: string;
        matchedIngredientId?: string;
        parsedQuantity: number;
        parsedUnit: string;
        parsedUnitPriceCents?: number;
        parsedLineTotalCents?: number;
      }>;
    };

    await request(app)
      .post(`/api/invoices/${invoice.invoiceDraft.id}/review-confirm?dataset=mixed-restaurant`)
      .send({
        supplierId: invoice.invoiceDraft.supplierId,
        invoiceDate: invoice.invoiceDraft.invoiceDate,
        invoiceNumber: invoice.invoiceDraft.invoiceNumber,
        lines: invoice.lines.map((line) => ({
          lineId: line.id,
          reviewStatus: "confirmed",
          matchedIngredientId: line.matchedIngredientId,
          parsedQuantity: line.parsedQuantity,
          parsedUnit: line.parsedUnit,
          parsedUnitPriceCents: line.parsedUnitPriceCents ?? 1,
          parsedLineTotalCents: line.parsedLineTotalCents
        }))
      });

    const afterResponse = await request(app).get("/api/analytics/overview?dataset=mixed-restaurant");
    const after = afterResponse.body as OverviewMetrics;

    expect(after.weightedAverageMarginPercent).toBeLessThan(before.weightedAverageMarginPercent);
    expect(after.estimatedPeriodProfitCents).toBeLessThan(before.estimatedPeriodProfitCents);
  });
});
