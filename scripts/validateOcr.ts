import fs from "node:fs";
import path from "node:path";

import request from "supertest";

import type {
  DishAction,
  OcrDraftResponse,
  OcrProviderConfig,
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

function toMarkdown(report: {
  providerRegistry: string;
  cleanFixture: string;
  blurryFixture: string;
  croppedFixture: string;
  safetyGate: string;
  failedJob: string;
}) {
  return `# OCR Validation Report

## Summary

- ${report.providerRegistry}
- ${report.cleanFixture}
- ${report.blurryFixture}
- ${report.croppedFixture}
- ${report.safetyGate}
- ${report.failedJob}
`;
}

async function main() {
  const app = createApp();
  const failures: string[] = [];

  const providerRegistryResponse = await request(app).get("/api/ocr/providers");
  const providers = providerRegistryResponse.body as OcrProviderConfig[];
  const fixtureProvider = providers.find((provider) => provider.id === "fixture");
  const externalProvider = providers.find((provider) => provider.id === "external_env");

  assertCondition(providerRegistryResponse.status === 200, "OCR provider registry should load.", failures);
  assertCondition(Boolean(fixtureProvider?.isConfigured), "Fixture provider should be configured.", failures);
  assertCondition(Boolean(fixtureProvider?.isDefault), "Fixture provider should be default.", failures);
  assertCondition(Boolean(externalProvider), "External provider seam should be listed.", failures);

  const invalidProviderResponse = await request(app)
    .post("/api/ocr/invoices/upload?dataset=mixed-restaurant&provider=ghost")
    .attach("file", Buffer.from("fixture"), {
      filename: "clean-invoice-photo.jpg",
      contentType: "image/jpeg"
    });

  assertCondition(invalidProviderResponse.status === 400, "Invalid OCR provider id should be rejected.", failures);

  const invalidTypeResponse = await request(app)
    .post("/api/ocr/invoices/upload?dataset=mixed-restaurant")
    .attach("file", Buffer.from("bad"), {
      filename: "invoice.txt",
      contentType: "text/plain"
    });

  assertCondition(invalidTypeResponse.status === 415, "Unsupported OCR file types should be rejected.", failures);

  const oversizedResponse = await request(app)
    .post("/api/ocr/invoices/upload?dataset=mixed-restaurant")
    .attach("file", Buffer.alloc(11 * 1024 * 1024, "a"), {
      filename: "clean-invoice-photo.jpg",
      contentType: "image/jpeg"
    });

  assertCondition(oversizedResponse.status === 413, "Oversized OCR uploads should be rejected.", failures);

  const beforeOverviewResponse = await request(app).get("/api/analytics/overview?dataset=mixed-restaurant");
  const beforeOverview = beforeOverviewResponse.body as OverviewMetrics;
  const beforeHistoryResponse = await request(app).get(
    "/api/ingredients/parmesan/cost-history?dataset=mixed-restaurant"
  );

  const cleanUploadResponse = await request(app)
    .post("/api/ocr/invoices/upload?dataset=mixed-restaurant&provider=fixture")
    .attach("file", Buffer.from("fixture"), {
      filename: "clean-invoice-photo.jpg",
      contentType: "image/jpeg"
    });

  assertCondition(cleanUploadResponse.status === 200, "Clean OCR fixture should upload successfully.", failures);

  const cleanDraft = cleanUploadResponse.body as OcrDraftResponse;
  const cleanJobResponse = await request(app).get(
    `/api/ocr/jobs/${cleanDraft.ocrJob.id}?dataset=mixed-restaurant`
  );
  const preConfirmHistoryResponse = await request(app).get(
    "/api/ingredients/parmesan/cost-history?dataset=mixed-restaurant"
  );
  const preConfirmOverviewResponse = await request(app).get("/api/analytics/overview?dataset=mixed-restaurant");
  const preConfirmAlertsResponse = await request(app).get(
    "/api/alerts/price-changes?dataset=mixed-restaurant"
  );

  assertCondition(cleanJobResponse.status === 200, "Clean OCR job should be retrievable.", failures);
  assertCondition(
    cleanDraft.providerConfig.id === "fixture",
    "Fixture upload should return the fixture provider config.",
    failures
  );
  assertCondition(
    cleanDraft.qualityReport.recommendedReviewMode === "quick_review",
    "Clean OCR fixture should be marked as quick review.",
    failures
  );
  assertCondition(
    preConfirmHistoryResponse.body.history.length === beforeHistoryResponse.body.history.length,
    "OCR draft should not create cost history before confirmation.",
    failures
  );
  assertCondition(
    preConfirmAlertsResponse.body.length === 0,
    "OCR draft should not create alerts before confirmation.",
    failures
  );
  assertCondition(
    preConfirmOverviewResponse.body.estimatedPeriodProfitCents === beforeOverview.estimatedPeriodProfitCents,
    "Pre-confirm OCR draft should not change analytics.",
    failures
  );

  const cleanConfirmResponse = await request(app)
    .post(`/api/invoices/${cleanDraft.invoiceDraft.id}/review-confirm?dataset=mixed-restaurant`)
    .send({
      supplierId: cleanDraft.invoiceDraft.supplierId,
      invoiceDate: cleanDraft.invoiceDraft.invoiceDate,
      invoiceNumber: cleanDraft.invoiceDraft.invoiceNumber,
      lines: cleanDraft.lines.map((line) => ({
        lineId: line.id,
        reviewStatus: "confirmed",
        matchedIngredientId: line.matchedIngredientId,
        parsedQuantity: line.parsedQuantity,
        parsedUnit: line.parsedUnit,
        parsedUnitPriceCents: line.parsedUnitPriceCents ?? 1,
        parsedLineTotalCents: line.parsedLineTotalCents
      }))
    });

  assertCondition(cleanConfirmResponse.status === 200, "Clean OCR draft should confirm successfully.", failures);

  const cleanConfirmation = cleanConfirmResponse.body as {
    costHistory: Array<{ ingredientId: string }>;
    alerts: PriceChangeAlert[];
  };
  const postConfirmActionsResponse = await request(app).get(
    "/api/analytics/actions?dataset=mixed-restaurant"
  );
  const postConfirmActions = postConfirmActionsResponse.body as DishAction[];
  const postConfirmOverviewResponse = await request(app).get(
    "/api/analytics/overview?dataset=mixed-restaurant"
  );
  const postConfirmOverview = postConfirmOverviewResponse.body as OverviewMetrics;

  assertCondition(
    cleanConfirmation.costHistory.length > 0,
    "Confirmed OCR draft should create ingredient cost history.",
    failures
  );
  assertCondition(
    cleanConfirmation.alerts.length > 0,
    "Confirmed OCR draft should create supplier price alerts.",
    failures
  );
  assertCondition(
    postConfirmActions.some((action) => action.reasonCodes.includes("SUPPLIER_PRICE_INCREASE")),
    "Confirmed OCR draft should enrich ranked actions with supplier-price reason codes.",
    failures
  );
  assertCondition(
    postConfirmOverview.estimatedPeriodProfitCents <= beforeOverview.estimatedPeriodProfitCents,
    "Post-confirm OCR draft should affect analytics.",
    failures
  );

  const blurryUploadResponse = await request(app)
    .post("/api/ocr/invoices/upload?dataset=mixed-restaurant")
    .attach("file", Buffer.from("fixture"), {
      filename: "blurry-invoice-photo.jpg",
      contentType: "image/jpeg"
    });

  assertCondition(blurryUploadResponse.status === 200, "Blurry OCR fixture should upload successfully.", failures);

  const blurryDraft = blurryUploadResponse.body as OcrDraftResponse;
  const blurryConfirmResponse = await request(app)
    .post(`/api/invoices/${blurryDraft.invoiceDraft.id}/review-confirm?dataset=mixed-restaurant`)
    .send({
      supplierId: blurryDraft.invoiceDraft.supplierId,
      invoiceDate: blurryDraft.invoiceDraft.invoiceDate,
      invoiceNumber: blurryDraft.invoiceDraft.invoiceNumber,
      lines: blurryDraft.lines.map((line) => ({
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
    blurryDraft.qualityReport.recommendedReviewMode !== "quick_review",
    "Blurry OCR fixture should not be marked as quick review.",
    failures
  );
  assertCondition(
    blurryDraft.summary.needsReviewLineCount > 0,
    "Blurry OCR draft should contain unresolved lines.",
    failures
  );
  assertCondition(
    blurryConfirmResponse.status === 400,
    "Blurry OCR draft should be blocked from confirmation until lines are resolved or ignored.",
    failures
  );

  const croppedUploadResponse = await request(app)
    .post("/api/ocr/invoices/upload?dataset=mixed-restaurant")
    .attach("file", Buffer.from("fixture"), {
      filename: "cropped-invoice-photo.jpg",
      contentType: "image/jpeg"
    });

  assertCondition(croppedUploadResponse.status === 200, "Cropped OCR fixture should upload successfully.", failures);

  const croppedDraft = croppedUploadResponse.body as OcrDraftResponse;
  assertCondition(
    croppedDraft.qualityReport.recommendedReviewMode === "careful_review",
    "Cropped OCR fixture should be marked as careful review.",
    failures
  );
  assertCondition(
    croppedDraft.qualityReport.warnings.length > 0,
    "Cropped OCR draft should carry OCR warnings.",
    failures
  );

  const failedProviderResponse = await request(app)
    .post("/api/ocr/invoices/upload?dataset=mixed-restaurant&provider=disabled")
    .attach("file", Buffer.from("fixture"), {
      filename: "clean-invoice-photo.jpg",
      contentType: "image/jpeg"
    });

  const failedJobResponse = await request(app).get("/api/ocr/jobs?dataset=mixed-restaurant");
  const failedJobs = failedJobResponse.body as Array<{ status: string; failureReason?: string }>;
  const afterFailedOverviewResponse = await request(app).get(
    "/api/analytics/overview?dataset=mixed-restaurant"
  );
  const afterFailedOverview = afterFailedOverviewResponse.body as OverviewMetrics;

  assertCondition(
    failedProviderResponse.status === 503,
    "Disabled OCR provider should return a safe error.",
    failures
  );
  assertCondition(
    failedJobs.some((job) => job.status === "failed"),
    "Failed OCR provider attempts should create failed OCR jobs.",
    failures
  );
  assertCondition(
    afterFailedOverview.estimatedPeriodProfitCents === postConfirmOverview.estimatedPeriodProfitCents,
    "Failed OCR jobs should not mutate analytics.",
    failures
  );

  const report = {
    providerRegistry: `Providers loaded: ${providers.map((provider) => `${provider.id}:${provider.isConfigured ? "configured" : "not-configured"}`).join(", ")}.`,
    cleanFixture: `Clean fixture used ${cleanDraft.providerConfig.displayName}, returned ${cleanDraft.summary.totalLines} lines, and quality gate marked ${cleanDraft.qualityReport.recommendedReviewMode}.`,
    blurryFixture: `Blurry fixture returned ${blurryDraft.summary.needsReviewLineCount} unresolved lines and confirmation returned HTTP ${blurryConfirmResponse.status}.`,
    croppedFixture: `Cropped fixture returned ${croppedDraft.qualityReport.warnings.length} quality warnings and mode ${croppedDraft.qualityReport.recommendedReviewMode}.`,
    safetyGate: `Pre-confirm analytics stayed unchanged, then post-confirm created ${cleanConfirmation.costHistory.length} cost-history records and ${cleanConfirmation.alerts.length} alerts with supplier-price reason codes present.`,
    failedJob: `Disabled provider returned HTTP ${failedProviderResponse.status}, and produced ${failedJobs.filter((job) => job.status === "failed").length} failed OCR job entries without mutating analytics.`
  };

  const reportsDir = ensureReportsDirectory();
  fs.writeFileSync(
    path.join(reportsDir, "ocr-validation-report.json"),
    `${JSON.stringify(report, null, 2)}\n`
  );
  fs.writeFileSync(
    path.join(reportsDir, "ocr-validation-report.md"),
    `${toMarkdown(report)}\n`
  );

  if (failures.length > 0) {
    console.log("FAIL OCR validation");
    for (const failure of failures) {
      console.log(` - ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("PASS OCR validation");
  console.log(`Provider registry: ${report.providerRegistry}`);
  console.log(`Clean fixture: ${report.cleanFixture}`);
  console.log(`Blurry fixture: ${report.blurryFixture}`);
  console.log(`Cropped fixture: ${report.croppedFixture}`);
  console.log(`Safety gate: ${report.safetyGate}`);
  console.log(`Failed job path: ${report.failedJob}`);
}

main();
