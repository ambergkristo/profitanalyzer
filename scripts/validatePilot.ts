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
- ${report.importValidation}
- ${report.persistence}
- ${report.invoiceAfterReload}
- ${report.ocrAfterReload}
- ${report.resetAfterReload}
- ${report.pilotReadiness}
`;
}

async function login(app: ReturnType<typeof createApp>, email: string, workspaceId?: string) {
  const response = await request(app).post("/api/auth/dev-login").send({ email, workspaceId });

  if (response.status !== 200) {
    throw new Error(`Pilot validation auth failed for ${email}.`);
  }

  return response.body.token as string;
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
  const pilotMemoryApp = createApp({
    env: {
      ...memoryEnv,
      APP_MODE: "pilot"
    }
  });

  const appConfigResponse = await request(memoryApp).get("/api/app/config");
  const deepHealthResponse = await request(memoryApp).get("/api/health/deep");
  const memoryExportResponse = await request(memoryApp).get("/api/export?dataset=mixed-restaurant");

  assertCondition(appConfigResponse.status === 200, "App config endpoint should load.", failures);
  assertCondition(deepHealthResponse.status === 200, "Deep health endpoint should load.", failures);
  assertCondition(appConfigResponse.body.appMode === "demo", "Default app mode should be demo.", failures);
  assertCondition(appConfigResponse.body.storage?.driver === "memory", "Default storage should be memory.", failures);
  assertCondition(memoryExportResponse.status === 200, "Dataset export should succeed in memory mode.", failures);
  assertCondition(memoryExportResponse.body.schemaVersion === 1, "Export should include schemaVersion.", failures);
  assertCondition(
    typeof memoryExportResponse.body.exportedFromAppVersion === "string" &&
      memoryExportResponse.body.exportedFromAppVersion.length > 0,
    "Export should include exportedFromAppVersion.",
    failures
  );
  assertCondition(
    JSON.stringify(memoryExportResponse.body).includes("OCR_PROVIDER_API_KEY") === false,
    "Export payloads must not include secrets.",
    failures
  );

  const pilotMemoryToken = await login(pilotMemoryApp, "owner@example.com", "workspace-pilot-workspace");
  const invalidImportResponse = await request(pilotMemoryApp)
      .post("/api/import?dataset=pilot-workspace")
      .set("Authorization", `Bearer ${pilotMemoryToken}`)
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
    const pilotFileToken = await login(fileApp, "owner@example.com", "workspace-pilot-workspace");
    const mixedFileToken = await login(fileApp, "mixed-owner@example.com", "workspace-mixed-restaurant");
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
    ).set("Authorization", `Bearer ${pilotFileToken}`);
    const pilotOverviewBeforeEdit = pilotOverviewBeforeEditResponse.body as OverviewMetrics;

    const pilotExportResponse = await request(pilotMemoryApp)
      .get("/api/export?dataset=pilot-workspace")
      .set("Authorization", `Bearer ${pilotMemoryToken}`);
    assertCondition(pilotExportResponse.status === 200, "Pilot export should succeed in memory mode.", failures);

    const exportedPayload = pilotExportResponse.body as {
      dataset: { id: string; name: string; description: string };
      recipes: Array<{ id: string; ingredients: Array<{ ingredientId: string }> }>;
      dishes: Array<{ id: string; recipeId: string }>;
    };

    const invalidReferencePayload = {
      ...exportedPayload,
      dataset: {
        ...exportedPayload.dataset,
        id: "pilot-workspace"
      },
      recipes: exportedPayload.recipes.map((recipe, index) =>
        index === 0
          ? {
              ...recipe,
              ingredients: recipe.ingredients.map((ingredient, ingredientIndex) =>
                ingredientIndex === 0
                  ? { ...ingredient, ingredientId: "ghost-ingredient" }
                  : ingredient
              )
            }
          : recipe
      ),
      dishes: exportedPayload.dishes.map((dish, index) =>
        index === 0 ? { ...dish, recipeId: "ghost-recipe" } : dish
      )
    };

    const invalidImportValidateResponse = await request(fileApp)
      .post("/api/import/validate?dataset=pilot-workspace")
      .set("Authorization", `Bearer ${pilotFileToken}`)
      .send(invalidReferencePayload);
    assertCondition(
      invalidImportValidateResponse.status === 400,
      "Import dry-run should reject bad recipe and dish references.",
      failures
    );
    assertCondition(
      Array.isArray(invalidImportValidateResponse.body.errors) &&
        invalidImportValidateResponse.body.errors.length > 0,
      "Import dry-run should report validation errors.",
      failures
    );

    const validImportPayload = {
      ...exportedPayload,
      dataset: {
        ...exportedPayload.dataset,
        id: "pilot-workspace",
        name: "Pilot Workspace",
        description: "Imported pilot workspace for persistence validation"
      },
      datasetId: "pilot-workspace"
    };

    const validImportValidateResponse = await request(fileApp)
      .post("/api/import/validate?dataset=pilot-workspace")
      .set("Authorization", `Bearer ${pilotFileToken}`)
      .send(validImportPayload);
    assertCondition(validImportValidateResponse.status === 200, "Valid import dry-run should pass.", failures);
    assertCondition(validImportValidateResponse.body.valid === true, "Valid import should be marked valid.", failures);

    const pilotImportResponse = await request(fileApp)
      .post("/api/import?dataset=pilot-workspace")
      .set("Authorization", `Bearer ${pilotFileToken}`)
      .send(validImportPayload);
    assertCondition(pilotImportResponse.status === 201, "Pilot workspace import should succeed in file mode.", failures);

    const recipeUpdateResponse = await request(fileApp)
      .patch("/api/recipes/pilot-recipe-burger?dataset=pilot-workspace")
      .set("Authorization", `Bearer ${pilotFileToken}`)
      .send({
        yield: 1,
        ingredients: [
          { ingredientId: "pilot-bun", quantity: 1, unit: "piece" },
          { ingredientId: "pilot-beef-patty", quantity: 220, unit: "g" },
          { ingredientId: "pilot-cheddar", quantity: 25, unit: "g" }
        ]
      });
    assertCondition(recipeUpdateResponse.status === 200, "Recipe update should succeed in file mode.", failures);

    const dishUpdateResponse = await request(fileApp)
      .patch("/api/dishes/pilot-dish-burger?dataset=pilot-workspace")
      .set("Authorization", `Bearer ${pilotFileToken}`)
      .send({
        recipeId: "pilot-recipe-burger",
        priceCents: 1590,
        salesVolume: 18
      });
    assertCondition(dishUpdateResponse.status === 200, "Dish update should succeed in file mode.", failures);

    const pilotOverviewAfterEditResponse = await request(fileApp).get(
      "/api/analytics/overview?dataset=pilot-workspace"
    ).set("Authorization", `Bearer ${pilotFileToken}`);
    const pilotOverviewAfterEdit = pilotOverviewAfterEditResponse.body as OverviewMetrics;
    assertCondition(
      pilotOverviewAfterEdit.estimatedPeriodProfitCents !==
        pilotOverviewBeforeEdit.estimatedPeriodProfitCents,
      "Pilot analytics should change after recipe and dish edits.",
      failures
    );

    const mixedInvoiceDraftResponse = await request(fileApp)
      .post("/api/invoices/parse-mock?dataset=mixed-restaurant")
      .set("Authorization", `Bearer ${mixedFileToken}`)
      .send({ sampleInvoiceId: "normal-supplier-invoice" });
    assertCondition(mixedInvoiceDraftResponse.status === 200, "File-store invoice parsing should work.", failures);
    if (mixedInvoiceDraftResponse.status === 200) {
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
        .set("Authorization", `Bearer ${mixedFileToken}`)
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
    }

    const ocrResponse = await request(fileApp)
      .post("/api/ocr/invoices/upload?dataset=mixed-restaurant")
      .set("Authorization", `Bearer ${mixedFileToken}`)
      .attach("file", Buffer.from("fixture"), {
        filename: "clean-invoice-photo.jpg",
        contentType: "image/jpeg"
      });
    assertCondition(ocrResponse.status === 200, "Fixture OCR should work in file mode.", failures);

    const reloadedFileApp = createApp({ env: fileEnv });
    const reloadedPilotToken = await login(reloadedFileApp, "owner@example.com", "workspace-pilot-workspace");
    const reloadedMixedToken = await login(reloadedFileApp, "mixed-owner@example.com", "workspace-mixed-restaurant");
    const persistedPilotRecipesResponse = await request(reloadedFileApp).get(
      "/api/recipes?dataset=pilot-workspace"
    ).set("Authorization", `Bearer ${reloadedPilotToken}`);
    const persistedPilotDishesResponse = await request(reloadedFileApp).get(
      "/api/dishes?dataset=pilot-workspace"
    ).set("Authorization", `Bearer ${reloadedPilotToken}`);
    const persistedPilotOverviewResponse = await request(reloadedFileApp).get(
      "/api/analytics/overview?dataset=pilot-workspace"
    ).set("Authorization", `Bearer ${reloadedPilotToken}`);
    const persistedMixedOverviewResponse = await request(reloadedFileApp).get(
      "/api/analytics/overview?dataset=mixed-restaurant"
    ).set("Authorization", `Bearer ${reloadedMixedToken}`);
    const persistedHistoryResponse = await request(reloadedFileApp).get(
      "/api/ingredients/parmesan/cost-history?dataset=mixed-restaurant"
    ).set("Authorization", `Bearer ${reloadedMixedToken}`);
    const persistedOcrJobsResponse = await request(reloadedFileApp).get(
      "/api/ocr/jobs?dataset=mixed-restaurant"
    ).set("Authorization", `Bearer ${reloadedMixedToken}`);

    const persistedPilotRecipes = persistedPilotRecipesResponse.body as Array<{
      id: string;
      ingredients: Array<{ ingredientId: string; quantity: number; unit: string }>;
    }>;
    const persistedPilotDishes = persistedPilotDishesResponse.body as Array<{
      id: string;
      recipeId: string;
      priceCents: number;
      salesVolume: number;
    }>;
    const persistedPilotOverview = persistedPilotOverviewResponse.body as OverviewMetrics;
    const persistedMixedOverview = persistedMixedOverviewResponse.body as OverviewMetrics;
    const persistedHistory = persistedHistoryResponse.body as { history: unknown[] };
    const persistedOcrJobs = persistedOcrJobsResponse.body as Array<{ id: string }>;

    assertCondition(
      persistedPilotRecipes.some(
        (recipe) =>
          recipe.id === "pilot-recipe-burger" &&
          recipe.ingredients.some(
            (ingredient) =>
              ingredient.ingredientId === "pilot-beef-patty" &&
              ingredient.quantity === 220 &&
              ingredient.unit === "g"
          )
      ),
      "Recipe edits should survive store reload.",
      failures
    );
    assertCondition(
      persistedPilotDishes.some(
        (dish) =>
          dish.id === "pilot-dish-burger" &&
          dish.recipeId === "pilot-recipe-burger" &&
          dish.priceCents === 1590 &&
          dish.salesVolume === 18
      ),
      "Dish recipe linkage and pricing edits should survive store reload.",
      failures
    );
    assertCondition(
      persistedPilotOverview.estimatedPeriodProfitCents ===
        pilotOverviewAfterEdit.estimatedPeriodProfitCents,
      "Pilot analytics should preserve persisted recipe edits after reload.",
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

    const pilotResetResponse = await request(reloadedFileApp)
      .post("/api/datasets/pilot-workspace/reset")
      .set("Authorization", `Bearer ${reloadedPilotToken}`)
      .send({});
    const mixedResetResponse = await request(reloadedFileApp)
      .post("/api/datasets/mixed-restaurant/reset")
      .set("Authorization", `Bearer ${reloadedMixedToken}`)
      .send({});
    assertCondition(pilotResetResponse.status === 200, "Pilot workspace reset should succeed.", failures);
    assertCondition(mixedResetResponse.status === 200, "Mixed dataset reset should succeed.", failures);

    const postResetReloadedApp = createApp({ env: fileEnv });
    const postResetPilotToken = await login(postResetReloadedApp, "owner@example.com", "workspace-pilot-workspace");
    const postResetMixedToken = await login(postResetReloadedApp, "mixed-owner@example.com", "workspace-mixed-restaurant");
    const postResetRecipeResponse = await request(postResetReloadedApp).get(
      "/api/recipes?dataset=pilot-workspace"
    ).set("Authorization", `Bearer ${postResetPilotToken}`);
    const postResetOverviewResponse = await request(postResetReloadedApp).get(
      "/api/analytics/overview?dataset=mixed-restaurant"
    ).set("Authorization", `Bearer ${postResetMixedToken}`);
    const postResetHistoryResponse = await request(postResetReloadedApp).get(
      "/api/ingredients/parmesan/cost-history?dataset=mixed-restaurant"
    ).set("Authorization", `Bearer ${postResetMixedToken}`);
    const postResetRecipeBody = postResetRecipeResponse.body as Array<{
      id: string;
      ingredients: Array<{ ingredientId: string; quantity: number }>;
    }>;
    const postResetOverview = postResetOverviewResponse.body as OverviewMetrics;
    const postResetHistory = postResetHistoryResponse.body as { history: unknown[] };

    assertCondition(
      postResetRecipeBody.some(
        (recipe) =>
          recipe.id === "pilot-recipe-burger" &&
          recipe.ingredients.some(
            (ingredient) =>
              ingredient.ingredientId === "pilot-beef-patty" && ingredient.quantity === 180
          )
      ),
      "Reset should restore baseline recipe quantities for the pilot workspace.",
      failures
    );
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
    memoryMode: `Default app mode ${appConfigResponse.body.appMode}; storage ${appConfigResponse.body.storage.driver}; export schemaVersion ${String(memoryExportResponse.body.schemaVersion)}.`,
    fileMode:
      "Pilot mode file store initialized successfully with readable=true and writable=true for local persistence validation.",
    importValidation:
      "Import dry-run rejected bad ingredient and recipe references, then allowed a valid pilot workspace import before any write occurred.",
    persistence:
      "File store persisted recipe edits and dish recipe linkage, then restored both correctly after a full app reload using a temporary data directory.",
    invoiceAfterReload:
      "Invoice confirmation in file mode survived reload and continued to expose persisted supplier alerts plus ingredient cost history.",
    ocrAfterReload:
      "Fixture OCR upload still worked with file storage, and OCR job metadata remained available after reload without mutating costs before confirmation.",
    resetAfterReload:
      "File-store reset restored the pilot recipe baseline and, after resetting the mixed dataset explicitly, cleared persisted mixed-restaurant alerts and cost-history records after a reload.",
    pilotReadiness:
      "Controlled pilot setup is coherent for local use: recipe editing, dish-to-recipe linkage, safer import validation, and file-backed persistence are working together without weakening invoice or OCR safety gates."
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
  console.log(report.importValidation);
  console.log(report.persistence);
  console.log(report.invoiceAfterReload);
  console.log(report.ocrAfterReload);
  console.log(report.resetAfterReload);
  console.log(report.pilotReadiness);
}

void main();
