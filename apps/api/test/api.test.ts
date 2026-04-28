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
    expect(body).toHaveProperty("supplierAlertCount");
    expect(body).toHaveProperty("highSeveritySupplierAlertCount");
    expect(body).toHaveProperty("latestSupplierAlerts");
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

  it("creates a manual structured invoice draft and derives unit price from line total", async () => {
    const response = await request(buildApp())
      .post("/api/invoices/manual-draft?dataset=mixed-restaurant")
      .send({
        supplierName: "Prime Butchery Co",
        invoiceNumber: "MAN-100",
        invoiceDate: "2026-04-28",
        lines: [
          {
            rawProductName: "Beef Patty 180g Fresh",
            parsedQuantity: 1000,
            parsedUnit: "g",
            parsedLineTotalCents: 4000,
            matchedIngredientId: "beef-patty"
          }
        ]
      });
    const body = response.body as {
      invoiceDraft: { sourceType: string };
      lines: Array<{ parsedUnitPriceCents?: number; reviewStatus: string }>;
    };

    expect(response.status).toBe(200);
    expect(body.invoiceDraft.sourceType).toBe("manual");
    expect(body.lines[0].parsedUnitPriceCents).toBe(4);
    expect(body.lines[0].reviewStatus).toBe("ready");
  });

  it("validates manual structured invoice drafts", async () => {
    const response = await request(buildApp())
      .post("/api/invoices/manual-draft?dataset=mixed-restaurant")
      .send({
        supplierName: "",
        invoiceDate: "2026-04-28",
        lines: []
      });

    expect(response.status).toBe(400);
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
    const historyBody = historyResponse.body as { ingredientId: string; history: unknown[] };
    expect(historyResponse.status).toBe(200);
    expect(historyBody.ingredientId).toBe("parmesan");
    expect(historyBody.history).toHaveLength(1);
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
    expect(body[0]).toHaveProperty("supplierName");
    expect(body[0]).toHaveProperty("affectedDishNames");
  });

  it("changes analytics and enriches action ranking after invoice confirmation", async () => {
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
    const actionsResponse = await request(app).get("/api/analytics/actions?dataset=mixed-restaurant");
    const actions = actionsResponse.body as DishAction[];

    expect(after.weightedAverageMarginPercent).toBeLessThan(before.weightedAverageMarginPercent);
    expect(after.estimatedPeriodProfitCents).toBeLessThan(before.estimatedPeriodProfitCents);
    expect(after.supplierAlertCount).toBeGreaterThan(0);
    expect(after.highSeveritySupplierAlertCount).toBeGreaterThan(0);
    expect(actions.some((action) => action.reasonCodes.includes("SUPPLIER_PRICE_INCREASE"))).toBe(true);
  });

  it("blocks repeated confirmation so cost history and alerts are not double-applied", async () => {
    const app = buildApp();
    const parseResponse = await request(app)
      .post("/api/invoices/parse-mock?dataset=mixed-restaurant")
      .send({ sampleInvoiceId: "normal-supplier-invoice" });

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

    const payload = {
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
    };

    const firstResponse = await request(app)
      .post(`/api/invoices/${invoice.invoiceDraft.id}/review-confirm?dataset=mixed-restaurant`)
      .send(payload);
    const secondResponse = await request(app)
      .post(`/api/invoices/${invoice.invoiceDraft.id}/review-confirm?dataset=mixed-restaurant`)
      .send(payload);

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(409);
  });

  it("returns empty cost-history payloads and 404s invalid ingredients", async () => {
    const app = buildApp();
    const emptyHistoryResponse = await request(app).get(
      "/api/ingredients/beef-patty/cost-history?dataset=mixed-restaurant"
    );
    const missingIngredientResponse = await request(app).get(
      "/api/ingredients/ghost/cost-history?dataset=mixed-restaurant"
    );
    const emptyHistoryBody = emptyHistoryResponse.body as { history: unknown[] };

    expect(emptyHistoryResponse.status).toBe(200);
    expect(emptyHistoryBody.history).toEqual([]);
    expect(missingIngredientResponse.status).toBe(404);
  });

  it("creates an OCR draft from fixture upload and returns the linked job", async () => {
    const app = buildApp();
    const uploadResponse = await request(app)
      .post("/api/ocr/invoices/upload?dataset=mixed-restaurant")
      .attach("file", Buffer.from("fixture"), {
        filename: "clean-invoice-photo.jpg",
        contentType: "image/jpeg"
      });

    const uploadBody = uploadResponse.body as {
      ocrJob: { id: string; status: string; invoiceDraftId?: string };
      ocrResult: { confidence: string };
      invoiceDraft: { id: string; sourceType: string };
    };

    expect(uploadResponse.status).toBe(200);
    expect(uploadBody.invoiceDraft.sourceType).toBe("ocr_future");
    expect(uploadBody.ocrJob.status).toBe("parsed");
    expect(uploadBody.ocrResult.confidence).toBe("high");

    const jobResponse = await request(app).get(
      `/api/ocr/jobs/${uploadBody.ocrJob.id}?dataset=mixed-restaurant`
    );
    const jobBody = jobResponse.body as {
      ocrJob: { invoiceDraftId?: string };
    };

    expect(jobResponse.status).toBe(200);
    expect(jobBody.ocrJob.invoiceDraftId).toBe(uploadBody.invoiceDraft.id);
  });

  it("rejects unsupported OCR upload file types", async () => {
    const response = await request(buildApp())
      .post("/api/ocr/invoices/upload?dataset=mixed-restaurant")
      .attach("file", Buffer.from("bad"), {
        filename: "invoice.txt",
        contentType: "text/plain"
      });

    expect(response.status).toBe(415);
  });

  it("blocks OCR confirmation while low-confidence lines remain unresolved", async () => {
    const app = buildApp();
    const uploadResponse = await request(app)
      .post("/api/ocr/invoices/upload?dataset=mixed-restaurant")
      .attach("file", Buffer.from("fixture"), {
        filename: "blurry-invoice-photo.jpg",
        contentType: "image/jpeg"
      });

    const invoice = uploadResponse.body as {
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

    const response = await request(app)
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

    expect(response.status).toBe(400);
  });

  it("confirms OCR drafts through the existing review-confirm flow and updates actions", async () => {
    const app = buildApp();
    const uploadResponse = await request(app)
      .post("/api/ocr/invoices/upload?dataset=mixed-restaurant")
      .attach("file", Buffer.from("fixture"), {
        filename: "clean-invoice-photo.jpg",
        contentType: "image/jpeg"
      });

    const invoice = uploadResponse.body as {
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

    const confirmResponse = await request(app)
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
    const confirmBody = confirmResponse.body as {
      costHistory: Array<{ ingredientId: string }>;
      alerts: Array<{ id: string }>;
    };

    expect(confirmResponse.status).toBe(200);
    expect(confirmBody.costHistory.length).toBeGreaterThan(0);
    expect(confirmBody.alerts.length).toBeGreaterThan(0);

    const actionsResponse = await request(app).get("/api/analytics/actions?dataset=mixed-restaurant");
    const actions = actionsResponse.body as DishAction[];

    expect(actions.some((action) => action.reasonCodes.includes("SUPPLIER_PRICE_INCREASE"))).toBe(true);
  });
});
