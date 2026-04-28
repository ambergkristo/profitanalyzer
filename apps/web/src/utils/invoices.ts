import type { InvoiceUnit, PurchaseInvoiceLine } from "../types.js";

export type InvoiceReviewLineState = "needs_review" | "confirmed" | "ignored";

export interface EditableInvoiceLine {
  lineId: string;
  rawProductName: string;
  parsedQuantity: number;
  parsedUnit: InvoiceUnit;
  parsedUnitPriceCents: number | null;
  parsedLineTotalCents?: number;
  matchedIngredientId?: string;
  matchConfidence: PurchaseInvoiceLine["matchConfidence"];
  previousCostPerUnitCents?: number;
  newCostPerUnitCents?: number;
  priceDeltaPercent?: number;
  warnings: string[];
  reviewStatus: InvoiceReviewLineState;
}

export function createEditableInvoiceLines(lines: PurchaseInvoiceLine[]): EditableInvoiceLine[] {
  return lines.map((line) => ({
    lineId: line.id,
    rawProductName: line.rawProductName,
    parsedQuantity: line.parsedQuantity,
    parsedUnit: line.parsedUnit,
    parsedUnitPriceCents: line.parsedUnitPriceCents ?? null,
    parsedLineTotalCents: line.parsedLineTotalCents,
    matchedIngredientId: line.matchedIngredientId,
    matchConfidence: line.matchConfidence,
    previousCostPerUnitCents: line.previousCostPerUnitCents,
    newCostPerUnitCents: line.newCostPerUnitCents,
    priceDeltaPercent: line.priceDeltaPercent,
    warnings: [...line.warnings],
    reviewStatus: line.reviewStatus === "ready" ? "confirmed" : line.reviewStatus
  }));
}

export function hasUnresolvedInvoiceLines(lines: EditableInvoiceLine[]): boolean {
  return lines.some((line) => {
    if (line.reviewStatus === "needs_review") {
      return true;
    }

    if (line.reviewStatus === "ignored") {
      return false;
    }

    return (
      !line.matchedIngredientId ||
      !Number.isFinite(line.parsedQuantity) ||
      line.parsedQuantity <= 0 ||
      line.parsedUnitPriceCents === null ||
      !Number.isFinite(line.parsedUnitPriceCents) ||
      line.parsedUnitPriceCents <= 0
    );
  });
}
