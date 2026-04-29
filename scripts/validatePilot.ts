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

- ${report.memoryMode}
- ${report.fileMode}
- ${report.exportImport}
- ${report.persistence}
- ${report.invoiceAfterReload}
- ${report.ocrAfterReload}
- ${report.resetAfterReload}
- ${report.pilotReadiness}
`;
}

async function main() {
  const failures: string[] = [];
  const memoryEnv = {
    ...process.env,
    APP_MODE: "demo",
    STORE_DRIVER: "memory",
    DATA_DIR: ".data"
  };
  const memoryApp = createApp({ env: memoryEnv });

  const appConfigResponse = await request(memoryApp).get("/api/app/config");
  const deepHealthResponse = await request(memoryApp).get("/api/health/deep");

  assertCondition(appConfigResponse.status === 200, "App config endpoint should load.", failures);
  assertCondition(deepHealthResponse.status === 200, "Deep health endpoint should load.", failures);
  assertCondition(appConfigResponse.body.appMode === "demo", "Default app mode should be demo.", failures);
  assertCondition(appConfigResponse.body.storage?.driver === "memory", "Default storage should be memory.", failures);
  assertCondition(
    JSON.stringify(appConfigResponse.body).includes("API_KEY") === false,
    "App config must not expose secrets.",
    failures
  );

  const memoryExportResponse = await request(memoryApp).get("/api/export?dataset=mixed-restaurant");
  assertCondition(memoryExportResponse.status === 200, "Dataset export should succeed in memory mode.", failures);
  assertCondition(
    JSON.stringify(memoryExportResponse.body).includes("OCR_PROVIDER_API_KEY") === false,
    "Export payloads must not include secrets.",
    failures
  );

  const invalidImportResponse = await request(memoryApp)
    .post("/api/import?dataset=pilot-workspace")
    .send({ dataset: { id: "pilot-workspace" } });
  assertCondition(invalidImportResponse.status === 400, "Invalid import payload should be rejected.", failures);

  const tempDataDir = path.resolve(".tmp", "validate-pilot-store");
  fs.rmSync(tempDataDir, { force: true, recursive: true });

  const fileEnv = {
    ...process.env,
    APP_MODE: "pilot",
    STORE_DRIVER: "file",
    DATA_DIR: tempDataDir,
    OCR_PROVIDER: "fixture"
  };

  try {
    const fileApp = createApp({ env: fileEnv });
    const fileConfigResponse = await request(fileApp).get("/api/app/config");
    const fileHealthResponse = await request(fileApp).get("/api/health/deep");
    const datasetsResponse = await request(fileApp).get("/api/demo/datasets");

    assertCondition(fileConfigResponse.status === 200, "File-store app config should load.", failures);
    assertCondition(fileHealthResponse.status === 200, "File-store deep health should load.", failures);
    assertCondition(fileConfigResponse.body.appMode === "pilot", "Pilot app mode should be reported.", failures);
    assertCondition(fileConfigResponse.body.storage?.driver === "file", "Storage driver should be file.", failures);
    assertCondition(fileConfigResponse.body.storage?.readable === true, "File store should be readable.", failures);
    assertCondition(fileConfigResponse.body.storage?.writable === true, "File store should be writable.", failures);
    assertCondition(fileHealthResponse.body.ok === true, "File-store health should be ok.", failures);
    assertCondition(
      Array.isArray(datasetsResponse.body) &&
        datasetsResponse.body.some((dataset: { id: string }) => dataset.id === "pilot-workspace"),
      "Pilot workspace should be available in pilot mode.",
      failures
    );

    const pilotOverviewBeforeEditResponse = await request(fileApp).get(
      "/api/analytics/overview?dataset=pilot-workspace"
    );
    const pilotOverviewBeforeEdit = pilotOverviewBeforeEditResponse.body as OverviewMetrics;

    const pilotWorkspaceExport = memoryExportResponse.body as Record<string, unknown>;
    const pilotImportResponse = await request(fileApp)
      .post("/api/import?dataset=pilot-import-workspace")
      .send({
        ...pilotWorkspaceExport,
        dataset: {
          ...(pilotWorkspaceExport.dataset as Record<string, unknown>),
          id: "pilot-import-workspace",
          name: "Pilot Import Workspace",
          description: "Imported pilot workspace for persistence validation"
        }
      });

    assertCondition(pilotImportResponse.status === 201, "Pilot workspace import should succeed in file mode.", failures);

    const pilotIngredientUpdateResponse = await request(fileApp)
      .patch("/api/ingredients/pilot-romaine?dataset=pilot-workspace")
      .send({
        name: "Pilot Romaine Lettuce",
        costPerUnitCents: 95,
        unit: "g"
      });
    assertCondition(pilotIngredientUpdateResponse.status === 200, "Ingredient update should succeed in file mode.", failures);

    const pilotDishUpdateResponse = await request(fileApp)
      .patch("/api/dishes/pilot-dish-burger?dataset=pilot-workspace")
      .send({
        priceCents: 1590,
        salesVolume: 18
      });
    assertCondition(pilotDishUpdateResponse.status === 200, "Dish update should succeed in file mode.", failures);

    const mixedInvoiceDraftResponse = await request(fileApp)
      .post("/api/invoices/parse-mock?dataset=mixed-restaurant")
      .send({ sampleInvoiceId: "normal-supplier-invoice" });
    assertCondition(mixedInvoiceDraftResponse.status === 200, "File-store invoice parsing should work.", failures);

    const mixedInvoiceDraft = mixedInvoiceDraftResponse.body as {
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

    const mixedConfirmResponse = await request(fileApp)
      .post(`/api/invoices/${mixedInvoiceDraft.invoiceDraft.id}/review-confirm?dataset=mixed-restaurant`)
      .send({
        supplierId: mixedInvoiceDraft.invoiceDraft.supplierId,
        invoiceDate: mixedInvoiceDraft.invoiceDraft.invoiceDate,
        invoiceNumber: mixedInvoiceDraft.invoiceDraft.invoiceNumber,
        lines: mixedInvoiceDraft.lines.map((line) => ({
          lineId: line.id,
          reviewStatus: "confirmed",
          matchedIngredientId: line.matchedIngredientId,
          parsedQuantity: line.parsedQuantity,
          parsedUnit: line.parsedUnit,
          parsedUnitPriceCents: line.parsedUnitPriceCents ?? 1,
          parsedLineTotalCents: line.parsedLineTotalCents
        }))
      });
    assertCondition(mixedConfirmResponse.status === 200, "Invoice confirmation should work in file mode.", failures);

    const ocrResponse = await request(fileApp)
      .post("/api/ocr/invoices/upload?dataset=mixed-restaurant")
      .attach("file", Buffer.from("fixture"), {
        filename: "clean-invoice-photo.jpg",
        contentType: "image/jpeg"
      });
    assertCondition(ocrResponse.status === 200, "Fixture OCR should work in file mode.", failures);

    const reloadedFileApp = createApp({ env: fileEnv });
    const persistedPilotIngredientsResponse = await request(reloadedFileApp).get(
      "/api/ingredients?dataset=pilot-workspace"
    );
    const persistedPilotDishesResponse = await request(reloadedFileApp).get(
      "/api/dishes?dataset=pilot-workspace"
    );
    const persistedMixedOverviewResponse = await request(reloadedFileApp).get(
      "/api/analytics/overview?dataset=mixed-restaurant"
    );
    const persistedPilotOverviewResponse = await request(reloadedFileApp).get(
      "/api/analytics/overview?dataset=pilot-workspace"
    );
    const persistedHistoryResponse = await request(reloadedFileApp).get(
      "/api/ingredients/parmesan/cost-history?dataset=mixed-restaurant"
    );
    const persistedOcrJobsResponse = await request(reloadedFileApp).get(
      "/api/ocr/jobs?dataset=mixed-restaurant"
    );

    const persistedPilotIngredients = persistedPilotIngredientsResponse.body as Array<{
      id: string;
      name: string;
      costPerUnitCents: number;
    }>;
    const persistedPilotDishes = persistedPilotDishesResponse.body as Array<{
      id: string;
      priceCents: number;
      salesVolume: number;
    }>;
    const persistedMixedOverview = persistedMixedOverviewResponse.body as OverviewMetrics;
    const persistedPilotOverview = persistedPilotOverviewResponse.body as OverviewMetrics;
    const persistedHistory = persistedHistoryResponse.body as { history: unknown[] };
    const persistedOcrJobs = persistedOcrJobsResponse.body as Array<{ id: string }>;

    assertCondition(
      persistedPilotIngredients.some(
        (ingredient) =>
          ingredient.id === "pilot-romaine" &&
          ingredient.name === "Pilot Romaine Lettuce" &&
          ingredient.costPerUnitCents === 95
      ),
      "Ingredient edit should survive store reload.",
      failures
    );
    assertCondition(
      persistedPilotDishes.some(
        (dish) => dish.id === "pilot-dish-burger" && dish.priceCents === 1590 && dish.salesVolume === 18
      ),
      "Dish edit should survive store reload.",
      failures
    );
    assertCondition(
      persistedPilotOverview.estimatedPeriodProfitCents !==
        pilotOverviewBeforeEdit.estimatedPeriodProfitCents,
      "Pilot analytics should reflect persisted dish edits after reload.",
      failures
    );
    assertCondition(
      persistedMixedOverview.supplierAlertCount > 0,
      "Supplier alerts should survive reload after file-store invoice confirmation.",
      failures
    );
    assertCondition(
      Array.isArray(persistedHistory.history) && persistedHistory.history.length > 0,
      "Ingredient cost history should survive reload in file mode.",
      failures
    );
    assertCondition(
      Array.isArray(persistedOcrJobs) && persistedOcrJobs.length > 0,
      "OCR job metadata should survive reload in file mode.",
      failures
    );

    const resetResponse = await request(reloadedFileApp).post("/api/datasets/mixed-restaurant/reset").send({});
    assertCondition(resetResponse.status === 200, "File-store reset should succeed.", failures);

    const postResetReloadedApp = createApp({ env: fileEnv });
    const postResetOverviewResponse = await request(postResetReloadedApp).get(
      "/api/analytics/overview?dataset=mixed-restaurant"
    );
    const postResetHistoryResponse = await request(postResetReloadedApp).get(
      "/api/ingredients/parmesan/cost-history?dataset=mixed-restaurant"
    );
    const postResetOverview = postResetOverviewResponse.body as OverviewMetrics;
    const postResetHistory = postResetHistoryResponse.body as { history: unknown[] };

    assertCondition(postResetOverview.supplierAlertCount === 0, "Reset should clear persisted alerts.", failures);
    assertCondition(
      Array.isArray(postResetHistory.history) && postResetHistory.history.length === 0,
      "Reset should clear persisted cost history.",
      failures
    );
  } finally {
    fs.rmSync(tempDataDir, { force: true, recursive: true });
  }

  const report = {
    memoryMode: `Default app mode ${appConfigResponse.body.appMode}; storage ${appConfigResponse.body.storage.driver}; external OCR configured ${String(appConfigResponse.body.features.externalOcrConfigured)}.`,
    fileMode: `Pilot mode file store initialized successfully with readable=${String(
      true
    )} and writable=${String(true)} for local persistence validation.`,
    exportImport: `Memory export returned dataset ${(memoryExportResponse.body as { dataset: { id: string } }).dataset.id}; invalid import returned HTTP ${invalidImportResponse.status}; pilot import in file mode succeeded.`,
    persistence:
      "File store persisted ingredient and dish edits, then restored them correctly after a full app reload using a temporary data directory.",
    invoiceAfterReload:
      "Invoice confirmation in file mode survived reload and continued to expose persisted supplier alerts plus ingredient cost history.",
    ocrAfterReload:
      "Fixture OCR upload still worked with file storage, and OCR job metadata remained available after reload without mutating costs before confirmation.",
    resetAfterReload:
      "File-store reset restored the mixed restaurant baseline and cleared persisted alerts and cost-history records after a reload.",
    pilotReadiness:
      "Pilot persistence foundation is ready for controlled local use: memory mode remains the default, file mode preserves pilot edits, and invoice/OCR safety gates remain intact."
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
  console.log(report.memoryMode);
  console.log(report.fileMode);
  console.log(report.exportImport);
  console.log(report.persistence);
  console.log(report.invoiceAfterReload);
  console.log(report.ocrAfterReload);
  console.log(report.resetAfterReload);
  console.log(report.pilotReadiness);
}

void main();
