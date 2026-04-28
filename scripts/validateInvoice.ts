import {
  confirmInvoiceReview,
  createDefaultSupplierProductMatches,
  createDefaultSuppliers,
  getDemoDataset,
  getMockInvoiceSamples,
  parseMockInvoice,
  type ReviewedInvoiceLineInput
} from "../packages/core/src/index.js";

function formatCurrency(cents: number) {
  return `EUR ${(cents / 100).toFixed(2)}`;
}

function main() {
  const dataset = getDemoDataset("mixed-restaurant");
  const invoiceSamples = getMockInvoiceSamples();
  const failures: string[] = [];

  if (!dataset) {
    console.log("FAIL invoice validation");
    console.log(" - Missing mixed-restaurant dataset.");
    process.exitCode = 1;
    return;
  }

  const suppliers = createDefaultSuppliers(dataset.id, "2026-04-01T00:00:00.000Z");
  const supplierProductMatches = createDefaultSupplierProductMatches(
    dataset.id,
    "2026-04-01T00:00:00.000Z"
  );

  const normalSample = invoiceSamples.find((sample) => sample.id === "normal-supplier-invoice");
  const messySample = invoiceSamples.find((sample) => sample.id === "messy-supplier-invoice");
  const spikeSample = invoiceSamples.find((sample) => sample.id === "high-impact-price-spike");

  if (!normalSample || !messySample || !spikeSample) {
    console.log("FAIL invoice validation");
    console.log(" - Missing one or more canonical invoice samples.");
    process.exitCode = 1;
    return;
  }

  const normalDraft = parseMockInvoice(
    normalSample,
    suppliers,
    dataset.data.ingredients,
    supplierProductMatches,
    {
      restaurantId: dataset.id,
      invoiceId: "validate-normal-01",
      createdAt: "2026-04-21T09:00:00.000Z"
    }
  );

  const messyDraft = parseMockInvoice(
    messySample,
    suppliers,
    dataset.data.ingredients,
    supplierProductMatches,
    {
      restaurantId: dataset.id,
      invoiceId: "validate-messy-01",
      createdAt: "2026-04-21T09:00:00.000Z"
    }
  );

  const spikeDraft = parseMockInvoice(
    spikeSample,
    suppliers,
    dataset.data.ingredients,
    supplierProductMatches,
    {
      restaurantId: dataset.id,
      invoiceId: "validate-spike-01",
      createdAt: "2026-04-21T09:00:00.000Z"
    }
  );

  const tomatoSauceLine = normalDraft.lines.find((line) => line.rawProductName === "Tomato Sauce Base");
  const unknownLine = messyDraft.lines.find((line) => line.rawProductName === "Mystery Herb Mix");

  if (tomatoSauceLine?.parsedUnitPriceCents !== 2) {
    failures.push("Normal invoice should derive Tomato Sauce Base unit price from line total.");
  }

  if (unknownLine?.reviewStatus !== "needs_review") {
    failures.push("Messy invoice should force unknown products into needs_review.");
  }

  const reviewedLines = spikeDraft.lines.map<ReviewedInvoiceLineInput>((line) => ({
    lineId: line.id,
    reviewStatus: "confirmed",
    matchedIngredientId: line.matchedIngredientId,
    parsedQuantity: line.parsedQuantity,
    parsedUnit: line.parsedUnit,
    parsedUnitPriceCents: line.parsedUnitPriceCents ?? 1,
    parsedLineTotalCents: line.parsedLineTotalCents
  }));

  const confirmation = confirmInvoiceReview({
    invoiceDraft: spikeDraft,
    reviewedLines,
    ingredients: dataset.data.ingredients,
    recipes: dataset.data.recipes,
    dishes: dataset.data.dishes,
    suppliers,
    existingCostHistory: [],
    existingAlerts: [],
    existingSupplierProductMatches: supplierProductMatches,
    createdAt: "2026-04-21T09:15:00.000Z"
  });

  if (confirmation.costHistory.length === 0) {
    failures.push("Confirmed spike invoice should create ingredient cost history.");
  }

  if (confirmation.alerts.length === 0) {
    failures.push("Confirmed spike invoice should create price change alerts.");
  }

  if (confirmation.affectedDishes.length === 0) {
    failures.push("Confirmed spike invoice should identify affected dishes.");
  }

  const burgerImpact = confirmation.affectedDishes.find((dish) => dish.dishId === "dish-burger");

  if (!burgerImpact || burgerImpact.periodProfitImpactCents >= 0) {
    failures.push("Confirmed spike invoice should reduce Beef Burger period profit.");
  }

  if (failures.length > 0) {
    console.log("FAIL invoice validation");
    for (const failure of failures) {
      console.log(` - ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("PASS invoice validation");
  console.log(
    `Normal invoice: ${normalDraft.summary.totalLines} lines, ${normalDraft.summary.readyLineCount} ready`
  );
  console.log(
    `Messy invoice: ${messyDraft.summary.totalLines} lines, ${messyDraft.summary.needsReviewLineCount} need review`
  );
  console.log(
    `Spike confirmation: ${confirmation.costHistory.length} history records, ${confirmation.alerts.length} alerts, ${confirmation.affectedDishes.length} affected dishes`
  );
  console.log(
    `Top affected dish: ${confirmation.confirmationSummary.topAffectedDishes[0]?.name ?? "n/a"} (${formatCurrency(
      confirmation.confirmationSummary.topAffectedDishes[0]?.periodProfitImpactCents ?? 0
    )})`
  );
}

main();
