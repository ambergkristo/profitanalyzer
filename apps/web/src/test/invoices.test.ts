import { describe, expect, it } from "vitest";

import { createEditableInvoiceLines, hasUnresolvedInvoiceLines } from "../utils/invoices.js";

describe("invoice review utilities", () => {
  it("converts ready lines into confirmable review state", () => {
    const editable = createEditableInvoiceLines([
      {
        id: "line-1",
        invoiceId: "invoice-1",
        rawProductName: "Beef Patty 180g Fresh",
        parsedQuantity: 1000,
        parsedUnit: "g",
        parsedUnitPriceCents: 4,
        parsedLineTotalCents: 4000,
        matchedIngredientId: "beef-patty",
        matchConfidence: "high",
        reviewStatus: "ready",
        previousCostPerUnitCents: 3,
        newCostPerUnitCents: 4,
        priceDeltaPercent: 33.3,
        warnings: []
      }
    ]);

    expect(editable[0]?.reviewStatus).toBe("confirmed");
  });

  it("flags unresolved invoice lines until they are confirmed or ignored", () => {
    expect(
      hasUnresolvedInvoiceLines([
        {
          lineId: "line-1",
          rawProductName: "Mystery Herb Mix",
          parsedQuantity: 100,
          parsedUnit: "g",
          parsedUnitPriceCents: 9,
          matchedIngredientId: undefined,
          matchConfidence: "none",
          previousCostPerUnitCents: undefined,
          newCostPerUnitCents: undefined,
          priceDeltaPercent: undefined,
          warnings: ["No match"],
          reviewStatus: "needs_review"
        }
      ])
    ).toBe(true);

    expect(
      hasUnresolvedInvoiceLines([
        {
          lineId: "line-1",
          rawProductName: "Mystery Herb Mix",
          parsedQuantity: 100,
          parsedUnit: "g",
          parsedUnitPriceCents: 9,
          matchedIngredientId: undefined,
          matchConfidence: "none",
          previousCostPerUnitCents: undefined,
          newCostPerUnitCents: undefined,
          priceDeltaPercent: undefined,
          warnings: ["No match"],
          reviewStatus: "ignored"
        }
      ])
    ).toBe(false);
  });
});
