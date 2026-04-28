import fs from "node:fs";
import path from "node:path";

import request from "supertest";

import type { OverviewMetrics } from "../packages/core/src/index.js";
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

function toMarkdown(report: Record<string, string>) {
  return `# Pilot Validation Report

## Summary

- ${report.appConfig}
- ${report.deepHealth}
- ${report.exportImport}
- ${report.reset}
- ${report.invoiceAfterReset}
- ${report.ocrAfterReset}
- ${report.pilotReadiness}
`;
}

async function main() {
  const app = createApp();
  const failures: string[] = [];

  const appConfigResponse = await request(app).get("/api/app/config");
  const deepHealthResponse = await request(app).get("/api/health/deep");

  assertCondition(appConfigResponse.status === 200, "App config endpoint should load.", failures);
  assertCondition(deepHealthResponse.status === 200, "Deep health endpoint should load.", failures);
  assertCondition(appConfigResponse.body.appMode === "demo", "Default app mode should be demo.", failures);
  assertCondition(appConfigResponse.body.features.persistence === "memory", "Storage should default to memory.", failures);
  assertCondition(
    JSON.stringify(appConfigResponse.body).includes("API_KEY") === false,
    "App config must not expose secrets.",
    failures
  );

  const exportResponse = await request(app).get("/api/export?dataset=mixed-restaurant");
  assertCondition(exportResponse.status === 200, "Dataset export should succeed.", failures);

  const invalidImportResponse = await request(app)
    .post("/api/import?dataset=pilot-workspace")
    .send({ dataset: { id: "pilot-workspace" } });
  assertCondition(invalidImportResponse.status === 400, "Invalid import payload should be rejected.", failures);

  const importedPayload = {
    ...exportResponse.body,
    dataset: {
      ...exportResponse.body.dataset,
      id: "pilot-workspace",
      name: "Pilot Workspace",
      description: "Imported pilot workspace for validation"
    }
  };
  const importResponse = await request(app)
    .post("/api/import?dataset=pilot-workspace")
    .send(importedPayload);

  assertCondition(importResponse.status === 201, "Pilot workspace import should succeed.", failures);

  const preResetInvoiceDraftResponse = await request(app)
    .post("/api/invoices/parse-mock?dataset=mixed-restaurant")
    .send({ sampleInvoiceId: "normal-supplier-invoice" });
  const preResetInvoiceDraft = preResetInvoiceDraftResponse.body as {
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
  const preResetConfirmResponse = await request(app)
    .post(`/api/invoices/${preResetInvoiceDraft.invoiceDraft.id}/review-confirm?dataset=mixed-restaurant`)
    .send({
      supplierId: preResetInvoiceDraft.invoiceDraft.supplierId,
      invoiceDate: preResetInvoiceDraft.invoiceDraft.invoiceDate,
      invoiceNumber: preResetInvoiceDraft.invoiceDraft.invoiceNumber,
      lines: preResetInvoiceDraft.lines.map((line) => ({
        lineId: line.id,
        reviewStatus: "confirmed",
        matchedIngredientId: line.matchedIngredientId,
        parsedQuantity: line.parsedQuantity,
        parsedUnit: line.parsedUnit,
        parsedUnitPriceCents: line.parsedUnitPriceCents ?? 1,
        parsedLineTotalCents: line.parsedLineTotalCents
      }))
    });

  assertCondition(preResetConfirmResponse.status === 200, "Invoice confirmation should work before reset.", failures);

  const resetResponse = await request(app).post("/api/datasets/mixed-restaurant/reset").send({});
  assertCondition(resetResponse.status === 200, "Dataset reset should succeed.", failures);

  const postResetOverviewResponse = await request(app).get("/api/analytics/overview?dataset=mixed-restaurant");
  const postResetOverview = postResetOverviewResponse.body as OverviewMetrics;
  const postResetHistoryResponse = await request(app).get(
    "/api/ingredients/parmesan/cost-history?dataset=mixed-restaurant"
  );

  assertCondition(postResetOverviewResponse.status === 200, "Analytics should still work after reset.", failures);
  assertCondition(postResetOverview.supplierAlertCount === 0, "Reset should clear supplier alerts.", failures);
  assertCondition(
    Array.isArray(postResetHistoryResponse.body.history) && postResetHistoryResponse.body.history.length === 0,
    "Reset should clear cost history.",
    failures
  );

  const postResetInvoiceResponse = await request(app)
    .post("/api/invoices/parse-mock?dataset=mixed-restaurant")
    .send({ sampleInvoiceId: "normal-supplier-invoice" });
  assertCondition(postResetInvoiceResponse.status === 200, "Invoice parsing should still work after reset.", failures);

  const ocrResponse = await request(app)
    .post("/api/ocr/invoices/upload?dataset=mixed-restaurant")
    .attach("file", Buffer.from("fixture"), {
      filename: "clean-invoice-photo.jpg",
      contentType: "image/jpeg"
    });
  assertCondition(ocrResponse.status === 200, "Fixture OCR should still work after reset.", failures);

  const report = {
    appConfig: `App mode ${appConfigResponse.body.appMode}; persistence ${appConfigResponse.body.features.persistence}; external OCR configured ${String(appConfigResponse.body.features.externalOcrConfigured)}.`,
    deepHealth: `Deep health returned ${deepHealthResponse.body.checks.length} checks with storage ${deepHealthResponse.body.storage}.`,
    exportImport: `Export returned dataset ${exportResponse.body.dataset.id}; invalid import returned HTTP ${invalidImportResponse.status}; pilot import returned HTTP ${importResponse.status}.`,
    reset: `Reset returned HTTP ${resetResponse.status} and cleared ${resetResponse.body.clearedInvoices} invoices plus ${resetResponse.body.clearedAlerts} alerts.`,
    invoiceAfterReset: `Overview after reset shows ${postResetOverview.supplierAlertCount} supplier alerts; invoice parse after reset returned HTTP ${postResetInvoiceResponse.status}.`,
    ocrAfterReset: `Fixture OCR after reset returned HTTP ${ocrResponse.status} with source ${ocrResponse.body.invoiceDraft?.sourceType ?? "unknown"}.`,
    pilotReadiness:
      "Pilot foundation is ready for a controlled workspace: config endpoint, deep health, export/import boundary, reset safety, invoice intake, and OCR fixture remain operational."
  };

  const reportsDir = ensureReportsDirectory();
  fs.writeFileSync(
    path.join(reportsDir, "pilot-validation-report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8"
  );
  fs.writeFileSync(
    path.join(reportsDir, "pilot-validation-report.md"),
    `${toMarkdown(report)}\n`,
    "utf8"
  );

  if (failures.length > 0) {
    console.log("FAIL pilot validation");
    for (const failure of failures) {
      console.log(` - ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("PASS pilot validation");
  console.log(report.appConfig);
  console.log(report.deepHealth);
  console.log(report.exportImport);
  console.log(report.reset);
  console.log(report.invoiceAfterReset);
  console.log(report.ocrAfterReset);
  console.log(report.pilotReadiness);
}

void main();
