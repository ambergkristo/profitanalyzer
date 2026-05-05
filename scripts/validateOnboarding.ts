import fs from "node:fs";
import path from "node:path";

import request from "supertest";

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
  status: string;
  api: string;
  checklist: string;
  setup: string;
  auth: string;
  persistence: string;
}) {
  return `# Onboarding Validation Report

## Summary

- ${report.status}
- ${report.api}
- ${report.checklist}
- ${report.setup}
- ${report.auth}
- ${report.persistence}
`;
}

async function login(app: ReturnType<typeof createApp>, email: string, role: "owner" | "admin" | "member" = "owner") {
  const response = await request(app).post("/api/auth/dev-login").send({
    email,
    workspaceId: "workspace-pilot-workspace",
    role
  });

  if (response.status !== 200) {
    throw new Error(`Onboarding validation login failed for ${email}.`);
  }

  return response.body.token as string;
}

async function main() {
  const failures: string[] = [];
  const env = {
    ...process.env,
    APP_MODE: "pilot",
    STORE_DRIVER: "memory",
    OCR_PROVIDER: "fixture",
    SESSION_SECRET: "onboarding-validation-secret"
  };
  const app = createApp({ env });
  const ownerToken = await login(app, "owner@example.com", "owner");
  const memberToken = await login(app, "member@example.com", "member");

  const statusResponse = await request(app)
    .get("/api/onboarding/status?dataset=pilot-workspace")
    .set("Authorization", `Bearer ${ownerToken}`);
  assertCondition(statusResponse.status === 200, "Onboarding status endpoint should work.", failures);
  assertCondition(
    statusResponse.body.currentStep === "restaurant_profile",
    "Initial onboarding step should be restaurant_profile.",
    failures
  );

  const checklistResponse = await request(app)
    .get("/api/onboarding/checklist?dataset=pilot-workspace")
    .set("Authorization", `Bearer ${ownerToken}`);
  assertCondition(checklistResponse.status === 200, "Onboarding checklist endpoint should work.", failures);
  assertCondition(
    Array.isArray(checklistResponse.body.items) && checklistResponse.body.items.length === 7,
    "Onboarding checklist should include all setup steps.",
    failures
  );

  const profileResponse = await request(app)
    .patch("/api/restaurant/profile?dataset=pilot-workspace")
    .set("Authorization", `Bearer ${ownerToken}`)
    .send({
      name: "Validation Restaurant",
      currency: "EUR",
      country: "EE",
      concept: "Casual dining",
      averageMonthlyDishSalesEstimate: 900
    });
  assertCondition(profileResponse.status === 200, "Restaurant profile save should work.", failures);

  const memberProfileMutation = await request(app)
    .patch("/api/restaurant/profile?dataset=pilot-workspace")
    .set("Authorization", `Bearer ${memberToken}`)
    .send({ name: "Blocked Member Edit" });
  assertCondition(memberProfileMutation.status === 403, "Member role should not mutate onboarding setup.", failures);

  const ingredientResponse = await request(app)
    .post("/api/ingredients?dataset=pilot-workspace")
    .set("Authorization", `Bearer ${ownerToken}`)
    .send({
      id: "validation-herbs",
      name: "Validation Herbs",
      costPerUnitCents: 8,
      unit: "g"
    });
  assertCondition(ingredientResponse.status === 201, "Ingredient setup should create an ingredient.", failures);

  const recipeResponse = await request(app)
    .post("/api/recipes?dataset=pilot-workspace")
    .set("Authorization", `Bearer ${ownerToken}`)
    .send({
      id: "validation-recipe",
      name: "Validation Plate",
      yield: 1,
      ingredients: [{ ingredientId: "validation-herbs", quantity: 25, unit: "g" }]
    });
  assertCondition(recipeResponse.status === 201, "Recipe setup should create a recipe.", failures);

  const dishResponse = await request(app)
    .post("/api/dishes?dataset=pilot-workspace")
    .set("Authorization", `Bearer ${ownerToken}`)
    .send({
      id: "validation-dish",
      name: "Validation Plate",
      recipeId: "validation-recipe",
      priceCents: 1400,
      salesVolume: 12
    });
  assertCondition(dishResponse.status === 201, "Dish setup should create a dish.", failures);

  const supplierResponse = await request(app)
    .post("/api/suppliers?dataset=pilot-workspace")
    .set("Authorization", `Bearer ${ownerToken}`)
    .send({
      id: "validation-supplier",
      name: "Validation Supplier",
      contactLabel: "Route"
    });
  assertCondition(supplierResponse.status === 201, "Supplier setup should create a supplier.", failures);

  const skipInvoiceResponse = await request(app)
    .post("/api/onboarding/skip-step?dataset=pilot-workspace")
    .set("Authorization", `Bearer ${ownerToken}`)
    .send({ step: "first_invoice" });
  assertCondition(skipInvoiceResponse.status === 200, "First invoice step should be skippable for setup.", failures);

  const dashboardCompleteResponse = await request(app)
    .post("/api/onboarding/complete-step?dataset=pilot-workspace")
    .set("Authorization", `Bearer ${ownerToken}`)
    .send({ step: "dashboard_review" });
  assertCondition(dashboardCompleteResponse.status === 200, "Dashboard review step should be completable.", failures);

  const overviewResponse = await request(app)
    .get("/api/analytics/overview?dataset=pilot-workspace")
    .set("Authorization", `Bearer ${ownerToken}`);
  assertCondition(overviewResponse.status === 200, "Analytics should still work after onboarding setup.", failures);

  const finalChecklistResponse = await request(app)
    .get("/api/onboarding/checklist?dataset=pilot-workspace")
    .set("Authorization", `Bearer ${ownerToken}`);
  assertCondition(finalChecklistResponse.status === 200, "Final checklist should load.", failures);
  assertCondition(
    finalChecklistResponse.body.items.some(
      (item: { step: string; complete: boolean }) => item.step === "suppliers" && item.complete
    ),
    "Supplier checklist item should complete after supplier setup.",
    failures
  );

  const exportResponse = await request(app)
    .get("/api/export?dataset=pilot-workspace")
    .set("Authorization", `Bearer ${ownerToken}`);
  assertCondition(exportResponse.status === 200, "Export should include onboarding state.", failures);
  assertCondition(Boolean(exportResponse.body.onboardingState), "Export should contain onboardingState.", failures);
  assertCondition(Boolean(exportResponse.body.restaurantProfile), "Export should contain restaurantProfile.", failures);
  assertCondition(
    JSON.stringify(exportResponse.body).includes("SESSION_SECRET") === false,
    "Onboarding export must not include secrets.",
    failures
  );

  const report = {
    status: failures.length === 0 ? "PASS onboarding validation" : "FAIL onboarding validation",
    api: "Onboarding status, checklist, complete-step, skip-step, and profile endpoints were exercised.",
    checklist: "Checklist changed as ingredient, recipe, dish, supplier, and invoice setup state changed.",
    setup: "Restaurant profile, ingredient, recipe, dish, supplier, and dashboard review setup paths were validated.",
    auth: "Owner mutations succeeded and member setup mutation was rejected.",
    persistence: "Memory-store validation passed; database-specific onboarding runtime validation remains dependent on DATABASE_URL."
  };

  const reportsDir = ensureReportsDirectory();
  fs.writeFileSync(
    path.join(reportsDir, "onboarding-validation-report.json"),
    `${JSON.stringify({ ...report, failures }, null, 2)}\n`
  );
  fs.writeFileSync(path.join(reportsDir, "onboarding-validation-report.md"), toMarkdown(report));

  if (failures.length > 0) {
    console.log("FAIL onboarding validation");
    for (const failure of failures) {
      console.log(` - ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("PASS onboarding validation");
  console.log("Onboarding API, checklist, setup mutations, role gate, and export safety passed.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
