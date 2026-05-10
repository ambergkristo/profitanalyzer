import fs from "node:fs";
import path from "node:path";

import { PrismaClient } from "@prisma/client";
import request from "supertest";

import { createApp } from "../apps/api/src/app.js";
import { getAppMode, getAppVersion } from "../apps/api/src/config.js";
import { createDatabaseStore } from "../apps/api/src/store/databaseStore.js";
import type { AppStore, DatasetExportPayload } from "../apps/api/src/store/types.js";
import type {
  OcrDraftResponse,
  ParsedInvoiceDraft,
  ReviewedInvoiceLineInput
} from "../packages/core/src/index.js";

type CheckStatus = "pass" | "partial" | "fail" | "skipped";

interface DbValidationReport {
  databaseConfigured: boolean;
  liveRunExecuted: boolean;
  connectionStatus: CheckStatus;
  migrationStatus: CheckStatus;
  seedStatus: CheckStatus;
  storeParityStatus: CheckStatus;
  isolationStatus: CheckStatus;
  invoiceFlowStatus: CheckStatus;
  ocrJobStatus: CheckStatus;
  billingStatus: CheckStatus;
  auditStatus: CheckStatus;
  apiRuntimeStatus: CheckStatus;
  skippedReason?: string;
  summary: {
    datasets: number;
    defaultWorkspaceExists: boolean;
    defaultRestaurantExists: boolean;
    defaultUserExists: boolean;
    defaultMembershipExists: boolean;
    topActions: number;
    costHistoryCreated: number;
    alertsCreated: number;
    auditEventsObserved: number;
  };
  blockers: string[];
}

function ensureReportsDirectory() {
  const reportsDir = path.resolve("reports");
  fs.mkdirSync(reportsDir, { recursive: true });
  return reportsDir;
}

