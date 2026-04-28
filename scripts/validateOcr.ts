import fs from "node:fs";
import path from "node:path";

import request from "supertest";

import type {
  DishAction,
  OcrDraftResponse,
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
  cleanFixture: string;
  blurryFixture: string;
  croppedFixture: string;
  safetyGate: string;
}) {
  return `# OCR Validation Report

## Summary

- ${report.cleanFixture}
- ${report.blurryFixture}
- ${report.croppedFixture}
- ${report.safetyGate}
`;
}

async function main() {
  const app = createApp();
  const failures: string[] = [];

  const cleanUploadResponse = await request(app)
    .post("/api/ocr/invoices/upload?dataset=mixed-restaurant")
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
  const preConfirmAlertsResponse = await request(app).get(
    "/api/alerts/price-changes?dataset=mixed-restaurant"
  );

  assertCondition(cleanJobResponse.status === 200, "Clean OCR job should be retrievable.", failures);
  assertCondition(
    preConfirmHistoryResponse.status === 200 && preConfirmHistoryResponse.body.history.length === 0,
    "OCR draft should not create cost history before confirmation.",
    failures
  );
  assertCondition(
    preConfirmAlertsResponse.status === 200 && preConfirmAlertsResponse.body.length === 0,
    "OCR draft should not create alerts before confirmation.",
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
    croppedDraft.ocrResult.warnings.length > 0,
    "Cropped OCR draft should carry OCR warnings.",
    failures
  );

  const report = {
    cleanFixture: `Clean fixture uploaded with ${cleanDraft.summary.totalLines} lines and confirmed into ${cleanConfirmation.costHistory.length} cost-history records.`,
    blurryFixture: `Blurry fixture uploaded with ${blurryDraft.summary.needsReviewLineCount} unresolved lines and confirmation returned HTTP ${blurryConfirmResponse.status}.`,
    croppedFixture: `Cropped fixture uploaded safely with ${croppedDraft.ocrResult.warnings.length} OCR warnings and invoice number ${croppedDraft.invoiceDraft.invoiceNumber ?? "missing"}.`,
    safetyGate: `Pre-confirm cost history remained ${preConfirmHistoryResponse.body.history.length}; post-confirm alerts reached ${cleanConfirmation.alerts.length} and supplier-price actions were ${postConfirmActions.some((action) => action.reasonCodes.includes("SUPPLIER_PRICE_INCREASE")) ? "present" : "missing"}.`
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
  console.log(`Clean fixture: ${report.cleanFixture}`);
  console.log(`Blurry fixture: ${report.blurryFixture}`);
  console.log(`Cropped fixture: ${report.croppedFixture}`);
  console.log(`Safety gate: ${report.safetyGate}`);
}

main();
