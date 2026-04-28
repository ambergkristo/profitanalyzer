import fs from "node:fs";
import path from "node:path";

import request from "supertest";

import type {
  DishAction,
  InvoiceDraftSummary,
  OverviewMetrics,
  PriceChangeAlert
} from "../packages/core/src/index.js";
import { createApp } from "../apps/api/src/app.js";

function assertCondition(condition: boolean, message: string, failures: string[]) {
  if (!condition) {
    failures.push(message);
  }
}

function ensureReportsDirectory() {
  const reportsDir = path.resolve("reports");
  fs.mkdirSync(reportsDir, { recursive: true });
  return reportsDir;
}

function formatCurrency(cents: number) {
  return `EUR ${(cents / 100).toFixed(2)}`;
}

function toMarkdown(report: {
  sampleParse: string;
  manualDraft: string;
  unresolvedBlock: string;
  confirmation: string;
  alertsAndActions: string;
  costHistory: string;
  repeatedConfirm: string;
}) {
  return `# Invoice Validation Report

## Summary

- ${report.sampleParse}
- ${report.manualDraft}
- ${report.unresolvedBlock}
- ${report.confirmation}
- ${report.alertsAndActions}
- ${report.costHistory}
- ${report.repeatedConfirm}
`;
}

async function main() {
  const app = createApp();
  const failures: string[] = [];

  const normalDraftResponse = await request(app)
    .post("/api/invoices/parse-mock?dataset=mixed-restaurant")
    .send({ sampleInvoiceId: "normal-supplier-invoice" });
  const messyDraftResponse = await request(app)
    .post("/api/invoices/parse-mock?dataset=mixed-restaurant")
    .send({ sampleInvoiceId: "messy-supplier-invoice" });
  const spikeDraftResponse = await request(app)
    .post("/api/invoices/parse-mock?dataset=low-margin-kitchen")
    .send({ sampleInvoiceId: "high-impact-price-spike" });

  assertCondition(normalDraftResponse.status === 200, "Normal sample invoice should parse.", failures);
  assertCondition(messyDraftResponse.status === 200, "Messy sample invoice should parse.", failures);
  assertCondition(spikeDraftResponse.status === 200, "High-impact sample invoice should parse.", failures);

  const normalDraft = normalDraftResponse.body as {
    summary: InvoiceDraftSummary;
  };
  const messyDraft = messyDraftResponse.body as {
    invoiceDraft: { id: string; supplierId: string; invoiceDate: string; invoiceNumber?: string };
    lines: Array<{
      id: string;
      matchedIngredientId?: string;
      parsedQuantity: number;
      parsedUnit: string;
      parsedUnitPriceCents?: number;
      parsedLineTotalCents?: number;
    }>;
    summary: InvoiceDraftSummary;
  };
  const spikeDraft = spikeDraftResponse.body as {
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

  assertCondition(
    normalDraft.summary.readyLineCount > 0,
    "Normal sample invoice should produce ready lines.",
    failures
  );
  assertCondition(
    messyDraft.summary.needsReviewLineCount > 0,
    "Messy sample invoice should produce lines that need review.",
    failures
  );

  const manualDraftResponse = await request(app)
    .post("/api/invoices/manual-draft?dataset=mixed-restaurant")
    .send({
      supplierName: "Prime Butchery Co",
      invoiceNumber: "MAN-100",
      invoiceDate: "2026-04-28",
      lines: [
        {
          rawProductName: "Prime Beef Patty Fresh",
          parsedQuantity: 1000,
          parsedUnit: "g",
          parsedLineTotalCents: 4000,
          matchedIngredientId: "beef-patty"
        }
      ]
    });

  assertCondition(
    manualDraftResponse.status === 200,
    "Manual structured invoice draft should be created.",
    failures
  );

  const manualDraft = manualDraftResponse.body as {
    invoiceDraft: { id: string; supplierId: string; invoiceDate: string; invoiceNumber?: string; sourceType: string };
    lines: Array<{
      id: string;
      matchedIngredientId?: string;
      matchConfidence: string;
      parsedQuantity: number;
      parsedUnit: string;
      parsedUnitPriceCents?: number;
      parsedLineTotalCents?: number;
    }>;
  };

  assertCondition(
    manualDraft.invoiceDraft.sourceType === "manual",
    "Manual draft should be tagged as manual.",
    failures
  );
  assertCondition(
    manualDraft.lines[0]?.parsedUnitPriceCents === 4,
    "Manual draft should derive unit price from line total.",
    failures
  );

  const unresolvedConfirmResponse = await request(app)
    .post(`/api/invoices/${messyDraft.invoiceDraft.id}/review-confirm?dataset=mixed-restaurant`)
    .send({
      supplierId: messyDraft.invoiceDraft.supplierId,
      invoiceDate: messyDraft.invoiceDraft.invoiceDate,
      invoiceNumber: messyDraft.invoiceDraft.invoiceNumber,
      lines: messyDraft.lines.map((line) => ({
        lineId: line.id,
        reviewStatus: "confirmed",
        matchedIngredientId: line.matchedIngredientId,
        parsedQuantity: line.parsedQuantity,
        parsedUnit: line.parsedUnit,
        parsedUnitPriceCents: line.parsedUnitPriceCents ?? 1,
        parsedLineTotalCents: line.parsedLineTotalCents
      }))
    });

  assertCondition(
    unresolvedConfirmResponse.status === 400,
    "Unresolved lines should block confirmation.",
    failures
  );

  const manualConfirmResponse = await request(app)
    .post(`/api/invoices/${manualDraft.invoiceDraft.id}/review-confirm?dataset=mixed-restaurant`)
    .send({
      supplierId: manualDraft.invoiceDraft.supplierId,
      invoiceDate: manualDraft.invoiceDraft.invoiceDate,
      invoiceNumber: manualDraft.invoiceDraft.invoiceNumber,
      lines: manualDraft.lines.map((line) => ({
        lineId: line.id,
        reviewStatus: "confirmed",
        matchedIngredientId: line.matchedIngredientId,
        parsedQuantity: line.parsedQuantity,
        parsedUnit: line.parsedUnit,
        parsedUnitPriceCents: line.parsedUnitPriceCents ?? 1,
        parsedLineTotalCents: line.parsedLineTotalCents
      }))
    });

  const spikeConfirmResponse = await request(app)
    .post(`/api/invoices/${spikeDraft.invoiceDraft.id}/review-confirm?dataset=low-margin-kitchen`)
    .send({
      supplierId: spikeDraft.invoiceDraft.supplierId,
      invoiceDate: spikeDraft.invoiceDraft.invoiceDate,
      invoiceNumber: spikeDraft.invoiceDraft.invoiceNumber,
      lines: spikeDraft.lines.map((line) => ({
        lineId: line.id,
        reviewStatus: "confirmed",
        matchedIngredientId: line.matchedIngredientId,
        parsedQuantity: line.parsedQuantity,
        parsedUnit: line.parsedUnit,
        parsedUnitPriceCents: line.parsedUnitPriceCents ?? 1,
        parsedLineTotalCents: line.parsedLineTotalCents
      }))
    });

  assertCondition(
    manualConfirmResponse.status === 200,
    "Manual draft confirmation should succeed.",
    failures
  );
  assertCondition(
    spikeConfirmResponse.status === 200,
    "High-impact invoice confirmation should succeed.",
    failures
  );

  const confirmation = spikeConfirmResponse.body as {
    confirmationSummary: {
      updatedIngredientCount: number;
      alertCount: number;
      affectedDishCount: number;
      topAffectedDishes: Array<{ name: string; periodProfitImpactCents: number }>;
    };
    costHistory: Array<{ ingredientId: string }>;
    alerts: PriceChangeAlert[];
    affectedDishes: Array<{ dishId: string }>;
  };

  assertCondition(
    confirmation.costHistory.length > 0,
    "Confirmation should create ingredient cost history.",
    failures
  );
  assertCondition(
    confirmation.alerts.length > 0,
    "Confirmation should create supplier price alerts.",
    failures
  );
  assertCondition(
    confirmation.affectedDishes.length > 0,
    "Confirmation should identify affected dishes.",
    failures
  );

  const postMatchDraftResponse = await request(app)
    .post("/api/invoices/manual-draft?dataset=mixed-restaurant")
    .send({
      supplierName: "Prime Butchery Co",
      invoiceNumber: "MAN-101",
      invoiceDate: "2026-04-29",
      lines: [
        {
          rawProductName: "Prime Beef Patty Fresh",
          parsedQuantity: 1000,
          parsedUnit: "g",
          parsedLineTotalCents: 4100
        }
      ]
    });
  const postMatchDraft = postMatchDraftResponse.body as {
    lines: Array<{ matchConfidence: string; matchedIngredientId?: string }>;
  };

  assertCondition(
    postMatchDraftResponse.status === 200 &&
      postMatchDraft.lines[0]?.matchConfidence === "high" &&
      postMatchDraft.lines[0]?.matchedIngredientId === "beef-patty",
    "Confirmed lines should create supplier product matches that improve later drafts.",
    failures
  );

  const alertsResponse = await request(app).get(
    "/api/alerts/price-changes?dataset=low-margin-kitchen"
  );
  const actionsResponse = await request(app).get(
    "/api/analytics/actions?dataset=low-margin-kitchen"
  );
  const overviewResponse = await request(app).get(
    "/api/analytics/overview?dataset=low-margin-kitchen"
  );
  const costHistoryResponse = await request(app).get(
    "/api/ingredients/beef-patty/cost-history?dataset=low-margin-kitchen"
  );
  const repeatedConfirmResponse = await request(app)
    .post(`/api/invoices/${spikeDraft.invoiceDraft.id}/review-confirm?dataset=low-margin-kitchen`)
    .send({
      supplierId: spikeDraft.invoiceDraft.supplierId,
      invoiceDate: spikeDraft.invoiceDraft.invoiceDate,
      invoiceNumber: spikeDraft.invoiceDraft.invoiceNumber,
      lines: spikeDraft.lines.map((line) => ({
        lineId: line.id,
        reviewStatus: "confirmed",
        matchedIngredientId: line.matchedIngredientId,
        parsedQuantity: line.parsedQuantity,
        parsedUnit: line.parsedUnit,
        parsedUnitPriceCents: line.parsedUnitPriceCents ?? 1,
        parsedLineTotalCents: line.parsedLineTotalCents
      }))
    });

  const alerts = alertsResponse.body as PriceChangeAlert[];
  const actions = actionsResponse.body as DishAction[];
  const overview = overviewResponse.body as OverviewMetrics;
  const costHistory = costHistoryResponse.body as {
    ingredientId: string;
    history: Array<{ supplierName: string; invoiceDate: string }>;
  };

  assertCondition(
    alertsResponse.status === 200 && alerts.length > 0,
    "Price alerts endpoint should return confirmed alerts.",
    failures
  );
  assertCondition(
    actionsResponse.status === 200 &&
      actions.some((action) => action.reasonCodes.includes("SUPPLIER_PRICE_INCREASE")),
    "Analytics actions should include invoice-driven supplier-price actions.",
    failures
  );
  assertCondition(
    overviewResponse.status === 200 &&
      overview.supplierAlertCount > 0 &&
      overview.highSeveritySupplierAlertCount > 0,
    "Overview should surface supplier alert counts after confirmation.",
    failures
  );
  assertCondition(
    costHistoryResponse.status === 200 &&
      costHistory.ingredientId === "beef-patty" &&
      costHistory.history.length > 0,
    "Cost-history endpoint should return the updated ingredient history.",
    failures
  );
  assertCondition(
    repeatedConfirmResponse.status === 409,
    "Repeated confirmation should be blocked with a conflict.",
    failures
  );

  const report = {
    sampleParse: `Normal sample parsed with ${normalDraft.summary.readyLineCount} ready lines; messy sample produced ${messyDraft.summary.needsReviewLineCount} unresolved lines.`,
    manualDraft: `Manual structured draft created as ${manualDraft.invoiceDraft.sourceType} with derived unit price ${manualDraft.lines[0]?.parsedUnitPriceCents ?? 0} cents.`,
    unresolvedBlock: `Unresolved-line confirmation returned HTTP ${unresolvedConfirmResponse.status}.`,
    confirmation: `Spike confirmation created ${confirmation.costHistory.length} history records, ${confirmation.alerts.length} alerts, and ${confirmation.affectedDishes.length} affected dishes.`,
    alertsAndActions: `Overview now shows ${overview.supplierAlertCount} supplier alerts, and the ranked action stack includes supplier-price reason codes.`,
    costHistory: `Beef Patty history returned ${costHistory.history.length} entries. Top affected dish: ${confirmation.confirmationSummary.topAffectedDishes[0]?.name ?? "n/a"} (${formatCurrency(confirmation.confirmationSummary.topAffectedDishes[0]?.periodProfitImpactCents ?? 0)}).`,
    repeatedConfirm: `Repeated confirmation returned HTTP ${repeatedConfirmResponse.status}.`
  };

  const reportsDir = ensureReportsDirectory();
  fs.writeFileSync(
    path.join(reportsDir, "invoice-validation-report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8"
  );
  fs.writeFileSync(
    path.join(reportsDir, "invoice-validation-report.md"),
    toMarkdown(report),
    "utf8"
  );

  if (failures.length > 0) {
    console.log("FAIL invoice validation");
    for (const failure of failures) {
      console.log(` - ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("PASS invoice validation");
  console.log(report.sampleParse);
  console.log(report.manualDraft);
  console.log(report.unresolvedBlock);
  console.log(report.confirmation);
  console.log(report.alertsAndActions);
  console.log(report.costHistory);
  console.log(report.repeatedConfirm);
}

void main();
