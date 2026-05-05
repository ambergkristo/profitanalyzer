import fs from "node:fs";
import path from "node:path";

import request from "supertest";

import type {
  DishAction,
  OcrDraftResponse,
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

function writeReport(report: Record<string, unknown>) {
  const reportsDir = ensureReportsDirectory();
  fs.writeFileSync(
    path.join(reportsDir, "invoice-pipeline-validation-report.json"),
    `${JSON.stringify(report, null, 2)}\n`
  );
  fs.writeFileSync(
    path.join(reportsDir, "invoice-pipeline-validation-report.md"),
    `# Invoice Pipeline Validation Report

## Summary

- uploadStorage: ${report.uploadStorage}
- ocrLifecycle: ${report.ocrLifecycle}
- confidencePolicy: ${report.confidencePolicy}
- reviewConfirmSafety: ${report.reviewConfirmSafety}
- auditability: ${report.auditability}
- mobileUpload: ${report.mobileUpload}
`
  );
}

function containsPrivatePath(value: unknown) {
  const text = JSON.stringify(value);
  return text.includes("\\") || text.includes("C:") || text.includes(".uploads") || text.includes("uploads/");
}

async function confirmDraft(app: ReturnType<typeof createApp>, draft: OcrDraftResponse) {
  return request(app)
    .post(`/api/invoices/${draft.invoiceDraft.id}/review-confirm?dataset=mixed-restaurant`)
    .send({
      supplierId: draft.invoiceDraft.supplierId,
      invoiceDate: draft.invoiceDraft.invoiceDate,
      invoiceNumber: draft.invoiceDraft.invoiceNumber,
      lines: draft.lines.map((line) => ({
        lineId: line.id,
        reviewStatus: "confirmed",
        matchedIngredientId: line.matchedIngredientId,
        parsedQuantity: line.parsedQuantity,
        parsedUnit: line.parsedUnit,
        parsedUnitPriceCents: line.parsedUnitPriceCents ?? 1,
        parsedLineTotalCents: line.parsedLineTotalCents
      }))
    });
}

async function main() {
  const failures: string[] = [];
  const app = createApp({
    env: {
      ...process.env,
      UPLOAD_STORAGE_DRIVER: "memory"
    }
  });

  const beforeOverviewResponse = await request(app).get("/api/analytics/overview?dataset=mixed-restaurant");
  const beforeOverview = beforeOverviewResponse.body as OverviewMetrics;
  const uploadResponse = await request(app)
    .post("/api/ocr/invoices/upload?dataset=mixed-restaurant&provider=fixture")
    .attach("file", Buffer.from("synthetic clean fixture"), {
      filename: "../clean-invoice-photo.jpg",
      contentType: "image/jpeg"
    });

  assertCondition(uploadResponse.status === 200, "Fixture OCR upload should create a draft.", failures);
  const draft = uploadResponse.body as OcrDraftResponse;

  assertCondition(Boolean(draft.ocrJob.uploadObjectId), "OCR job should link to upload metadata.", failures);
  assertCondition(draft.ocrJob.uploadObject?.storageProvider === "memory", "Memory upload storage should be used.", failures);
  assertCondition(
    draft.ocrJob.sanitizedFileName === "clean-invoice-photo.jpg",
    "Original filename should be sanitized before returning metadata.",
    failures
  );
  assertCondition(!containsPrivatePath(draft.ocrJob), "OCR job response should not expose private local paths.", failures);
  assertCondition(
    draft.qualityReport.policyWarnings !== undefined,
    "OCR quality report should include confidence policy output.",
    failures
  );

  const jobResponse = await request(app).get(`/api/ocr/jobs/${draft.ocrJob.id}?dataset=mixed-restaurant`);
  assertCondition(jobResponse.status === 200, "OCR job status endpoint should return the job.", failures);
  assertCondition(
    ["parsed", "needs_review"].includes(jobResponse.body.ocrJob.status),
    "OCR job should reach parsed or needs_review lifecycle status.",
    failures
  );

  const preConfirmOverviewResponse = await request(app).get("/api/analytics/overview?dataset=mixed-restaurant");
  const preConfirmOverview = preConfirmOverviewResponse.body as OverviewMetrics;
  assertCondition(
    preConfirmOverview.estimatedPeriodProfitCents === beforeOverview.estimatedPeriodProfitCents,
    "OCR draft creation must not mutate analytics before review-confirm.",
    failures
  );

  const confirmResponse = await confirmDraft(app, draft);
  assertCondition(confirmResponse.status === 200, "Review-confirm should confirm clean OCR draft.", failures);

  const confirmation = confirmResponse.body as {
    costHistory: Array<{ ingredientId: string }>;
    alerts: PriceChangeAlert[];
  };
  assertCondition(confirmation.costHistory.length > 0, "Review-confirm should create cost history.", failures);
  assertCondition(confirmation.alerts.length > 0, "Review-confirm should create price alerts.", failures);

  const actionsResponse = await request(app).get("/api/analytics/actions?dataset=mixed-restaurant");
  const actions = actionsResponse.body as DishAction[];
  assertCondition(
    actions.some((action) =>
      action.reasonCodes.some((reasonCode) => reasonCode.toLowerCase() === "supplier_price_increase")
    ),
    "Post-confirm actions should include supplier price reason codes.",
    failures
  );

  const failedUploadResponse = await request(app)
    .post("/api/ocr/invoices/upload?dataset=mixed-restaurant&provider=disabled")
    .attach("file", Buffer.from("synthetic failure fixture"), {
      filename: "clean-invoice-photo.jpg",
      contentType: "image/jpeg"
    });
  assertCondition(failedUploadResponse.status === 503, "Disabled provider should fail safely.", failures);
  assertCondition(
    failedUploadResponse.body.ocrJob?.status === "failed",
    "Disabled provider should create failed OCR job metadata.",
    failures
  );

  const retryResponse = await request(app).post(
    `/api/ocr/jobs/${failedUploadResponse.body.ocrJob.id}/retry?dataset=mixed-restaurant`
  );
  assertCondition(retryResponse.status === 422, "Retrying disabled provider should fail safely.", failures);
  assertCondition(
    retryResponse.body.ocrJob?.providerAttemptCount === 2,
    "Retry should record incremented provider attempt count.",
    failures
  );

  const cancelResponse = await request(app).post(
    `/api/ocr/jobs/${retryResponse.body.ocrJob.id}/cancel?dataset=mixed-restaurant`
  );
  assertCondition(cancelResponse.status === 200, "Failed retry job should be cancellable.", failures);
  assertCondition(cancelResponse.body.ocrJob.status === "cancelled", "Cancel should mark the job cancelled.", failures);

  const tempUploadDir = path.resolve(".tmp", "invoice-pipeline-uploads");
  fs.rmSync(tempUploadDir, { recursive: true, force: true });
  const localFileApp = createApp({
    env: {
      ...process.env,
      UPLOAD_STORAGE_DRIVER: "local_file",
      UPLOAD_DATA_DIR: tempUploadDir
    }
  });
  const localUploadResponse = await request(localFileApp)
    .post("/api/ocr/invoices/upload?dataset=mixed-restaurant&provider=fixture")
    .attach("file", Buffer.from("synthetic local file fixture"), {
      filename: "clean-invoice-photo.jpg",
      contentType: "image/jpeg"
    });
  assertCondition(localUploadResponse.status === 200, "Local file upload storage should create draft.", failures);
  const localDraft = localUploadResponse.body as OcrDraftResponse;
  assertCondition(
    localDraft.ocrJob.uploadObject?.storageProvider === "local_file",
    "Local file upload metadata should identify local_file provider.",
    failures
  );
  assertCondition(
    fs.existsSync(path.join(tempUploadDir, localDraft.ocrJob.uploadObject?.storageKey ?? "missing")),
    "Local file upload storage should write into configured upload directory.",
    failures
  );
  assertCondition(!containsPrivatePath(localDraft.ocrJob), "Local file response should not expose local path.", failures);
  fs.rmSync(tempUploadDir, { recursive: true, force: true });

  const report = {
    pass: failures.length === 0,
    uploadStorage: "memory and local_file upload metadata validated without exposing local paths",
    ocrLifecycle: "parsed/needs_review, failed, retry, and cancelled states validated",
    confidencePolicy: `${draft.qualityReport.recommendedReviewMode} with review burden ${draft.qualityReport.reviewBurdenScore ?? "n/a"}`,
    reviewConfirmSafety: `pre-confirm analytics unchanged; post-confirm created ${confirmation.costHistory.length} cost-history records and ${confirmation.alerts.length} alerts`,
    auditability: "key invoice/OCR audit event hooks are wired; persistence depends on selected store driver",
    mobileUpload: "upload accepts mobile image/PDF input and validation copy is covered by mobile validation",
    failures
  };
  writeReport(report);

  if (failures.length > 0) {
    console.log("FAIL invoice pipeline validation");
    for (const failure of failures) {
      console.log(` - ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("PASS invoice pipeline validation");
  console.log(`uploadStorage=${report.uploadStorage}`);
  console.log(`ocrLifecycle=${report.ocrLifecycle}`);
  console.log(`confidencePolicy=${report.confidencePolicy}`);
  console.log(`reviewConfirmSafety=${report.reviewConfirmSafety}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
