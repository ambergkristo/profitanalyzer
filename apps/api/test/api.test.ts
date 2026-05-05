import fs from "node:fs";
import path from "node:path";

import request from "supertest";
import { describe, expect, it } from "vitest";

import type {
  CalculatedDish,
  BillingStatus,
  DemoDatasetSummary,
  DishAction,
  DishDetailAnalytics,
  MockInvoiceSampleSummary,
  OverviewMetrics,
  PriceChangeAlert,
  PriceSimulationResult,
  StoredInvoiceView
} from "../../../packages/core/src/index.js";
import { createApp } from "../src/app.js";
import { createOcrProviderRegistry } from "../src/ocr/providerRegistry.js";
import type { ImportValidationReport } from "../src/store/types.js";

const buildApp = (options?: Parameters<typeof createApp>[0]) => createApp(options);

async function login(
  app: ReturnType<typeof createApp>,
  email: string,
  workspaceId?: string,
  role?: "owner" | "admin" | "member"
) {
  const response = await request(app).post("/api/auth/dev-login").send({
    email,
    workspaceId,
    role
  });
  const body = response.body as { token: string };

  expect(response.status).toBe(200);
  return body.token;
}

describe("api", () => {
  it("returns health response", async () => {
    const response = await request(buildApp()).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, service: "profit-analyzer-api" });
  });

  it("returns demo datasets", async () => {
    const response = await request(buildApp()).get("/api/demo/datasets");
    const body = response.body as DemoDatasetSummary[];

    expect(response.status).toBe(200);
    expect(body.map((dataset) => dataset.id)).toEqual([
      "mixed-restaurant",
      "low-margin-kitchen",
      "high-margin-bistro"
    ]);
    expect(body[0]).toHaveProperty("ownerDiagnosis");
    expect(body[0]).toHaveProperty("demoNarrative");
  });

  it("creates a dev auth session and returns workspace membership context", async () => {
    const app = buildApp({
      env: {
        ...process.env,
        APP_MODE: "pilot",
        AUTH_MODE: "dev"
      }
    });

    const loginResponse = await request(app).post("/api/auth/dev-login").send({
      email: "owner@example.com",
      workspaceId: "workspace-pilot-workspace"
    });
    const loginBody = loginResponse.body as {
      token: string;
      me: {
        activeWorkspaceId: string;
        activeRestaurantId: string;
        workspaces: Array<{ workspaceId: string }>;
      };
    };

    expect(loginResponse.status).toBe(200);
    expect(loginBody.token).toBeTruthy();
    expect(loginBody.me.activeWorkspaceId).toBe("workspace-pilot-workspace");
    expect(loginBody.me.activeRestaurantId).toBe("pilot-workspace");

    const meResponse = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${loginBody.token}`);
    const meBody = meResponse.body as {
      activeRestaurantId: string;
      workspaces: Array<{ workspaceId: string }>;
    };

    expect(meResponse.status).toBe(200);
    expect(meBody.activeRestaurantId).toBe("pilot-workspace");
    expect(meBody.workspaces[0]?.workspaceId).toBe("workspace-pilot-workspace");
  });

  it("requires auth in pilot mode but keeps demo mode open", async () => {
    const pilotApp = buildApp({
      env: {
        ...process.env,
        APP_MODE: "pilot",
        AUTH_MODE: "dev"
      }
    });
    const pilotResponse = await request(pilotApp).get("/api/analytics/overview?dataset=pilot-workspace");
    expect(pilotResponse.status).toBe(401);

    const demoResponse = await request(buildApp()).get("/api/analytics/overview?dataset=mixed-restaurant");
    expect(demoResponse.status).toBe(200);
  });

  it("returns consistent safe error payloads with request ids", async () => {
    const app = buildApp({
      env: {
        ...process.env,
        APP_MODE: "pilot",
        AUTH_MODE: "dev"
      }
    });

    const response = await request(app).get("/api/analytics/overview?dataset=pilot-workspace");
    const body = response.body as {
      message: string;
      error: {
        code: string;
        message: string;
        requestId: string;
      };
    };

    expect(response.status).toBe(401);
    expect(body.message).toBe("Authentication is required.");
    expect(body.error.code).toBe("unauthenticated");
    expect(body.error.message).toBe("Authentication is required.");
    expect(body.error.requestId).toBeTruthy();
    expect(response.headers["x-request-id"]).toBeTruthy();
  });

  it("enforces role-based protection and workspace scoping in pilot mode", async () => {
    const app = buildApp({
      env: {
        ...process.env,
        APP_MODE: "pilot",
        AUTH_MODE: "dev"
      }
    });

    const memberToken = await login(app, "member@example.com", "workspace-mixed-restaurant", "member");
    const adminToken = await login(app, "admin@example.com", "workspace-mixed-restaurant", "admin");

    const forbiddenOverview = await request(app)
      .get("/api/analytics/overview?dataset=high-margin-bistro")
      .set("Authorization", `Bearer ${memberToken}`);
    expect(forbiddenOverview.status).toBe(403);

    const memberReset = await request(app)
      .post("/api/datasets/mixed-restaurant/reset")
      .set("Authorization", `Bearer ${memberToken}`)
      .send({});
    expect(memberReset.status).toBe(403);

    const adminIngredient = await request(app)
      .post("/api/ingredients?dataset=mixed-restaurant")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Admin Auth Ingredient",
        costPerUnitCents: 5,
        unit: "g"
      });
    expect(adminIngredient.status).toBe(201);
  });

  it("returns billing plans, status, and controlled manual licenses", async () => {
    const app = buildApp();

    const plansResponse = await request(app).get("/api/billing/plans");
    expect(plansResponse.status).toBe(200);
    expect((plansResponse.body as Array<{ code: string }>).map((plan) => plan.code)).toContain("founding_partner");

    const statusResponse = await request(app).get("/api/billing/status?dataset=mixed-restaurant");
    const statusBody = statusResponse.body as BillingStatus;
    expect(statusResponse.status).toBe(200);
    expect(statusBody.effectiveAccess.hasAccess).toBe(true);

    const licenseResponse = await request(app)
      .post("/api/billing/manual-license?dataset=mixed-restaurant")
      .send({ type: "founding_partner_lifetime", notes: "API test grant." });
    const licenseBody = licenseResponse.body as BillingStatus;
    expect(licenseResponse.status).toBe(201);
    expect(licenseBody.subscription.status).toBe("lifetime");
    expect(
      licenseBody.entitlements.some((entitlement) => entitlement.type === "founding_partner_lifetime")
    ).toBe(true);
    expect(JSON.stringify(licenseBody)).not.toContain("BILLING_PROVIDER_SECRET_KEY");
  });

  it("protects manual license grants by role in pilot mode", async () => {
    const app = buildApp({
      env: {
        ...process.env,
        APP_MODE: "pilot",
        AUTH_MODE: "dev"
      }
    });

    const memberToken = await login(app, "billing-member@example.com", "workspace-pilot-workspace", "member");
    const ownerToken = await login(app, "billing-owner@example.com", "workspace-pilot-workspace", "owner");

    const memberResponse = await request(app)
      .post("/api/billing/manual-license?dataset=pilot-workspace")
      .set("Authorization", `Bearer ${memberToken}`)
      .send({ type: "manual_comp" });
    expect(memberResponse.status).toBe(403);

    const ownerResponse = await request(app)
      .post("/api/billing/manual-license?dataset=pilot-workspace")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ type: "manual_comp", notes: "Owner grant." });
    expect(ownerResponse.status).toBe(201);
  });

  it("returns app config with demo defaults and memory persistence", async () => {
    const response = await request(buildApp()).get("/api/app/config");
    const body = response.body as {
      appMode: string;
      nodeEnv: string;
      version: string;
      storage: {
        driver: string;
        persistenceWarning: string | null;
      };
      runtime: {
        logLevel: string;
      };
      features: {
        externalOcrConfigured: boolean;
      };
    };

    expect(response.status).toBe(200);
    expect(body.appMode).toBe("demo");
    expect(body.nodeEnv).toBeTruthy();
    expect(body.version).toBeTruthy();
    expect(body.storage.driver).toBe("memory");
    expect(body.storage.persistenceWarning).toContain("memory storage");
    expect(body.runtime.logLevel).toBeTruthy();
    expect(body.features.externalOcrConfigured).toBe(false);
  });

  it("reports database storage as unconfigured without silently falling back", async () => {
    const response = await request(
      buildApp({
        env: {
          ...process.env,
          STORE_DRIVER: "database",
          DATABASE_URL: ""
        }
      })
    ).get("/api/app/config");
    const body = response.body as {
      storage: {
        driver: string;
        databaseConfigured?: boolean;
      };
      productionReadinessClaimed: boolean;
    };

    expect(response.status).toBe(200);
    expect(body.storage.driver).toBe("database");
    expect(body.storage.databaseConfigured).toBe(false);
    expect(body.productionReadinessClaimed).toBe(false);
  });

  it("blocks data endpoints when database storage is selected without DATABASE_URL", async () => {
    const response = await request(
      buildApp({
        env: {
          ...process.env,
          STORE_DRIVER: "database",
          DATABASE_URL: ""
        }
      })
    ).get("/api/analytics/overview?dataset=mixed-restaurant");
    const body = response.body as { message: string };

    expect(response.status).toBe(503);
    expect(body.message).toContain("DATABASE_URL");
  });

  it("returns deep health details without exposing secrets", async () => {
    const response = await request(buildApp()).get("/api/health/deep");
    const body = response.body as {
      ok: boolean;
      nodeEnv: string;
      storage: {
        driver: string;
      };
      checks: Array<{ key: string; message: string }>;
    };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.nodeEnv).toBeTruthy();
    expect(body.storage.driver).toBe("memory");
    expect(body.checks.length).toBeGreaterThan(0);
    expect(JSON.stringify(body)).not.toContain("OCR_PROVIDER_API_KEY");
  });

  it("returns a safe readiness payload with productionReady=false", async () => {
    const response = await request(buildApp()).get("/api/health/readiness");
    const body = response.body as {
      ok: boolean;
      appMode: string;
      nodeEnv: string;
      productionReady: boolean;
      storage: {
        driver: string;
        databaseConfigured: boolean;
        databaseReachable: boolean | null;
      };
      auth: {
        mode: string;
        sessionSecretConfigured: boolean;
      };
      checks: Array<{ name: string; status: string; message: string }>;
    };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.appMode).toBe("demo");
    expect(body.nodeEnv).toBeTruthy();
    expect(body.productionReady).toBe(false);
    expect(body.storage.driver).toBe("memory");
    expect(Array.isArray(body.checks)).toBe(true);
    expect(JSON.stringify(body)).not.toContain("postgresql://");
    expect(JSON.stringify(body)).not.toContain("postgres://");
  });

  it("returns a blocking readiness response for unsafe production configuration", async () => {
    const response = await request(
      buildApp({
        env: {
          ...process.env,
          NODE_ENV: "production",
          APP_MODE: "production",
          AUTH_MODE: "dev",
          STORE_DRIVER: "memory",
          APP_BASE_URL: "",
          API_BASE_URL: "",
          CORS_ORIGIN: ""
        }
      })
    ).get("/api/health/readiness");
    const body = response.body as {
      ok: boolean;
      checks: Array<{ status: string }>;
    };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(false);
    expect(body.checks.some((check) => check.status === "fail")).toBe(true);
  });

  it("returns upgraded analytics overview for the selected dataset", async () => {
    const response = await request(buildApp()).get("/api/analytics/overview?dataset=mixed-restaurant");
    const body = response.body as OverviewMetrics;

    expect(response.status).toBe(200);
    expect(body.totalDishes).toBe(8);
    expect(body).toHaveProperty("weightedAverageMarginPercent");
    expect(body).toHaveProperty("totalRevenueCents");
    expect(body).toHaveProperty("totalCostCents");
    expect(body).toHaveProperty("supplierAlertCount");
    expect(body).toHaveProperty("highSeveritySupplierAlertCount");
    expect(body).toHaveProperty("latestSupplierAlerts");
    expect(body.topActions).toHaveLength(3);
    expect(body.topProfitContributors.length).toBeGreaterThan(0);
    expect(body.riskiestDishes.length).toBeGreaterThan(0);
  });

  it("returns riskier overview metrics for the low-margin dataset than the high-margin dataset", async () => {
    const [lowMarginResponse, highMarginResponse] = await Promise.all([
      request(buildApp()).get("/api/analytics/overview?dataset=low-margin-kitchen"),
      request(buildApp()).get("/api/analytics/overview?dataset=high-margin-bistro")
    ]);

    const lowMargin = lowMarginResponse.body as OverviewMetrics;
    const highMargin = highMarginResponse.body as OverviewMetrics;

    expect(lowMargin.lossCount + lowMargin.warningCount).toBeGreaterThan(
      highMargin.lossCount + highMargin.warningCount
    );
    expect(lowMargin.weightedAverageMarginPercent).toBeLessThan(
      highMargin.weightedAverageMarginPercent
    );
  });

  it("returns analytics dishes for the selected dataset", async () => {
    const response = await request(buildApp()).get("/api/analytics/dishes?dataset=low-margin-kitchen");
    const body = response.body as CalculatedDish[];

    expect(response.status).toBe(200);
    expect(body).toHaveLength(8);
    expect(body[0]).toHaveProperty("marginPercent");
    expect(body[0]).toHaveProperty("status");
    expect(body[0]).toHaveProperty("costRatioPercent");
  });

  it("returns a dish detail payload with breakdown, cost driver insight, and target margin hints", async () => {
    const response = await request(buildApp()).get(
      "/api/analytics/dish/dish-burger?dataset=mixed-restaurant"
    );
    const body = response.body as DishDetailAnalytics;

    expect(response.status).toBe(200);
    expect(body.dish.id).toBe("dish-burger");
    expect(body.metrics.dishId).toBe("dish-burger");
    expect(body.ingredientBreakdown[0]).toHaveProperty("percentOfDishCost");
    expect(body.explanation).toHaveProperty("headline");
    expect(body.recommendedActionsForDish.length).toBeGreaterThan(0);
    expect(body.simulationHints.quickAdjustmentsCents).toEqual([50, 100, 200]);
    expect(body.simulationHints.targetMarginActions[0]).toHaveProperty("targetMarginPercent");
    expect(body.costDriverInsight).toHaveProperty("message");
  });

  it("returns 404 when a dish does not exist in the selected dataset", async () => {
    const response = await request(buildApp()).get(
      "/api/analytics/dish/dish-ghost?dataset=mixed-restaurant"
    );
    const body = response.body as { message: string };

    expect(response.status).toBe(404);
    expect(body.message).toContain("Dish not found");
  });

  it("returns all ranked actions for the selected dataset", async () => {
    const response = await request(buildApp()).get("/api/analytics/actions?dataset=low-margin-kitchen");
    const body = response.body as DishAction[];

    expect(response.status).toBe(200);
    expect(body.length).toBeGreaterThanOrEqual(3);
    expect(body[0]).toHaveProperty("reasonCodes");
  });

  it("simulates a dish price change with the selected dataset", async () => {
    const response = await request(buildApp())
      .post("/api/simulate/price?dataset=low-margin-kitchen")
      .send({ dishId: "dish-burger", newPriceCents: 1290 });
    const body = response.body as PriceSimulationResult;

    expect(response.status).toBe(200);
    expect(body.dishId).toBe("dish-burger");
    expect(body.newPriceCents).toBe(1290);
    expect(body.statusBefore).toBe("loss");
    expect(body.statusAfter).toBe("warning");
    expect(body.profitDeltaCents).toBeGreaterThan(0);
  });

  it("validates simulator payloads", async () => {
    const missingDishId = await request(buildApp())
      .post("/api/simulate/price?dataset=mixed-restaurant")
      .send({ newPriceCents: 1490 });
    const invalidPrice = await request(buildApp())
      .post("/api/simulate/price?dataset=mixed-restaurant")
      .send({ dishId: "dish-burger", newPriceCents: 0 });

    expect(missingDishId.status).toBe(400);
    expect(invalidPrice.status).toBe(400);
  });

  it("returns 404 for unknown datasets", async () => {
    const response = await request(buildApp()).get("/api/analytics/overview?dataset=ghost-dataset");
    const body = response.body as unknown as { message: string };

    expect(response.status).toBe(404);
    expect(body.message).toContain('Unknown dataset "ghost-dataset"');
  });

  it("returns sample invoice metadata", async () => {
    const response = await request(buildApp()).get("/api/invoices/samples");
    const body = response.body as MockInvoiceSampleSummary[];

    expect(response.status).toBe(200);
    expect(body).toHaveLength(3);
    expect(body[0]).toHaveProperty("expectedImpact");
  });

  it("exports a dataset, rejects invalid import payloads, and imports a pilot workspace safely", async () => {
    const app = buildApp({
      env: {
        ...process.env,
        APP_MODE: "pilot"
      }
    });
    const token = await login(app, "owner@example.com", "workspace-pilot-workspace", "owner");
    const exportResponse = await request(app)
      .get("/api/export?dataset=pilot-workspace")
      .set("Authorization", `Bearer ${token}`);
    const exported = exportResponse.body as {
      schemaVersion: number;
      datasetId: string;
      exportedFromAppVersion: string;
      dataset: { id: string };
      ingredients: unknown[];
      recipes: unknown[];
      dishes: unknown[];
    };

    expect(exportResponse.status).toBe(200);
    expect(exported.schemaVersion).toBe(1);
    expect(exported.datasetId).toBe("pilot-workspace");
    expect(exported.exportedFromAppVersion).toBeTruthy();
    expect(exported.dataset.id).toBe("pilot-workspace");

    const invalidImportResponse = await request(app)
      .post("/api/import?dataset=pilot-workspace")
      .set("Authorization", `Bearer ${token}`)
      .send({ dataset: { id: "pilot-workspace" } });

    expect(invalidImportResponse.status).toBe(400);

    const importResponse = await request(app)
      .post("/api/import?dataset=pilot-workspace")
      .set("Authorization", `Bearer ${token}`)
      .send({
        ...exported,
        dataset: {
          ...exported.dataset,
          id: "pilot-workspace",
          name: "Pilot Workspace",
          description: "Imported pilot workspace"
        }
      });
    const importBody = importResponse.body as {
      datasetId: string;
      dishCount: number;
    };

    expect(importResponse.status).toBe(201);
    expect(importBody.datasetId).toBe("pilot-workspace");
    expect(importBody.dishCount).toBeGreaterThan(0);

    const pilotOverviewResponse = await request(app)
      .get("/api/analytics/overview?dataset=pilot-workspace")
      .set("Authorization", `Bearer ${token}`);
    expect(pilotOverviewResponse.status).toBe(200);
  });

  it("validates import payloads before write and reports bad references", async () => {
    const app = buildApp({
      env: {
        ...process.env,
        APP_MODE: "pilot"
      }
    });
    const token = await login(app, "owner@example.com", "workspace-pilot-workspace", "owner");
    const exportResponse = await request(app)
      .get("/api/export?dataset=pilot-workspace")
      .set("Authorization", `Bearer ${token}`);
    const exported = exportResponse.body as {
      dataset: { id: string; name: string; description: string };
      ingredients: Array<{ id: string }>;
      recipes: Array<{
        id: string;
        name: string;
        yield: number;
        ingredients: Array<{ ingredientId: string; quantity: number; unit: string }>;
      }>;
      dishes: Array<{
        id: string;
        name: string;
        recipeId: string;
        priceCents: number;
        salesVolume: number;
      }>;
    };

    const invalidValidateResponse = await request(app)
      .post("/api/import/validate?dataset=pilot-workspace")
      .set("Authorization", `Bearer ${token}`)
      .send({
        ...exported,
        dataset: {
          ...exported.dataset,
          id: "pilot-workspace"
        },
        recipes: exported.recipes.map((recipe, index) =>
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
        dishes: exported.dishes.map((dish, index) =>
          index === 0 ? { ...dish, recipeId: "ghost-recipe" } : dish
        )
      });
    const invalidValidateBody = invalidValidateResponse.body as ImportValidationReport;

    expect(invalidValidateResponse.status).toBe(400);
    expect(invalidValidateBody.valid).toBe(false);
    expect(invalidValidateBody.errors.length).toBeGreaterThan(0);

    const validValidateResponse = await request(app)
      .post("/api/import/validate?dataset=pilot-workspace")
      .set("Authorization", `Bearer ${token}`)
      .send({
        ...exported,
        dataset: {
          ...exported.dataset,
          id: "pilot-workspace",
          name: "Pilot Workspace",
          description: "Validated import"
        },
        datasetId: "pilot-workspace"
      });
    const validValidateBody = validValidateResponse.body as ImportValidationReport;

    expect(validValidateResponse.status).toBe(200);
    expect(validValidateBody.valid).toBe(true);
    expect(validValidateBody.summary.recipes).toBeGreaterThan(0);
  });

  it("rejects imports that target seeded demo datasets", async () => {
    const exportResponse = await request(buildApp()).get("/api/export?dataset=mixed-restaurant");
    const exportedPayload = exportResponse.body as Record<string, unknown>;
    const response = await request(buildApp())
      .post("/api/import?dataset=mixed-restaurant")
      .send(exportedPayload);
    const body = response.body as { message: string };

    expect(response.status).toBe(400);
    expect(body.message).toContain("Import payload failed validation.");
  });

  it("reports file-store config and deep health when STORE_DRIVER=file", async () => {
    const tempDataDir = path.resolve(".tmp", "api-file-health-test");
    fs.rmSync(tempDataDir, { force: true, recursive: true });

    try {
      const app = buildApp({
        env: {
          ...process.env,
          APP_MODE: "pilot",
          STORE_DRIVER: "file",
          DATA_DIR: tempDataDir,
          SESSION_SECRET: "pilot-health-secret"
        }
      });

      const configResponse = await request(app).get("/api/app/config");
      const deepHealthResponse = await request(app).get("/api/health/deep");
      const configBody = configResponse.body as {
        storage: { driver: string; readable: boolean; writable: boolean };
      };
      const deepHealthBody = deepHealthResponse.body as { ok: boolean };

      expect(configResponse.status).toBe(200);
      expect(configBody.storage.driver).toBe("file");
      expect(configBody.storage.readable).toBe(true);
      expect(configBody.storage.writable).toBe(true);
      expect(deepHealthResponse.status).toBe(200);
      expect(deepHealthBody.ok).toBe(true);
      expect(JSON.stringify(deepHealthBody)).not.toContain("OCR_PROVIDER_API_KEY");
    } finally {
      fs.rmSync(tempDataDir, { force: true, recursive: true });
    }
  });

  it("validates ingredient and dish editing payloads", async () => {
    const app = buildApp();
    const badIngredientResponse = await request(app)
      .patch("/api/ingredients/parmesan?dataset=mixed-restaurant")
      .send({ costPerUnitCents: -1 });
    const badDishResponse = await request(app)
      .patch("/api/dishes/dish-burger?dataset=mixed-restaurant")
      .send({ priceCents: -1 });

    expect(badIngredientResponse.status).toBe(400);
    expect(badDishResponse.status).toBe(400);
  });

  it("creates and updates recipes with normalized units", async () => {
    const app = buildApp({
      env: {
        ...process.env,
        APP_MODE: "pilot"
      }
    });
    const token = await login(app, "owner@example.com", "workspace-pilot-workspace", "owner");
    const createResponse = await request(app)
      .post("/api/recipes?dataset=pilot-workspace")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Pilot Soup Base",
        yield: 1,
        ingredients: [
          {
            ingredientId: "pilot-romaine",
            quantity: 0.5,
            unit: "kg"
          }
        ]
      });
    const createdRecipe = createResponse.body as {
      id: string;
      ingredients: Array<{ quantity: number; unit: string }>;
    };

    expect(createResponse.status).toBe(201);
    expect(createdRecipe.ingredients[0]?.quantity).toBe(500);
    expect(createdRecipe.ingredients[0]?.unit).toBe("g");

    const updateResponse = await request(app)
      .patch(`/api/recipes/${createdRecipe.id}?dataset=pilot-workspace`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        ingredients: [
          {
            ingredientId: "pilot-romaine",
            quantity: 0.75,
            unit: "kg"
          }
        ]
      });
    const updatedRecipe = updateResponse.body as {
      ingredients: Array<{ quantity: number }>;
    };

    expect(updateResponse.status).toBe(200);
    expect(updatedRecipe.ingredients[0]?.quantity).toBe(750);
  });

  it("rejects invalid recipe ingredient references and invalid dish recipe references", async () => {
    const app = buildApp({
      env: {
        ...process.env,
        APP_MODE: "pilot"
      }
    });
    const token = await login(app, "owner@example.com", "workspace-pilot-workspace", "owner");
    const badRecipeResponse = await request(app)
      .post("/api/recipes?dataset=pilot-workspace")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Broken recipe",
        yield: 1,
        ingredients: [
          {
            ingredientId: "ghost-ingredient",
            quantity: 1,
            unit: "g"
          }
        ]
      });
    const badDishResponse = await request(app)
      .patch("/api/dishes/pilot-dish-burger?dataset=pilot-workspace")
      .set("Authorization", `Bearer ${token}`)
      .send({
        recipeId: "ghost-recipe"
      });

    expect(badRecipeResponse.status).toBe(400);
    expect(badDishResponse.status).toBe(400);
  });

  it("changes analytics when a dish-linked recipe changes", async () => {
    const app = buildApp({
      env: {
        ...process.env,
        APP_MODE: "pilot"
      }
    });
    const token = await login(app, "owner@example.com", "workspace-pilot-workspace", "owner");
    const beforeResponse = await request(app)
      .get("/api/analytics/overview?dataset=pilot-workspace")
      .set("Authorization", `Bearer ${token}`);
    const before = beforeResponse.body as OverviewMetrics;

    const recipeUpdateResponse = await request(app)
      .patch("/api/recipes/pilot-recipe-burger?dataset=pilot-workspace")
      .set("Authorization", `Bearer ${token}`)
      .send({
        ingredients: [
          { ingredientId: "pilot-bun", quantity: 1, unit: "piece" },
          { ingredientId: "pilot-beef-patty", quantity: 240, unit: "g" },
          { ingredientId: "pilot-cheddar", quantity: 25, unit: "g" }
        ]
      });

    const afterResponse = await request(app)
      .get("/api/analytics/overview?dataset=pilot-workspace")
      .set("Authorization", `Bearer ${token}`);
    const after = afterResponse.body as OverviewMetrics;

    expect(recipeUpdateResponse.status).toBe(200);
    expect(after.weightedAverageMarginPercent).toBeLessThan(before.weightedAverageMarginPercent);
    expect(after.estimatedPeriodProfitCents).toBeLessThan(before.estimatedPeriodProfitCents);
  });

  it("persists recipe and dish edits after file-store reload", async () => {
    const tempDataDir = path.resolve(".tmp", "api-file-persistence-test");
    fs.rmSync(tempDataDir, { force: true, recursive: true });

    try {
      const env = {
        ...process.env,
        APP_MODE: "pilot",
        STORE_DRIVER: "file",
        DATA_DIR: tempDataDir
      };
      const app = buildApp({ env });
      const token = await login(app, "owner@example.com", "workspace-pilot-workspace", "owner");

      const recipeUpdateResponse = await request(app)
        .patch("/api/recipes/pilot-recipe-burger?dataset=pilot-workspace")
        .set("Authorization", `Bearer ${token}`)
        .send({
          ingredients: [
            { ingredientId: "pilot-bun", quantity: 1, unit: "piece" },
            { ingredientId: "pilot-beef-patty", quantity: 220, unit: "g" },
            { ingredientId: "pilot-cheddar", quantity: 25, unit: "g" }
          ]
        });
      const dishUpdateResponse = await request(app)
        .patch("/api/dishes/pilot-dish-burger?dataset=pilot-workspace")
        .set("Authorization", `Bearer ${token}`)
        .send({
          recipeId: "pilot-recipe-burger",
          priceCents: 1590,
          salesVolume: 18
        });

      expect(recipeUpdateResponse.status).toBe(200);
      expect(dishUpdateResponse.status).toBe(200);

      const reloadedApp = buildApp({ env });
      const reloadedToken = await login(reloadedApp, "owner@example.com", "workspace-pilot-workspace", "owner");
      const recipesResponse = await request(reloadedApp).get(
        "/api/recipes?dataset=pilot-workspace"
      ).set("Authorization", `Bearer ${reloadedToken}`);
      const dishesResponse = await request(reloadedApp)
        .get("/api/dishes?dataset=pilot-workspace")
        .set("Authorization", `Bearer ${reloadedToken}`);
      const recipesBody = recipesResponse.body as Array<{
        id: string;
        ingredients: Array<{ ingredientId: string; quantity: number }>;
      }>;
      const dishesBody = dishesResponse.body as Array<{
        id: string;
        recipeId: string;
        priceCents: number;
        salesVolume: number;
      }>;

      expect(recipesResponse.status).toBe(200);
      expect(dishesResponse.status).toBe(200);
      expect(
        recipesBody.some(
          (recipe) =>
            recipe.id === "pilot-recipe-burger" &&
            recipe.ingredients.some(
              (ingredient) =>
                ingredient.ingredientId === "pilot-beef-patty" && ingredient.quantity === 220
            )
        )
      ).toBe(true);
      expect(
        dishesBody.some(
          (dish) => dish.id === "pilot-dish-burger" && dish.recipeId === "pilot-recipe-burger" && dish.priceCents === 1590 && dish.salesVolume === 18
        )
      ).toBe(true);
    } finally {
      fs.rmSync(tempDataDir, { force: true, recursive: true });
    }
  });

  it("returns OCR provider registry metadata with fixture as the default", async () => {
    const response = await request(buildApp()).get("/api/ocr/providers");
    const body = response.body as Array<{
      id: string;
      displayName: string;
      isConfigured: boolean;
      isDefault: boolean;
      modelConfigured?: boolean;
      mode: string;
    }>;

    expect(response.status).toBe(200);
    expect(body[0]?.id).toBe("fixture");
    expect(body[0]?.displayName).toBe("Development fixture OCR");
    expect(body[0]?.isConfigured).toBe(true);
    expect(body[0]?.isDefault).toBe(true);
    expect(body.some((provider) => provider.id === "external_env")).toBe(true);
    expect(body.find((provider) => provider.id === "external_env")?.modelConfigured).toBe(false);
  });

  it("creates an OCR draft from a mocked external provider response", async () => {
    const fetchMock: typeof fetch = () =>
      Promise.resolve(
        new Response(
        JSON.stringify({
          output_text: JSON.stringify({
            supplierName: "Metro Fresh Wholesale",
            invoiceNumber: "EXT-4100",
            invoiceDate: "2026-04-18",
            totalAmountCents: 16420,
            confidence: "medium",
            warnings: [],
            lines: [
              {
                rawProductName: "Parmesan Grated",
                quantity: 500,
                unit: "g",
                unitPriceCents: 700,
                lineTotalCents: 350000,
                confidence: "high",
                warnings: []
              }
            ]
          })
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
        )
      );

    const app = buildApp({
      ocrRegistry: createOcrProviderRegistry({
        env: {
          OCR_PROVIDER: "external_env",
          OCR_PROVIDER_API_KEY: "test-key",
          OCR_PROVIDER_MODEL: "gpt-4.1-mini"
        },
        fetchImpl: fetchMock
      })
    });

    const response = await request(app)
      .post("/api/ocr/invoices/upload?dataset=mixed-restaurant&provider=external_env")
      .attach("file", Buffer.from("fixture"), {
        filename: "provider-invoice.jpg",
        contentType: "image/jpeg"
      });

    const body = response.body as {
      providerConfig: { id: string };
      invoiceDraft: { sourceType: string };
      qualityReport: { lineCount: number };
    };

    expect(response.status).toBe(200);
    expect(body.providerConfig.id).toBe("external_env");
    expect(body.invoiceDraft.sourceType).toBe("ocr_future");
    expect(body.qualityReport.lineCount).toBe(1);
  });

  it("fails safely when a mocked external provider returns invalid JSON", async () => {
    const fetchMock: typeof fetch = () =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            output_text: "{bad-json}"
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json"
            }
          }
        )
      );

    const app = buildApp({
      ocrRegistry: createOcrProviderRegistry({
        env: {
          OCR_PROVIDER: "external_env",
          OCR_PROVIDER_API_KEY: "test-key",
          OCR_PROVIDER_MODEL: "gpt-4.1-mini"
        },
        fetchImpl: fetchMock
      })
    });

    const response = await request(app)
      .post("/api/ocr/invoices/upload?dataset=mixed-restaurant&provider=external_env")
      .attach("file", Buffer.from("fixture"), {
        filename: "provider-invoice.jpg",
        contentType: "image/jpeg"
      });
    const body = response.body as {
      message: string;
      ocrJob?: { status: string };
    };

    expect(response.status).toBe(422);
    expect(body.message).toContain("invalid JSON");
    expect(body.message).not.toContain("test-key");
    expect(body.ocrJob?.status).toBe("failed");
  });

  it("parses a mock invoice draft for the selected dataset", async () => {
    const response = await request(buildApp())
      .post("/api/invoices/parse-mock?dataset=mixed-restaurant")
      .send({ sampleInvoiceId: "normal-supplier-invoice" });

    const body = response.body as unknown as {
      invoiceDraft: { id: string; parseStatus: string };
      summary: { totalLines: number; highConfidenceCount: number };
    };

    expect(response.status).toBe(200);
    expect(body.invoiceDraft.parseStatus).toBeTruthy();
    expect(body.summary.totalLines).toBe(7);
  });

  it("returns 404 for an unknown sample invoice id", async () => {
    const response = await request(buildApp())
      .post("/api/invoices/parse-mock?dataset=mixed-restaurant")
      .send({ sampleInvoiceId: "ghost-sample" });
    const body = response.body as unknown as { message: string };

    expect(response.status).toBe(404);
    expect(body.message).toContain('Unknown sample invoice "ghost-sample"');
  });

  it("creates a manual structured invoice draft and derives unit price from line total", async () => {
    const response = await request(buildApp())
      .post("/api/invoices/manual-draft?dataset=mixed-restaurant")
      .send({
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
      });
    const body = response.body as {
      invoiceDraft: { sourceType: string };
      lines: Array<{ parsedUnitPriceCents?: number; reviewStatus: string }>;
    };

    expect(response.status).toBe(200);
    expect(body.invoiceDraft.sourceType).toBe("manual");
    expect(body.lines[0].parsedUnitPriceCents).toBe(4);
    expect(body.lines[0].reviewStatus).toBe("ready");
  });

  it("validates manual structured invoice drafts", async () => {
    const response = await request(buildApp())
      .post("/api/invoices/manual-draft?dataset=mixed-restaurant")
      .send({
        supplierName: "",
        invoiceDate: "2026-04-28",
        lines: []
      });

    expect(response.status).toBe(400);
  });

  it("returns a stored invoice draft by id", async () => {
    const app = buildApp();
    const parseResponse = await request(app)
      .post("/api/invoices/parse-mock?dataset=mixed-restaurant")
      .send({ sampleInvoiceId: "normal-supplier-invoice" });
    const parsedInvoice = parseResponse.body as unknown as {
      invoiceDraft: { id: string };
    };
    const invoiceId = parsedInvoice.invoiceDraft.id;

    const response = await request(app).get(`/api/invoices/${invoiceId}?dataset=mixed-restaurant`);
    const body = response.body as StoredInvoiceView;

    expect(response.status).toBe(200);
    expect(body.invoice.id).toBe(invoiceId);
    expect(body.lines).toHaveLength(7);
  });

  it("returns 404 for an unknown invoice id", async () => {
    const response = await request(buildApp()).get(
      "/api/invoices/invoice-ghost?dataset=mixed-restaurant"
    );
    const body = response.body as unknown as { message: string };

    expect(response.status).toBe(404);
    expect(body.message).toContain("Invoice not found");
  });

  it("blocks confirmation when unresolved lines are submitted as confirmed", async () => {
    const app = buildApp();
    const parseResponse = await request(app)
      .post("/api/invoices/parse-mock?dataset=mixed-restaurant")
      .send({ sampleInvoiceId: "messy-supplier-invoice" });

    const invoice = parseResponse.body as {
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

    const mysteryLine = invoice.lines.find((line) => line.matchedIngredientId === undefined);

    const response = await request(app)
      .post(`/api/invoices/${invoice.invoiceDraft.id}/review-confirm?dataset=mixed-restaurant`)
      .send({
        supplierId: invoice.invoiceDraft.supplierId,
        invoiceDate: invoice.invoiceDraft.invoiceDate,
        invoiceNumber: invoice.invoiceDraft.invoiceNumber,
        lines: invoice.lines.map((line) => ({
          lineId: line.id,
          reviewStatus: "confirmed",
          matchedIngredientId: line.id === mysteryLine?.id ? undefined : line.matchedIngredientId,
          parsedQuantity: line.parsedQuantity,
          parsedUnit: line.parsedUnit,
          parsedUnitPriceCents: line.parsedUnitPriceCents ?? 1,
          parsedLineTotalCents: line.parsedLineTotalCents
        }))
      });
    const body = response.body as unknown as { message: string };

    expect(response.status).toBe(400);
    expect(body.message).toContain("matchedIngredientId");
  });

  it("confirms a reviewed invoice, updates cost history, and ignores skipped lines", async () => {
    const app = buildApp();
    const parseResponse = await request(app)
      .post("/api/invoices/parse-mock?dataset=mixed-restaurant")
      .send({ sampleInvoiceId: "normal-supplier-invoice" });

    const invoice = parseResponse.body as {
      invoiceDraft: { id: string; supplierId: string; invoiceDate: string; invoiceNumber?: string };
      lines: Array<{
        id: string;
        rawProductName: string;
        matchedIngredientId?: string;
        parsedQuantity: number;
        parsedUnit: string;
        parsedUnitPriceCents?: number;
        parsedLineTotalCents?: number;
      }>;
    };

    const romaineLine = invoice.lines.find((line) => line.rawProductName === "Romaine Lettuce Hearts");

    const confirmResponse = await request(app)
      .post(`/api/invoices/${invoice.invoiceDraft.id}/review-confirm?dataset=mixed-restaurant`)
      .send({
        supplierId: invoice.invoiceDraft.supplierId,
        invoiceDate: invoice.invoiceDraft.invoiceDate,
        invoiceNumber: invoice.invoiceDraft.invoiceNumber,
        lines: invoice.lines.map((line) => ({
          lineId: line.id,
          reviewStatus: line.id === romaineLine?.id ? "ignored" : "confirmed",
          matchedIngredientId: line.id === romaineLine?.id ? undefined : line.matchedIngredientId,
          parsedQuantity: line.parsedQuantity,
          parsedUnit: line.parsedUnit,
          parsedUnitPriceCents: line.parsedUnitPriceCents ?? 1,
          parsedLineTotalCents: line.parsedLineTotalCents
        }))
      });
    const body = confirmResponse.body as unknown as {
      confirmationSummary: {
        confirmedLineCount: number;
        ignoredLineCount: number;
      };
      costHistory: Array<{ ingredientId: string }>;
    };

    expect(confirmResponse.status).toBe(200);
    expect(body.confirmationSummary.confirmedLineCount).toBe(6);
    expect(body.confirmationSummary.ignoredLineCount).toBe(1);
    expect(body.costHistory.some((entry) => entry.ingredientId === "romaine")).toBe(false);

    const historyResponse = await request(app).get(
      "/api/ingredients/parmesan/cost-history?dataset=mixed-restaurant"
    );
    const historyBody = historyResponse.body as { ingredientId: string; history: unknown[] };
    expect(historyResponse.status).toBe(200);
    expect(historyBody.ingredientId).toBe("parmesan");
    expect(historyBody.history).toHaveLength(1);
  });

  it("returns price-change alerts after invoice confirmation", async () => {
    const app = buildApp();
    const parseResponse = await request(app)
      .post("/api/invoices/parse-mock?dataset=mixed-restaurant")
      .send({ sampleInvoiceId: "high-impact-price-spike" });

    const invoice = parseResponse.body as {
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

    await request(app)
      .post(`/api/invoices/${invoice.invoiceDraft.id}/review-confirm?dataset=mixed-restaurant`)
      .send({
        supplierId: invoice.invoiceDraft.supplierId,
        invoiceDate: invoice.invoiceDraft.invoiceDate,
        invoiceNumber: invoice.invoiceDraft.invoiceNumber,
        lines: invoice.lines.map((line) => ({
          lineId: line.id,
          reviewStatus: "confirmed",
          matchedIngredientId: line.matchedIngredientId,
          parsedQuantity: line.parsedQuantity,
          parsedUnit: line.parsedUnit,
          parsedUnitPriceCents: line.parsedUnitPriceCents ?? 1,
          parsedLineTotalCents: line.parsedLineTotalCents
        }))
      });

    const response = await request(app).get("/api/alerts/price-changes?dataset=mixed-restaurant");
    const body = response.body as PriceChangeAlert[];

    expect(response.status).toBe(200);
    expect(body.length).toBeGreaterThan(0);
    expect(body.some((alert) => alert.type === "dish_margin_at_risk_due_to_cost_change")).toBe(
      true
    );
    expect(body[0]).toHaveProperty("supplierName");
    expect(body[0]).toHaveProperty("affectedDishNames");
  });

  it("changes analytics and enriches action ranking after invoice confirmation", async () => {
    const app = buildApp();
    const beforeResponse = await request(app).get("/api/analytics/overview?dataset=mixed-restaurant");
    const before = beforeResponse.body as OverviewMetrics;

    const parseResponse = await request(app)
      .post("/api/invoices/parse-mock?dataset=mixed-restaurant")
      .send({ sampleInvoiceId: "high-impact-price-spike" });

    const invoice = parseResponse.body as {
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

    await request(app)
      .post(`/api/invoices/${invoice.invoiceDraft.id}/review-confirm?dataset=mixed-restaurant`)
      .send({
        supplierId: invoice.invoiceDraft.supplierId,
        invoiceDate: invoice.invoiceDraft.invoiceDate,
        invoiceNumber: invoice.invoiceDraft.invoiceNumber,
        lines: invoice.lines.map((line) => ({
          lineId: line.id,
          reviewStatus: "confirmed",
          matchedIngredientId: line.matchedIngredientId,
          parsedQuantity: line.parsedQuantity,
          parsedUnit: line.parsedUnit,
          parsedUnitPriceCents: line.parsedUnitPriceCents ?? 1,
          parsedLineTotalCents: line.parsedLineTotalCents
        }))
      });

    const afterResponse = await request(app).get("/api/analytics/overview?dataset=mixed-restaurant");
    const after = afterResponse.body as OverviewMetrics;
    const actionsResponse = await request(app).get("/api/analytics/actions?dataset=mixed-restaurant");
    const actions = actionsResponse.body as DishAction[];

    expect(after.weightedAverageMarginPercent).toBeLessThan(before.weightedAverageMarginPercent);
    expect(after.estimatedPeriodProfitCents).toBeLessThan(before.estimatedPeriodProfitCents);
    expect(after.supplierAlertCount).toBeGreaterThan(0);
    expect(after.highSeveritySupplierAlertCount).toBeGreaterThan(0);
    expect(actions.some((action) => action.reasonCodes.includes("SUPPLIER_PRICE_INCREASE"))).toBe(true);
  });

  it("resets a dataset back to baseline and clears invoice-driven state without affecting others", async () => {
    const app = buildApp();
    const parseResponse = await request(app)
      .post("/api/invoices/parse-mock?dataset=mixed-restaurant")
      .send({ sampleInvoiceId: "high-impact-price-spike" });
    const invoice = parseResponse.body as {
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

    await request(app)
      .post(`/api/invoices/${invoice.invoiceDraft.id}/review-confirm?dataset=mixed-restaurant`)
      .send({
        supplierId: invoice.invoiceDraft.supplierId,
        invoiceDate: invoice.invoiceDraft.invoiceDate,
        invoiceNumber: invoice.invoiceDraft.invoiceNumber,
        lines: invoice.lines.map((line) => ({
          lineId: line.id,
          reviewStatus: "confirmed",
          matchedIngredientId: line.matchedIngredientId,
          parsedQuantity: line.parsedQuantity,
          parsedUnit: line.parsedUnit,
          parsedUnitPriceCents: line.parsedUnitPriceCents ?? 1,
          parsedLineTotalCents: line.parsedLineTotalCents
        }))
      });

    const lowMarginBeforeReset = await request(app).get("/api/analytics/overview?dataset=low-margin-kitchen");
    const resetResponse = await request(app).post("/api/datasets/mixed-restaurant/reset").send({});
    const mixedOverviewAfterReset = await request(app).get("/api/analytics/overview?dataset=mixed-restaurant");
    const mixedCostHistoryAfterReset = await request(app).get(
      "/api/ingredients/beef-patty/cost-history?dataset=mixed-restaurant"
    );
    const mixedOcrJobsAfterReset = await request(app).get("/api/ocr/jobs?dataset=mixed-restaurant");
    const lowMarginAfterReset = await request(app).get("/api/analytics/overview?dataset=low-margin-kitchen");
    const resetBody = resetResponse.body as { clearedInvoices: number };
    const mixedOverviewBody = mixedOverviewAfterReset.body as OverviewMetrics;
    const mixedCostHistoryBody = mixedCostHistoryAfterReset.body as { history: unknown[] };
    const lowMarginBeforeResetBody = lowMarginBeforeReset.body as OverviewMetrics;
    const lowMarginAfterResetBody = lowMarginAfterReset.body as OverviewMetrics;

    expect(resetResponse.status).toBe(200);
    expect(resetBody.clearedInvoices).toBeGreaterThan(0);
    expect(mixedOverviewBody.supplierAlertCount).toBe(0);
    expect(mixedCostHistoryBody.history).toEqual([]);
    expect(mixedOcrJobsAfterReset.body).toEqual([]);
    expect(lowMarginAfterResetBody.estimatedPeriodProfitCents).toBe(
      lowMarginBeforeResetBody.estimatedPeriodProfitCents
    );
  });

  it("blocks repeated confirmation so cost history and alerts are not double-applied", async () => {
    const app = buildApp();
    const parseResponse = await request(app)
      .post("/api/invoices/parse-mock?dataset=mixed-restaurant")
      .send({ sampleInvoiceId: "normal-supplier-invoice" });

    const invoice = parseResponse.body as {
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

    const payload = {
      supplierId: invoice.invoiceDraft.supplierId,
      invoiceDate: invoice.invoiceDraft.invoiceDate,
      invoiceNumber: invoice.invoiceDraft.invoiceNumber,
      lines: invoice.lines.map((line) => ({
        lineId: line.id,
        reviewStatus: "confirmed",
        matchedIngredientId: line.matchedIngredientId,
        parsedQuantity: line.parsedQuantity,
        parsedUnit: line.parsedUnit,
        parsedUnitPriceCents: line.parsedUnitPriceCents ?? 1,
        parsedLineTotalCents: line.parsedLineTotalCents
      }))
    };

    const firstResponse = await request(app)
      .post(`/api/invoices/${invoice.invoiceDraft.id}/review-confirm?dataset=mixed-restaurant`)
      .send(payload);
    const secondResponse = await request(app)
      .post(`/api/invoices/${invoice.invoiceDraft.id}/review-confirm?dataset=mixed-restaurant`)
      .send(payload);

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(409);
  });

  it("returns empty cost-history payloads and 404s invalid ingredients", async () => {
    const app = buildApp();
    const emptyHistoryResponse = await request(app).get(
      "/api/ingredients/beef-patty/cost-history?dataset=mixed-restaurant"
    );
    const missingIngredientResponse = await request(app).get(
      "/api/ingredients/ghost/cost-history?dataset=mixed-restaurant"
    );
    const emptyHistoryBody = emptyHistoryResponse.body as { history: unknown[] };

    expect(emptyHistoryResponse.status).toBe(200);
    expect(emptyHistoryBody.history).toEqual([]);
    expect(missingIngredientResponse.status).toBe(404);
  });

  it("creates an OCR draft from fixture upload and returns the linked job", async () => {
    const app = buildApp();
    const uploadResponse = await request(app)
      .post("/api/ocr/invoices/upload?dataset=mixed-restaurant")
      .attach("file", Buffer.from("fixture"), {
        filename: "clean-invoice-photo.jpg",
        contentType: "image/jpeg"
      });

    const uploadBody = uploadResponse.body as {
      ocrJob: {
        id: string;
        status: string;
        invoiceDraftId?: string;
        uploadObjectId?: string;
        sanitizedFileName?: string;
        uploadObject?: { storageProvider: string; storageKey: string };
      };
      ocrResult: { confidence: string };
      invoiceDraft: { id: string; sourceType: string };
      qualityReport: { policyWarnings?: string[] };
    };

    expect(uploadResponse.status).toBe(200);
    expect(uploadBody.invoiceDraft.sourceType).toBe("ocr_future");
    expect(uploadBody.ocrJob.status).toBe("parsed");
    expect(uploadBody.ocrJob.uploadObjectId).toBeTruthy();
    expect(uploadBody.ocrJob.sanitizedFileName).toBe("clean-invoice-photo.jpg");
    expect(uploadBody.ocrJob.uploadObject?.storageProvider).toBe("memory");
    expect(JSON.stringify(uploadBody.ocrJob)).not.toContain(".uploads");
    expect(uploadBody.ocrResult.confidence).toBe("high");
    expect(uploadBody.qualityReport.policyWarnings).toEqual([]);

    const jobResponse = await request(app).get(
      `/api/ocr/jobs/${uploadBody.ocrJob.id}?dataset=mixed-restaurant`
    );
    const jobBody = jobResponse.body as {
      ocrJob: { invoiceDraftId?: string };
      qualityReport: { recommendedReviewMode: string };
    };

    expect(jobResponse.status).toBe(200);
    expect(jobBody.ocrJob.invoiceDraftId).toBe(uploadBody.invoiceDraft.id);
    expect(jobBody.qualityReport.recommendedReviewMode).toBe("quick_review");
  });

  it("stores OCR upload metadata in local_file storage without exposing local paths", async () => {
    const uploadDir = path.resolve(".tmp", "api-test-uploads");
    fs.rmSync(uploadDir, { recursive: true, force: true });
    const app = buildApp({
      env: {
        ...process.env,
        UPLOAD_STORAGE_DRIVER: "local_file",
        UPLOAD_DATA_DIR: uploadDir
      }
    });

    const response = await request(app)
      .post("/api/ocr/invoices/upload?dataset=mixed-restaurant")
      .attach("file", Buffer.from("fixture"), {
        filename: "../clean-invoice-photo.jpg",
        contentType: "image/jpeg"
      });
    const body = response.body as {
      ocrJob: {
        uploadObject?: { storageProvider: string; storageKey: string };
        sanitizedFileName?: string;
      };
    };

    expect(response.status).toBe(200);
    expect(body.ocrJob.sanitizedFileName).toBe("clean-invoice-photo.jpg");
    expect(body.ocrJob.uploadObject?.storageProvider).toBe("local_file");
    expect(fs.existsSync(path.join(uploadDir, body.ocrJob.uploadObject?.storageKey ?? "missing"))).toBe(true);
    expect(JSON.stringify(body.ocrJob)).not.toContain(uploadDir);

    fs.rmSync(uploadDir, { recursive: true, force: true });
  });

  it("lists OCR jobs with quality summaries", async () => {
    const app = buildApp();
    await request(app)
      .post("/api/ocr/invoices/upload?dataset=mixed-restaurant")
      .attach("file", Buffer.from("fixture"), {
        filename: "cropped-invoice-photo.jpg",
        contentType: "image/jpeg"
      });

    const response = await request(app).get("/api/ocr/jobs?dataset=mixed-restaurant");
    const body = response.body as Array<{
      id: string;
      qualityReport?: { recommendedReviewMode: string };
    }>;

    expect(response.status).toBe(200);
    expect(body.length).toBeGreaterThan(0);
    expect(body[0]?.qualityReport?.recommendedReviewMode).toBeTruthy();
  });

  it("rejects unsupported OCR upload file types", async () => {
    const response = await request(buildApp())
      .post("/api/ocr/invoices/upload?dataset=mixed-restaurant")
      .attach("file", Buffer.from("bad"), {
        filename: "invoice.txt",
        contentType: "text/plain"
      });

    expect(response.status).toBe(415);
  });

  it("rejects unknown OCR provider ids", async () => {
    const response = await request(buildApp())
      .post("/api/ocr/invoices/upload?dataset=mixed-restaurant&provider=ghost")
      .attach("file", Buffer.from("fixture"), {
        filename: "clean-invoice-photo.jpg",
        contentType: "image/jpeg"
      });

    expect(response.status).toBe(400);
  });

  it("returns a safe external-provider-not-configured error and stores a failed OCR job", async () => {
    const app = buildApp();
    const uploadResponse = await request(app)
      .post("/api/ocr/invoices/upload?dataset=mixed-restaurant&provider=external_env")
      .attach("file", Buffer.from("fixture"), {
        filename: "clean-invoice-photo.jpg",
        contentType: "image/jpeg"
      });
    const uploadBody = uploadResponse.body as {
      message: string;
      ocrJob: { status: string };
    };

    expect(uploadResponse.status).toBe(503);
    expect(uploadBody.message).toContain("not configured");
    expect(uploadBody.ocrJob.status).toBe("failed");

    const jobsResponse = await request(app).get("/api/ocr/jobs?dataset=mixed-restaurant");
    const jobs = jobsResponse.body as Array<{ status: string }>;

    expect(jobs.some((job) => job.status === "failed")).toBe(true);
  });

  it("retries and cancels failed OCR jobs without mutating costs", async () => {
    const app = buildApp();
    const beforeResponse = await request(app).get("/api/analytics/overview?dataset=mixed-restaurant");
    const before = beforeResponse.body as OverviewMetrics;
    const uploadResponse = await request(app)
      .post("/api/ocr/invoices/upload?dataset=mixed-restaurant&provider=disabled")
      .attach("file", Buffer.from("fixture"), {
        filename: "clean-invoice-photo.jpg",
        contentType: "image/jpeg"
      });
    const uploadBody = uploadResponse.body as { ocrJob: { id: string; status: string } };

    const retryResponse = await request(app).post(
      `/api/ocr/jobs/${uploadBody.ocrJob.id}/retry?dataset=mixed-restaurant`
    );
    const retryBody = retryResponse.body as {
      ocrJob: { id: string; status: string; providerAttemptCount?: number };
    };

    expect(retryResponse.status).toBe(422);
    expect(retryBody.ocrJob.status).toBe("failed");
    expect(retryBody.ocrJob.providerAttemptCount).toBe(2);

    const cancelResponse = await request(app).post(
      `/api/ocr/jobs/${retryBody.ocrJob.id}/cancel?dataset=mixed-restaurant`
    );
    const cancelBody = cancelResponse.body as { ocrJob: { status: string } };

    expect(cancelResponse.status).toBe(200);
    expect(cancelBody.ocrJob.status).toBe("cancelled");

    const afterResponse = await request(app).get("/api/analytics/overview?dataset=mixed-restaurant");
    const after = afterResponse.body as OverviewMetrics;
    expect(after.estimatedPeriodProfitCents).toBe(before.estimatedPeriodProfitCents);
  });

  it("rejects oversized OCR uploads", async () => {
    const response = await request(buildApp())
      .post("/api/ocr/invoices/upload?dataset=mixed-restaurant")
      .attach("file", Buffer.alloc(11 * 1024 * 1024, "a"), {
        filename: "clean-invoice-photo.jpg",
        contentType: "image/jpeg"
      });

    expect(response.status).toBe(413);
  });

  it("blocks OCR confirmation while low-confidence lines remain unresolved", async () => {
    const app = buildApp();
    const uploadResponse = await request(app)
      .post("/api/ocr/invoices/upload?dataset=mixed-restaurant")
      .attach("file", Buffer.from("fixture"), {
        filename: "blurry-invoice-photo.jpg",
        contentType: "image/jpeg"
      });

    const invoice = uploadResponse.body as {
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

    const response = await request(app)
      .post(`/api/invoices/${invoice.invoiceDraft.id}/review-confirm?dataset=mixed-restaurant`)
      .send({
        supplierId: invoice.invoiceDraft.supplierId,
        invoiceDate: invoice.invoiceDraft.invoiceDate,
        invoiceNumber: invoice.invoiceDraft.invoiceNumber,
        lines: invoice.lines.map((line) => ({
          lineId: line.id,
          reviewStatus: "confirmed",
          matchedIngredientId: line.matchedIngredientId,
          parsedQuantity: line.parsedQuantity,
          parsedUnit: line.parsedUnit,
          parsedUnitPriceCents: line.parsedUnitPriceCents ?? 1,
          parsedLineTotalCents: line.parsedLineTotalCents
        }))
      });

    expect(response.status).toBe(400);
  });

  it("confirms OCR drafts through the existing review-confirm flow and updates actions", async () => {
    const app = buildApp();
    const beforeOverviewResponse = await request(app).get("/api/analytics/overview?dataset=mixed-restaurant");
    const beforeOverview = beforeOverviewResponse.body as OverviewMetrics;
    const uploadResponse = await request(app)
      .post("/api/ocr/invoices/upload?dataset=mixed-restaurant")
      .attach("file", Buffer.from("fixture"), {
        filename: "clean-invoice-photo.jpg",
        contentType: "image/jpeg"
      });

    const invoice = uploadResponse.body as {
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

    const confirmResponse = await request(app)
      .post(`/api/invoices/${invoice.invoiceDraft.id}/review-confirm?dataset=mixed-restaurant`)
      .send({
        supplierId: invoice.invoiceDraft.supplierId,
        invoiceDate: invoice.invoiceDraft.invoiceDate,
        invoiceNumber: invoice.invoiceDraft.invoiceNumber,
        lines: invoice.lines.map((line) => ({
          lineId: line.id,
          reviewStatus: "confirmed",
          matchedIngredientId: line.matchedIngredientId,
          parsedQuantity: line.parsedQuantity,
          parsedUnit: line.parsedUnit,
          parsedUnitPriceCents: line.parsedUnitPriceCents ?? 1,
          parsedLineTotalCents: line.parsedLineTotalCents
        }))
      });
    const confirmBody = confirmResponse.body as {
      costHistory: Array<{ ingredientId: string }>;
      alerts: Array<{ id: string }>;
    };

    expect(confirmResponse.status).toBe(200);
    expect(confirmBody.costHistory.length).toBeGreaterThan(0);
    expect(confirmBody.alerts.length).toBeGreaterThan(0);

    const actionsResponse = await request(app).get("/api/analytics/actions?dataset=mixed-restaurant");
    const actions = actionsResponse.body as DishAction[];
    const afterOverviewResponse = await request(app).get("/api/analytics/overview?dataset=mixed-restaurant");
    const afterOverview = afterOverviewResponse.body as OverviewMetrics;

    expect(afterOverview.estimatedPeriodProfitCents).toBeLessThanOrEqual(beforeOverview.estimatedPeriodProfitCents);
    expect(afterOverview.supplierAlertCount).toBeGreaterThan(0);
    expect(actions.some((action) => action.reasonCodes.includes("SUPPLIER_PRICE_INCREASE"))).toBe(true);
  });

  it("failed OCR jobs do not mutate analytics", async () => {
    const app = buildApp();
    const beforeResponse = await request(app).get("/api/analytics/overview?dataset=mixed-restaurant");
    const before = beforeResponse.body as OverviewMetrics;

    const failedUploadResponse = await request(app)
      .post("/api/ocr/invoices/upload?dataset=mixed-restaurant&provider=external_env")
      .attach("file", Buffer.from("fixture"), {
        filename: "clean-invoice-photo.jpg",
        contentType: "image/jpeg"
      });
    const afterResponse = await request(app).get("/api/analytics/overview?dataset=mixed-restaurant");
    const after = afterResponse.body as OverviewMetrics;

    expect(failedUploadResponse.status).toBe(503);
    expect(after.supplierAlertCount).toBe(before.supplierAlertCount);
    expect(after.estimatedPeriodProfitCents).toBe(before.estimatedPeriodProfitCents);
  });
});