function writeReport(report: DbValidationReport) {
  const reportsDir = ensureReportsDirectory();
  fs.writeFileSync(
    path.join(reportsDir, "db-validation-report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8"
  );

  fs.writeFileSync(
    path.join(reportsDir, "db-validation-report.md"),
    `# Database Validation Report

## Summary

- databaseConfigured: ${report.databaseConfigured}
- liveRunExecuted: ${report.liveRunExecuted}
- connectionStatus: ${report.connectionStatus}
- migrationStatus: ${report.migrationStatus}
- seedStatus: ${report.seedStatus}
- storeParityStatus: ${report.storeParityStatus}
- isolationStatus: ${report.isolationStatus}
- invoiceFlowStatus: ${report.invoiceFlowStatus}
- ocrJobStatus: ${report.ocrJobStatus}
- billingStatus: ${report.billingStatus}
- auditStatus: ${report.auditStatus}
- apiRuntimeStatus: ${report.apiRuntimeStatus}
- skippedReason: ${report.skippedReason ?? "none"}

## Runtime Counts

- datasets: ${report.summary.datasets}
- defaultWorkspaceExists: ${report.summary.defaultWorkspaceExists}
- defaultRestaurantExists: ${report.summary.defaultRestaurantExists}
- defaultUserExists: ${report.summary.defaultUserExists}
- defaultMembershipExists: ${report.summary.defaultMembershipExists}
- topActions: ${report.summary.topActions}
- costHistoryCreated: ${report.summary.costHistoryCreated}
- alertsCreated: ${report.summary.alertsCreated}
- auditEventsObserved: ${report.summary.auditEventsObserved}

## Blockers

${report.blockers.length === 0 ? "- none" : report.blockers.map((blocker) => `- ${blocker}`).join("\n")}
`,
    "utf8"
  );
}

function emptySummary(): DbValidationReport["summary"] {
  return {
    datasets: 0,
    defaultWorkspaceExists: false,
    defaultRestaurantExists: false,
    defaultUserExists: false,
    defaultMembershipExists: false,
    topActions: 0,
    costHistoryCreated: 0,
    alertsCreated: 0,
    auditEventsObserved: 0
  };
}

function writeSkippedReport(reason: string) {
  const report: DbValidationReport = {
    databaseConfigured: false,
    liveRunExecuted: false,
    connectionStatus: "skipped",
    migrationStatus: fs.existsSync(path.resolve("apps/api/prisma/migrations")) ? "pass" : "fail",
    seedStatus: fs.existsSync(path.resolve("apps/api/prisma/seed.ts")) ? "pass" : "fail",
    storeParityStatus: "skipped",
    isolationStatus: "skipped",
    invoiceFlowStatus: "skipped",
    ocrJobStatus: "skipped",
    billingStatus: "skipped",
    auditStatus: "skipped",
    apiRuntimeStatus: "skipped",
    skippedReason: reason,
    summary: emptySummary(),
    blockers: []
  };

  writeReport(report);
}

function requireValue<T>(value: T | null | undefined, message: string): T {
  if (value === null || value === undefined) {
    throw new Error(message);
  }

  return value;
}

function buildReviewedLines(draft: ParsedInvoiceDraft | OcrDraftResponse): ReviewedInvoiceLineInput[] {
  return draft.lines.map((line) => ({
    lineId: line.id,
    reviewStatus: line.reviewStatus === "ignored" ? "ignored" : "confirmed",
    matchedIngredientId: line.matchedIngredientId,
    parsedQuantity: line.parsedQuantity,
    parsedUnit: line.parsedUnit,
    parsedUnitPriceCents: line.parsedUnitPriceCents ?? 1,
    parsedLineTotalCents: line.parsedLineTotalCents
  }));
}

async function reloadStore(databaseUrl: string): Promise<AppStore> {
  const store = createDatabaseStore({
    appMode: getAppMode(process.env),
    connectionString: databaseUrl,
    exportedFromAppVersion: getAppVersion(process.env)
  });
  await store.initialize();
  return store;
}

function buildIsolationDataset(): DatasetExportPayload {
  return {
    schemaVersion: 1,
    datasetId: "db-isolation-restaurant-b",
    exportedFromAppVersion: "0.1.0",
    dataset: {
      id: "db-isolation-restaurant-b",
      name: "DB Isolation Restaurant B",
      description: "Minimal database validation workspace used to prove scoped reads and resets.",
      profile: "mixed",
      ownerDiagnosis: "Database isolation validation workspace.",
      expectedBehavior: "Data must remain scoped to workspace B.",
      demoNarrative: "Not shown as customer data.",
      validationStatus: "pass",
      data: {
        ingredients: [
          {
            id: "db-b-flour",
            name: "DB B Flour",
            costPerUnitCents: 200,
            unit: "g"
          },
          {
            id: "db-b-cheese",
            name: "DB B Cheese",
            costPerUnitCents: 450,
            unit: "g"
          }
        ],
        recipes: [
          {
            id: "db-b-recipe",
            name: "DB B Recipe",
            yield: 1,
            ingredients: [
              {
                ingredientId: "db-b-flour",
                quantity: 100,
                unit: "g"
              },
              {
                ingredientId: "db-b-cheese",
                quantity: 40,
                unit: "g"
              }
            ]
          }
        ],
        dishes: [
          {
            id: "db-b-dish",
            name: "DB B Dish",
            recipeId: "db-b-recipe",
            priceCents: 1200,
            salesVolume: 10
          }
        ]
      }
    },
    ingredients: [
      {
        id: "db-b-flour",
        name: "DB B Flour",
        costPerUnitCents: 200,
        unit: "g"
      },
      {
        id: "db-b-cheese",
        name: "DB B Cheese",
        costPerUnitCents: 450,
        unit: "g"
      }
    ],
    recipes: [
      {
        id: "db-b-recipe",
        name: "DB B Recipe",
        yield: 1,
        ingredients: [
          {
            ingredientId: "db-b-flour",
            quantity: 100,
            unit: "g"
          },
          {
            ingredientId: "db-b-cheese",
            quantity: 40,
            unit: "g"
          }
        ]
      }
    ],
    dishes: [
      {
        id: "db-b-dish",
        name: "DB B Dish",
        recipeId: "db-b-recipe",
        priceCents: 1200,
        salesVolume: 10
      }
    ],
    suppliers: [],
    supplierProductMatches: [],
    costHistory: [],
    alerts: [],
    invoices: [],
    ocrJobs: []
  };
}

async function runApiSmoke(databaseUrl: string) {
  const env = {
    ...process.env,
    APP_MODE: "pilot",
    AUTH_MODE: "dev",
    STORE_DRIVER: "database",
    DATABASE_URL: databaseUrl,
    SESSION_SECRET: "local-db-validation-session-secret",
    UPLOAD_STORAGE_DRIVER: "memory",
    OCR_PROVIDER: "fixture"
  };
  const app = createApp({ env });
  const loginResponse = await request(app)
    .post("/api/auth/dev-login")
    .send({
      email: "db-validation-owner@example.com",
      workspaceId: "workspace-mixed-restaurant",
      role: "owner"
    });

  if (loginResponse.status !== 200 || typeof loginResponse.body.token !== "string") {
    throw new Error("Database API smoke failed: dev-login did not return a session token.");
  }

  const token = loginResponse.body.token as string;
  const authHeader = `Bearer ${token}`;
  const configResponse = await request(app).get("/api/app/config");
  const readinessResponse = await request(app).get("/api/health/readiness");
  const overviewResponse = await request(app)
    .get("/api/analytics/overview?dataset=mixed-restaurant")
    .set("Authorization", authHeader);
  const uploadResponse = await request(app)
    .post("/api/ocr/invoices/upload?dataset=mixed-restaurant&provider=fixture")
    .set("Authorization", authHeader)
    .attach("file", Buffer.from("synthetic db validation invoice"), {
      filename: "db-validation-invoice.jpg",
      contentType: "image/jpeg"
    });

  if (configResponse.status !== 200) {
    throw new Error("Database API smoke failed: app config did not respond.");
  }

  if (readinessResponse.status !== 200 || readinessResponse.body.storage?.driver !== "database") {
    throw new Error("Database API smoke failed: readiness did not report database storage.");
  }

  if (overviewResponse.status !== 200 || !Array.isArray(overviewResponse.body.topActions)) {
    throw new Error("Database API smoke failed: analytics overview did not respond from database store.");
  }

  if (uploadResponse.status !== 200 || !uploadResponse.body.ocrJob?.id) {
    throw new Error("Database API smoke failed: fixture OCR upload did not create job metadata.");
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    writeSkippedReport("DATABASE_URL is not configured.");
    console.log("SKIPPED_DATABASE_VALIDATION");
    console.log("DATABASE_URL is not configured.");
    process.exitCode = 0;
    return;
  }

  const blockers: string[] = [];
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl
      }
    }
  });
  let auditEventsObserved = 0;
  let costHistoryCreated = 0;
  let alertsCreated = 0;

  try {
    await prisma.$connect();
    const migrationCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint as count FROM "_prisma_migrations"
    `;
    const migrationStatus: CheckStatus = Number(migrationCount[0]?.count ?? 0) > 0 ? "pass" : "fail";
    if (migrationStatus === "fail") {
      blockers.push("No applied Prisma migrations were found.");
    }

    let store = await reloadStore(databaseUrl);
    const storage = store.getStorageInfo();
    if (!storage.databaseConfigured || !storage.readable || !storage.writable) {
      throw new Error("Database store did not report healthy readable/writable connectivity.");
    }

    for (const datasetId of ["mixed-restaurant"]) {
      store.resetDataset(datasetId);
      await store.flushDatasetAsync(datasetId);
    }
    store.importDataset(buildIsolationDataset(), "db-isolation-restaurant-b");
    await store.flushDatasetAsync("db-isolation-restaurant-b");

    store = await reloadStore(databaseUrl);
    const datasets = store.listDatasets();
    const mixedContext = requireValue(
      store.getStoreContext("mixed-restaurant"),
      "Database store did not resolve mixed-restaurant context."
    );
    const isolationContext = requireValue(
      store.getStoreContext("db-isolation-restaurant-b"),
      "Database store did not resolve isolation restaurant context."
    );

    if (mixedContext.workspaceId === isolationContext.workspaceId) {
      blockers.push("Distinct restaurants are sharing a workspace context.");
    }

    const overview = requireValue(
      store.getOverview("mixed-restaurant"),
      "Database store could not calculate overview analytics."
    );
    const firstDish = requireValue(
      store.getDishes("mixed-restaurant")?.[0],
      "Database store did not return dishes."
    );
    requireValue(
      store.getDishDetail(firstDish.id, "mixed-restaurant"),
      "Database store could not calculate dish detail."
    );

    const firstIngredient = requireValue(
      store.getIngredients("mixed-restaurant")?.[0],
      "Database store did not return ingredients."
    );
    const updatedIngredient = requireValue(
      store.updateIngredient(
        firstIngredient.id,
        {
          name: firstIngredient.name,
          costPerUnitCents: firstIngredient.costPerUnitCents + 1,
          unit: firstIngredient.unit
        },
        "mixed-restaurant"
      ),
      "Database ingredient update failed."
    );
    await store.flushDatasetAsync("mixed-restaurant");
    store = await reloadStore(databaseUrl);
    if (
      store.getIngredients("mixed-restaurant")?.find((ingredient) => ingredient.id === updatedIngredient.id)
        ?.costPerUnitCents !== updatedIngredient.costPerUnitCents
    ) {
      blockers.push("Ingredient update did not persist after database store reload.");
    }

    const firstRecipe = requireValue(
      store.getRecipes("mixed-restaurant")?.[0],
      "Database store did not return recipes."
    );
    const updatedRecipe = requireValue(
      store.updateRecipe(
        firstRecipe.id,
        {
          name: firstRecipe.name,
          yield: firstRecipe.yield + 0.1,
          ingredients: firstRecipe.ingredients
        },
        "mixed-restaurant"
      ),
      "Database recipe update failed."
    );
    await store.flushDatasetAsync("mixed-restaurant");
    store = await reloadStore(databaseUrl);
    if (
      store.getRecipes("mixed-restaurant")?.find((recipe) => recipe.id === updatedRecipe.id)?.yield !==
      updatedRecipe.yield
    ) {
      blockers.push("Recipe update did not persist after database store reload.");
    }

    const updatedDish = requireValue(
      store.updateDish(
        firstDish.id,
        {
          name: firstDish.name,
          recipeId: firstDish.recipeId,
          priceCents: firstDish.priceCents + 1,
          salesVolume: firstDish.salesVolume
        },
        "mixed-restaurant"
      ),
      "Database dish update failed."
    );
    await store.flushDatasetAsync("mixed-restaurant");
    store = await reloadStore(databaseUrl);
    if (
      store.getDishes("mixed-restaurant")?.find((dish) => dish.id === updatedDish.id)?.priceCents !==
      updatedDish.priceCents
    ) {
      blockers.push("Dish update did not persist after database store reload.");
    }

    const sample = requireValue(
      store.getMockInvoiceSampleSummaries()[0],
      "No mock invoice samples are available for database invoice validation."
    );
    const draft = requireValue(
      store.parseMockInvoice(sample.id, "mixed-restaurant"),
      "Database invoice draft creation failed."
    );
    const confirmation = requireValue(
      store.confirmInvoice(draft.invoiceDraft.id, "mixed-restaurant", {
        supplierId: draft.invoiceDraft.supplierId,
        invoiceDate: draft.invoiceDraft.invoiceDate,
        invoiceNumber: draft.invoiceDraft.invoiceNumber,
        lines: buildReviewedLines(draft)
      }),
      "Database invoice review-confirm failed."
    );
    costHistoryCreated = confirmation.costHistory.length;
    alertsCreated = confirmation.alerts.length;
    if (costHistoryCreated === 0 || alertsCreated === 0) {
      blockers.push("Invoice review-confirm did not create cost history and alerts.");
    }
    await store.flushDatasetAsync("mixed-restaurant");

    const highMarginOnlyIngredientName = "DB Isolation B Only";
    store.createIngredient(
      {
        id: "db-isolation-b-only",
        name: highMarginOnlyIngredientName,
        costPerUnitCents: 123,
        unit: "g"
      },
      "db-isolation-restaurant-b"
    );
    await store.flushDatasetAsync("db-isolation-restaurant-b");
    store.resetDataset("mixed-restaurant");
    await store.flushDatasetAsync("mixed-restaurant");
    store = await reloadStore(databaseUrl);
    const mixedExport = requireValue(
      store.exportDataset("mixed-restaurant"),
      "Database export did not return mixed-restaurant."
    );
    const isolationIngredients = store.getIngredients("db-isolation-restaurant-b") ?? [];
    if (JSON.stringify(mixedExport).includes(highMarginOnlyIngredientName)) {
      blockers.push("Scoped mixed-restaurant export leaked isolation restaurant data.");
    }
    if (!isolationIngredients.some((ingredient) => ingredient.id === "db-isolation-b-only")) {
      blockers.push("Scoped reset of mixed-restaurant unexpectedly wiped isolation restaurant data.");
    }

    const billingStatus = requireValue(
      store.getBillingStatus("mixed-restaurant"),
      "Database billing status failed."
    );
    if (!billingStatus.effectiveAccess.hasAccess) {
      blockers.push("Database billing effective access did not resolve.");
    }

    await runApiSmoke(databaseUrl);
    store = await reloadStore(databaseUrl);
    const ocrJobs = store.listOcrJobs("mixed-restaurant") ?? [];
    if (!ocrJobs.some((job) => job.originalFileName === "db-validation-invoice.jpg")) {
      blockers.push("Database OCR job metadata did not persist after API upload.");
    }

    auditEventsObserved = await prisma.auditLog.count();

    for (const datasetId of ["mixed-restaurant", "db-isolation-restaurant-b"]) {
      store.resetDataset(datasetId);
      await store.flushDatasetAsync(datasetId);
    }

    const defaultWorkspaceExists = (await prisma.workspace.count({ where: { id: "workspace-mixed-restaurant" } })) > 0;
    const defaultRestaurantExists = (await prisma.restaurant.count({ where: { id: "mixed-restaurant" } })) > 0;
    const defaultUserExists = (await prisma.user.count({ where: { id: "default-owner-user" } })) > 0;
    const defaultMembershipExists =
      (await prisma.workspaceMembership.count({
        where: {
          workspaceId: "workspace-mixed-restaurant",
          userId: "default-owner-user"
        }
      })) > 0;

    const report: DbValidationReport = {
      databaseConfigured: true,
      liveRunExecuted: true,
      connectionStatus: "pass",
      migrationStatus,
      seedStatus:
        defaultWorkspaceExists && defaultRestaurantExists && defaultUserExists && defaultMembershipExists
          ? "pass"
          : "fail",
      storeParityStatus: blockers.some((blocker) =>
        /analytics|detail|ingredient|recipe|dish|billing/iu.test(blocker)
      )
        ? "fail"
        : "pass",
      isolationStatus: blockers.some((blocker) => /workspace|leaked|wiped/iu.test(blocker)) ? "fail" : "pass",
      invoiceFlowStatus: costHistoryCreated > 0 && alertsCreated > 0 ? "pass" : "fail",
      ocrJobStatus: blockers.some((blocker) => /OCR job/iu.test(blocker)) ? "fail" : "pass",
      billingStatus: blockers.some((blocker) => /billing/iu.test(blocker)) ? "fail" : "pass",
      auditStatus: auditEventsObserved > 0 ? "partial" : "fail",
      apiRuntimeStatus: blockers.some((blocker) => /API smoke/iu.test(blocker)) ? "fail" : "pass",
      summary: {
        datasets: datasets.length,
        defaultWorkspaceExists,
        defaultRestaurantExists,
        defaultUserExists,
        defaultMembershipExists,
        topActions: overview.topActions.length,
        costHistoryCreated,
        alertsCreated,
        auditEventsObserved
      },
      blockers
    };

    if (report.seedStatus === "fail") {
      report.blockers.push("Seed verification did not find default workspace, restaurant, user, and membership.");
    }

    writeReport(report);

    if (report.blockers.length > 0) {
      console.log("FAIL db validation");
      for (const blocker of report.blockers) {
        console.log(` - ${blocker}`);
      }
      process.exitCode = 1;
      return;
    }

    console.log("PASS db validation");
    console.log("liveRunExecuted=true");
    console.log(`datasets=${datasets.length}`);
    console.log(`storageDriver=${storage.driver}`);
    console.log(`workspace=${mixedContext.workspaceId}`);
    console.log(`restaurant=${mixedContext.restaurantId}`);
    console.log(`topActions=${overview.topActions.length}`);
    console.log(`costHistoryCreated=${costHistoryCreated}`);
    console.log(`alertsCreated=${alertsCreated}`);
    console.log(`auditStatus=${report.auditStatus}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const report: DbValidationReport = {
      databaseConfigured: true,
      liveRunExecuted: true,
      connectionStatus: "fail",
      migrationStatus: "fail",
      seedStatus: "fail",
      storeParityStatus: "fail",
      isolationStatus: "fail",
      invoiceFlowStatus: "fail",
      ocrJobStatus: "fail",
      billingStatus: "fail",
      auditStatus: "fail",
      apiRuntimeStatus: "fail",
      summary: emptySummary(),
      blockers: [message]
    };
    writeReport(report);
    console.log("FAIL db validation");
    console.log(message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
