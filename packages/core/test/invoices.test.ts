import { describe, expect, it } from "vitest";

import {
  calculateCalculatedDishes,
  confirmInvoiceReview,
  createDefaultSupplierProductMatches,
  createDefaultSuppliers,
  getDemoDataset,
  getMockInvoiceSamples,
  parseManualInvoice,
  parseMockInvoice,
  rankCombinedActions,
  type ReviewedInvoiceLineInput
} from "../src/index.js";

describe("mock invoice parser", () => {
  const mixedDataset = getDemoDataset("mixed-restaurant");

  if (!mixedDataset) {
    throw new Error("Mixed dataset is missing.");
  }

  const suppliers = createDefaultSuppliers(mixedDataset.id);
  const supplierProductMatches = createDefaultSupplierProductMatches(mixedDataset.id);
  const invoiceSamples = getMockInvoiceSamples();

  it("creates a deterministic draft and derives missing unit price from line totals", () => {
    const sample = invoiceSamples.find((invoice) => invoice.id === "normal-supplier-invoice");
    const draft = parseMockInvoice(
      sample!,
      suppliers,
      mixedDataset.data.ingredients,
      supplierProductMatches,
      { restaurantId: mixedDataset.id, invoiceId: "invoice-normal-01", createdAt: "2026-04-21T10:00:00.000Z" }
    );

    const tomatoSauceLine = draft.lines.find((line) => line.rawProductName === "Tomato Sauce Base");
    const romaineLine = draft.lines.find((line) => line.rawProductName === "Romaine Lettuce Hearts");

    expect(draft.invoiceDraft.id).toBe("invoice-normal-01");
    expect(draft.invoiceDraft.parseStatus).toBe("draft");
    expect(draft.summary.totalLines).toBe(7);
    expect(draft.summary.readyLineCount).toBe(7);
    expect(tomatoSauceLine?.parsedUnitPriceCents).toBe(2);
    expect(romaineLine?.matchConfidence).toBe("high");
    expect(romaineLine?.matchedIngredientId).toBe("romaine");
  });

  it("marks unknown or unit-mismatched lines for review", () => {
    const sample = invoiceSamples.find((invoice) => invoice.id === "messy-supplier-invoice");
    const draft = parseMockInvoice(
      sample!,
      suppliers,
      mixedDataset.data.ingredients,
      supplierProductMatches,
      { restaurantId: mixedDataset.id, invoiceId: "invoice-messy-01", createdAt: "2026-04-21T10:00:00.000Z" }
    );

    const unknownLine = draft.lines.find((line) => line.rawProductName === "Mystery Herb Mix");
    const mismatchedLine = draft.lines.find((line) => line.rawProductName === "Flatbread Base Pack");

    expect(draft.invoiceDraft.parseStatus).toBe("needs_review");
    expect(unknownLine?.reviewStatus).toBe("needs_review");
    expect(unknownLine?.matchConfidence).toBe("none");
    expect(unknownLine?.warnings.some((warning) => warning.includes("must be reviewed or ignored"))).toBe(true);
    expect(mismatchedLine?.reviewStatus).toBe("needs_review");
    expect(mismatchedLine?.warnings.some((warning) => warning.includes("Unit mismatch"))).toBe(true);
  });

  it("creates a manual structured draft and derives unit price from line total", () => {
    const draft = parseManualInvoice(
      {
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
      },
      suppliers,
      mixedDataset.data.ingredients,
      supplierProductMatches,
      {
        restaurantId: mixedDataset.id,
        supplierId: "supplier-prime-butchery",
        invoiceId: "manual-01",
        createdAt: "2026-04-28T09:00:00.000Z"
      }
    );

    expect(draft.invoiceDraft.sourceType).toBe("manual");
    expect(draft.lines[0].parsedUnitPriceCents).toBe(4);
    expect(draft.lines[0].reviewStatus).toBe("ready");
    expect(draft.lines[0].matchedIngredientId).toBe("beef-patty");
  });

  it("does not update ingredient costs before confirmation", () => {
    const sample = invoiceSamples.find((invoice) => invoice.id === "high-impact-price-spike");
    const originalBeefCost = mixedDataset.data.ingredients.find(
      (ingredient) => ingredient.id === "beef-patty"
    )?.costPerUnitCents;

    const draft = parseMockInvoice(
      sample!,
      suppliers,
      mixedDataset.data.ingredients,
      supplierProductMatches,
      { restaurantId: mixedDataset.id, invoiceId: "invoice-spike-01", createdAt: "2026-04-21T10:00:00.000Z" }
    );

    const parsedBeefLine = draft.lines.find((line) => line.matchedIngredientId === "beef-patty");

    expect(originalBeefCost).toBe(3);
    expect(parsedBeefLine?.newCostPerUnitCents).toBe(4);
    expect(
      mixedDataset.data.ingredients.find((ingredient) => ingredient.id === "beef-patty")?.costPerUnitCents
    ).toBe(originalBeefCost);
  });
});

