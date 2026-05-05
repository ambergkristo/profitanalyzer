import { describe, expect, it } from "vitest";

import {
  createDefaultSupplierProductMatches,
  createDefaultSuppliers,
  createInvoiceDraftFromOcrResult,
  applyOcrConfidencePolicy,
  evaluateOcrQuality,
  evaluateOcrConfidencePolicy,
  getDemoDataset,
  mapOcrConfidenceToMatchConfidence,
  normalizeOcrResultToInvoiceInput,
  resolveFixtureOcrResult,
  validateOcrResultSafety
} from "../src/index.js";

describe("ocr adapter", () => {
  const dataset = getDemoDataset("mixed-restaurant");

  if (!dataset) {
    throw new Error("Mixed dataset is missing.");
  }

  const suppliers = createDefaultSuppliers(dataset.id);
  const matches = createDefaultSupplierProductMatches(dataset.id);

  it("maps OCR confidence levels directly into invoice match confidence", () => {
    expect(mapOcrConfidenceToMatchConfidence("high")).toBe("high");
    expect(mapOcrConfidenceToMatchConfidence("medium")).toBe("medium");
    expect(mapOcrConfidenceToMatchConfidence("low")).toBe("low");
    expect(mapOcrConfidenceToMatchConfidence("none")).toBe("none");
  });

  it("creates a ready draft from the clean fixture OCR result", () => {
    const result = resolveFixtureOcrResult("clean-invoice-photo.jpg");
    const quality = evaluateOcrQuality(result);
    const draft = createInvoiceDraftFromOcrResult(
      result,
      suppliers,
      dataset.data.ingredients,
      matches,
      {
        restaurantId: dataset.id,
        invoiceId: "ocr-clean-01",
        createdAt: "2026-04-28T09:00:00.000Z"
      }
    );

    expect(draft.invoiceDraft.sourceType).toBe("ocr_future");
    expect(draft.invoiceDraft.id).toBe("ocr-clean-01");
    expect(draft.summary.totalLines).toBe(7);
    expect(quality.recommendedReviewMode).toBe("quick_review");
    expect(quality.missingPricesCount).toBe(0);
    expect(draft.summary.readyLineCount).toBeGreaterThanOrEqual(5);
    expect(draft.lines.some((line) => line.reviewStatus === "needs_review")).toBe(false);
  });

  it("forces blurry OCR lines into needs-review state until they are resolved or ignored", () => {
    const result = resolveFixtureOcrResult("blurry-invoice-photo.png");
    const quality = evaluateOcrQuality(result);
    const draft = createInvoiceDraftFromOcrResult(
      result,
      suppliers,
      dataset.data.ingredients,
      matches,
      {
        restaurantId: dataset.id,
        invoiceId: "ocr-blurry-01",
        createdAt: "2026-04-28T09:15:00.000Z"
      }
    );

    const unresolvedLines = draft.lines.filter((line) => line.reviewStatus === "needs_review");

    expect(draft.invoiceDraft.parseStatus).toBe("needs_review");
    expect(quality.recommendedReviewMode).toBe("manual_entry_recommended");
    expect(quality.missingPricesCount).toBeGreaterThan(0);
    expect(unresolvedLines.length).toBeGreaterThanOrEqual(3);
    expect(unresolvedLines.some((line) => line.matchConfidence === "none")).toBe(true);
  });

  it("keeps cropped OCR drafts safe even when invoice header fields are incomplete", () => {
    const result = resolveFixtureOcrResult("rotated-cropped-invoice.webp");
    const validation = validateOcrResultSafety(result);
    const quality = evaluateOcrQuality(result);
    const normalized = normalizeOcrResultToInvoiceInput(result, {
      createdAt: "2026-04-28T10:00:00.000Z",
      invoiceKey: "ocr-cropped"
    });

    expect(validation.pass).toBe(true);
    expect(quality.recommendedReviewMode).toBe("careful_review");
    expect(validation.warnings.some((warning) => warning.includes("rotated or cropped"))).toBe(true);
    expect(normalized.invoiceNumber).toBeUndefined();
    expect(normalized.lines.some((line) => line.reviewStatus === "needs_review")).toBe(true);
  });

  it("recommends manual entry for unusable OCR with no lines", () => {
    const result = {
      confidence: "none" as const,
      warnings: ["OCR returned no usable lines."],
      lines: []
    };
    const quality = evaluateOcrQuality(result);
    const validation = validateOcrResultSafety(result);

    expect(quality.recommendedReviewMode).toBe("manual_entry_recommended");
    expect(validation.pass).toBe(false);
    expect(validation.failures).toContain("OCR result did not contain any lines.");
  });

  it("applies explicit OCR confidence policy thresholds to quality reports", () => {
    const clean = resolveFixtureOcrResult("clean-invoice-photo.jpg");
    const cleanQuality = applyOcrConfidencePolicy(clean, evaluateOcrQuality(clean));

    expect(cleanQuality.recommendedReviewMode).toBe("quick_review");
    expect(cleanQuality.unresolvedLineRate).toBe(0);
    expect(cleanQuality.reviewBurdenScore).toBeLessThan(20);

    const blurry = resolveFixtureOcrResult("blurry-invoice-photo.jpg");
    const blurryPolicy = evaluateOcrConfidencePolicy(blurry, evaluateOcrQuality(blurry));

    expect(blurryPolicy.recommendedReviewMode).toBe("manual_entry_recommended");
    expect(blurryPolicy.unresolvedLineRate).toBeGreaterThan(0.4);
    expect(blurryPolicy.warnings.length).toBeGreaterThan(0);
  });

  it("recommends manual entry when many OCR rows have missing prices or unknown products", () => {
    const result = {
      supplierName: "Unknown Supplier",
      invoiceDate: "2026-04-28",
      confidence: "low" as const,
      warnings: [],
      lines: [
        {
          rawProductName: "Unknown A",
          quantity: 1,
          unit: "g" as const,
          confidence: "none" as const,
          warnings: ["Missing OCR product mapping."]
        },
        {
          rawProductName: "Unknown B",
          quantity: 1,
          unit: "g" as const,
          confidence: "low" as const,
          warnings: []
        },
        {
          rawProductName: "Unknown C",
          quantity: 1,
          unit: "g" as const,
          lineTotalCents: 1200,
          confidence: "none" as const,
          warnings: []
        }
      ]
    };
    const quality = evaluateOcrQuality(result);

    expect(quality.unknownProductCount).toBe(2);
    expect(quality.missingPricesCount).toBe(2);
    expect(quality.recommendedReviewMode).toBe("manual_entry_recommended");
  });

  it("does not mutate ingredient costs before OCR draft confirmation", () => {
    const originalBeefCost = dataset.data.ingredients.find(
      (ingredient) => ingredient.id === "beef-patty"
    )?.costPerUnitCents;
    const result = resolveFixtureOcrResult("cropped-invoice-photo.jpg");
    const draft = createInvoiceDraftFromOcrResult(
      result,
      suppliers,
      dataset.data.ingredients,
      matches,
      {
        restaurantId: dataset.id,
        invoiceId: "ocr-safety-01",
        createdAt: "2026-04-28T10:30:00.000Z"
      }
    );
    const parsedBeefLine = draft.lines.find((line) => line.matchedIngredientId === "beef-patty");

    expect(originalBeefCost).toBe(3);
    expect(parsedBeefLine?.newCostPerUnitCents).toBe(4);
    expect(
      dataset.data.ingredients.find((ingredient) => ingredient.id === "beef-patty")?.costPerUnitCents
    ).toBe(originalBeefCost);
  });
});
