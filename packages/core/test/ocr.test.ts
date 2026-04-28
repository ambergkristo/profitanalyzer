import { describe, expect, it } from "vitest";

import {
  createDefaultSupplierProductMatches,
  createDefaultSuppliers,
  createInvoiceDraftFromOcrResult,
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
    expect(draft.summary.readyLineCount).toBeGreaterThanOrEqual(5);
    expect(draft.lines.some((line) => line.reviewStatus === "needs_review")).toBe(false);
  });

  it("forces blurry OCR lines into needs-review state until they are resolved or ignored", () => {
    const result = resolveFixtureOcrResult("blurry-invoice-photo.png");
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
    expect(unresolvedLines.length).toBeGreaterThanOrEqual(3);
    expect(unresolvedLines.some((line) => line.matchConfidence === "none")).toBe(true);
  });

  it("keeps cropped OCR drafts safe even when invoice header fields are incomplete", () => {
    const result = resolveFixtureOcrResult("rotated-cropped-invoice.webp");
    const validation = validateOcrResultSafety(result);
    const normalized = normalizeOcrResultToInvoiceInput(result, {
      createdAt: "2026-04-28T10:00:00.000Z",
      invoiceKey: "ocr-cropped"
    });

    expect(validation.pass).toBe(true);
    expect(validation.warnings.some((warning) => warning.includes("rotated or cropped"))).toBe(true);
    expect(normalized.invoiceNumber).toBeUndefined();
    expect(normalized.lines.some((line) => line.reviewStatus === "needs_review")).toBe(true);
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