describe("invoice confirmation", () => {
  const mixedDataset = getDemoDataset("mixed-restaurant");

  if (!mixedDataset) {
    throw new Error("Mixed dataset is missing.");
  }

  const suppliers = createDefaultSuppliers(mixedDataset.id);
  const supplierProductMatches = createDefaultSupplierProductMatches(mixedDataset.id);
  const invoiceSamples = getMockInvoiceSamples();

  it("updates only confirmed lines, writes cost history, and creates product matches", () => {
    const sample = invoiceSamples.find((invoice) => invoice.id === "normal-supplier-invoice");
    const draft = parseMockInvoice(
      sample!,
      suppliers,
      mixedDataset.data.ingredients,
      supplierProductMatches,
      { restaurantId: mixedDataset.id, invoiceId: "invoice-normal-confirm", createdAt: "2026-04-22T09:00:00.000Z" }
    );

    const romaineLine = draft.lines.find((line) => line.rawProductName === "Romaine Lettuce Hearts");

    if (!romaineLine) {
      throw new Error("Expected romaine line.");
    }

    const reviewedLines = draft.lines.map<ReviewedInvoiceLineInput>((line) => ({
      lineId: line.id,
      reviewStatus: line.id === romaineLine.id ? "ignored" : "confirmed",
      matchedIngredientId: line.id === romaineLine.id ? undefined : line.matchedIngredientId,
      parsedQuantity: line.parsedQuantity,
      parsedUnit: line.parsedUnit,
      parsedUnitPriceCents: line.parsedUnitPriceCents ?? 1,
      parsedLineTotalCents: line.parsedLineTotalCents
    }));

    const result = confirmInvoiceReview({
      invoiceDraft: draft,
      reviewedLines,
      ingredients: mixedDataset.data.ingredients,
      recipes: mixedDataset.data.recipes,
      dishes: mixedDataset.data.dishes,
      suppliers,
      existingCostHistory: [],
      existingAlerts: [],
      existingSupplierProductMatches: supplierProductMatches,
      createdAt: "2026-04-22T09:15:00.000Z"
    });

    const updatedParmesan = result.updatedIngredients.find((ingredient) => ingredient.id === "parmesan");
    const updatedAvocado = result.updatedIngredients.find((ingredient) => ingredient.id === "avocado");
    const updatedRomaine = result.updatedIngredients.find((ingredient) => ingredient.id === "romaine");

    expect(result.confirmedInvoice.parseStatus).toBe("confirmed");
    expect(result.confirmationSummary.confirmedLineCount).toBe(6);
    expect(result.confirmationSummary.ignoredLineCount).toBe(1);
    expect(result.confirmationSummary.updatedIngredientCount).toBe(4);
    expect(result.confirmationSummary.priceIncreaseCount).toBe(3);
    expect(result.confirmationSummary.priceDecreaseCount).toBe(1);
    expect(result.confirmationSummary.unchangedCount).toBe(2);
    expect(result.costHistory).toHaveLength(4);
    expect(updatedParmesan?.costPerUnitCents).toBe(7);
    expect(updatedAvocado?.costPerUnitCents).toBe(3);
    expect(updatedRomaine?.costPerUnitCents).toBe(1);
    expect(result.costHistory.some((entry) => entry.ingredientId === "romaine")).toBe(false);
    expect(result.supplierProductMatches).toHaveLength(6);
  });

  it("generates price alerts and affected dish impact for a high-cost spike", () => {
    const sample = invoiceSamples.find((invoice) => invoice.id === "high-impact-price-spike");
    const draft = parseMockInvoice(
      sample!,
      suppliers,
      mixedDataset.data.ingredients,
      supplierProductMatches,
      { restaurantId: mixedDataset.id, invoiceId: "invoice-spike-confirm", createdAt: "2026-04-22T10:00:00.000Z" }
    );

    const reviewedLines = draft.lines.map<ReviewedInvoiceLineInput>((line) => ({
      lineId: line.id,
      reviewStatus: "confirmed",
      matchedIngredientId: line.matchedIngredientId,
      parsedQuantity: line.parsedQuantity,
      parsedUnit: line.parsedUnit,
      parsedUnitPriceCents: line.parsedUnitPriceCents ?? 1,
      parsedLineTotalCents: line.parsedLineTotalCents
    }));

    const result = confirmInvoiceReview({
      invoiceDraft: draft,
      reviewedLines,
      ingredients: mixedDataset.data.ingredients,
      recipes: mixedDataset.data.recipes,
      dishes: mixedDataset.data.dishes,
      suppliers,
      existingCostHistory: [],
      existingAlerts: [],
      existingSupplierProductMatches: supplierProductMatches,
      createdAt: "2026-04-22T10:15:00.000Z"
    });

    const burgerImpact = result.affectedDishes.find((dish) => dish.dishId === "dish-burger");

    expect(result.alerts.some((alert) => alert.type === "ingredient_price_up")).toBe(true);
    expect(result.alerts.some((alert) => alert.type === "dish_margin_at_risk_due_to_cost_change")).toBe(
      true
    );
    expect(result.alerts.some((alert) => alert.severity === "high" || alert.severity === "critical")).toBe(
      true
    );
    expect(burgerImpact?.costDeltaPerSaleCents).toBeGreaterThan(0);
    expect(burgerImpact?.periodProfitImpactCents).toBeLessThan(0);
  });

  it("blocks double-application of the same invoice", () => {
    const sample = invoiceSamples.find((invoice) => invoice.id === "normal-supplier-invoice");
    const draft = parseMockInvoice(
      sample!,
      suppliers,
      mixedDataset.data.ingredients,
      supplierProductMatches,
      { restaurantId: mixedDataset.id, invoiceId: "invoice-repeat", createdAt: "2026-04-22T11:00:00.000Z" }
    );

    const reviewedLines = draft.lines.map<ReviewedInvoiceLineInput>((line) => ({
      lineId: line.id,
      reviewStatus: "confirmed",
      matchedIngredientId: line.matchedIngredientId,
      parsedQuantity: line.parsedQuantity,
      parsedUnit: line.parsedUnit,
      parsedUnitPriceCents: line.parsedUnitPriceCents ?? 1,
      parsedLineTotalCents: line.parsedLineTotalCents
    }));

    const firstResult = confirmInvoiceReview({
      invoiceDraft: draft,
      reviewedLines,
      ingredients: mixedDataset.data.ingredients,
      recipes: mixedDataset.data.recipes,
      dishes: mixedDataset.data.dishes,
      suppliers,
      existingCostHistory: [],
      existingAlerts: [],
      existingSupplierProductMatches: supplierProductMatches,
      createdAt: "2026-04-22T11:15:00.000Z"
    });

    expect(() =>
      confirmInvoiceReview({
        invoiceDraft: draft,
        reviewedLines,
        ingredients: mixedDataset.data.ingredients,
        recipes: mixedDataset.data.recipes,
        dishes: mixedDataset.data.dishes,
        suppliers,
        existingCostHistory: firstResult.costHistory,
        existingAlerts: firstResult.alerts,
        existingSupplierProductMatches: supplierProductMatches,
        createdAt: "2026-04-22T11:16:00.000Z"
      })
    ).toThrow("already been applied to cost history");
  });

  it("promotes supplier-cost risk into the combined action stack without duplicate spam", () => {
    const sample = invoiceSamples.find((invoice) => invoice.id === "high-impact-price-spike");
    const draft = parseMockInvoice(
      sample!,
      suppliers,
      mixedDataset.data.ingredients,
      supplierProductMatches,
      { restaurantId: mixedDataset.id, invoiceId: "invoice-combined-actions", createdAt: "2026-04-22T12:00:00.000Z" }
    );

    const reviewedLines = draft.lines.map<ReviewedInvoiceLineInput>((line) => ({
      lineId: line.id,
      reviewStatus: "confirmed",
      matchedIngredientId: line.matchedIngredientId,
      parsedQuantity: line.parsedQuantity,
      parsedUnit: line.parsedUnit,
      parsedUnitPriceCents: line.parsedUnitPriceCents ?? 1,
      parsedLineTotalCents: line.parsedLineTotalCents
    }));

    const confirmation = confirmInvoiceReview({
      invoiceDraft: draft,
      reviewedLines,
      ingredients: mixedDataset.data.ingredients,
      recipes: mixedDataset.data.recipes,
      dishes: mixedDataset.data.dishes,
      suppliers,
      existingCostHistory: [],
      existingAlerts: [],
      existingSupplierProductMatches: supplierProductMatches,
      createdAt: "2026-04-22T12:15:00.000Z"
    });

    const actions = rankCombinedActions({
      calculatedDishes: calculateCalculatedDishes({
        ingredients: confirmation.updatedIngredients,
        recipes: mixedDataset.data.recipes,
        dishes: mixedDataset.data.dishes
      }),
      invoiceAlerts: confirmation.alerts
    });
    const burgerActions = actions.filter((action) => action.dishId === "dish-burger");
    const supplierAction = burgerActions.find((action) => action.type === "supplier_price_review");

    expect(supplierAction).toBeDefined();
    expect(supplierAction?.reasonCodes).toContain("SUPPLIER_PRICE_INCREASE");
    expect(supplierAction?.reasonCodes).toContain("COST_HISTORY_UPDATED");
    expect(supplierAction?.reasonCodes).toContain("INGREDIENT_PRICE_CHANGE");
    expect(burgerActions).toHaveLength(1);
  });
});
