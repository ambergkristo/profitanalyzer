import request from "supertest";

import { createApp } from "../apps/api/src/app.js";

function assertCondition(condition: boolean, message: string, failures: string[]) {
  if (!condition) {
    failures.push(message);
  }
}

async function login(app: ReturnType<typeof createApp>, email: string, workspaceId?: string, role?: "owner" | "admin" | "member") {
  const response = await request(app).post("/api/auth/dev-login").send({
    email,
    workspaceId,
    role
  });

  if (response.status !== 200) {
    throw new Error(`Auth login failed for ${email}: ${response.status}`);
  }

  return response.body as {
    token: string;
    me: {
      activeWorkspaceId: string;
      activeRestaurantId: string;
    };
  };
}

async function main() {
  const failures: string[] = [];
  const pilotEnv = {
    ...process.env,
    APP_MODE: "pilot",
    AUTH_MODE: "dev",
    STORE_DRIVER: process.env.STORE_DRIVER?.trim() || "memory",
    SESSION_SECRET: "auth-validation-secret"
  };
  const app = createApp({ env: pilotEnv });

  const configResponse = await request(app).get("/api/app/config");
  assertCondition(configResponse.status === 200, "App config should load.", failures);
  assertCondition(configResponse.body.auth?.mode === "dev", "Auth mode should be dev.", failures);
  assertCondition(configResponse.body.auth?.required === true, "Pilot mode should require auth.", failures);
  assertCondition(JSON.stringify(configResponse.body).includes("auth-validation-secret") === false, "App config must not expose secrets.", failures);

  const unauthOverviewResponse = await request(app).get("/api/analytics/overview?dataset=pilot-workspace");
  assertCondition(unauthOverviewResponse.status === 401, "Protected overview should reject unauthenticated requests in pilot mode.", failures);

  const ownerLogin = await login(app, "owner@example.com", "workspace-pilot-workspace", "owner");
  const adminLogin = await login(app, "admin@example.com", "workspace-mixed-restaurant", "admin");
  const memberLogin = await login(app, "member@example.com", "workspace-mixed-restaurant", "member");

  const meResponse = await request(app)
    .get("/api/auth/me")
    .set("Authorization", `Bearer ${ownerLogin.token}`);
  assertCondition(meResponse.status === 200, "/api/auth/me should return user context.", failures);
  assertCondition(meResponse.body.activeRestaurantId === "pilot-workspace", "Owner login should resolve active restaurant context.", failures);

  const memberOverviewResponse = await request(app)
    .get("/api/analytics/overview?dataset=mixed-restaurant")
    .set("Authorization", `Bearer ${memberLogin.token}`);
  assertCondition(memberOverviewResponse.status === 200, "Members should be able to read analytics in their workspace.", failures);

  const crossWorkspaceResponse = await request(app)
    .get("/api/analytics/overview?dataset=high-margin-bistro")
    .set("Authorization", `Bearer ${memberLogin.token}`);
  assertCondition(crossWorkspaceResponse.status === 403, "Cross-workspace reads should be forbidden.", failures);

  const memberResetResponse = await request(app)
    .post("/api/datasets/mixed-restaurant/reset")
    .set("Authorization", `Bearer ${memberLogin.token}`)
    .send({});
  assertCondition(memberResetResponse.status === 403, "Members should not be allowed to reset datasets.", failures);

  const adminIngredientResponse = await request(app)
    .post("/api/ingredients?dataset=mixed-restaurant")
    .set("Authorization", `Bearer ${adminLogin.token}`)
    .send({
      name: "Auth Validation Ingredient",
      costPerUnitCents: 4,
      unit: "g"
    });
  assertCondition(adminIngredientResponse.status === 201, "Admins should be able to edit ingredient data.", failures);

  const memberUploadResponse = await request(app)
    .post("/api/ocr/invoices/upload?dataset=mixed-restaurant")
    .set("Authorization", `Bearer ${memberLogin.token}`)
    .attach("file", Buffer.from("fixture"), {
      filename: "clean-invoice-photo.jpg",
      contentType: "image/jpeg"
    });
  assertCondition(memberUploadResponse.status === 403, "Members should not be able to upload OCR invoices.", failures);

  const parseResponse = await request(app)
    .post("/api/invoices/parse-mock?dataset=mixed-restaurant")
    .set("Authorization", `Bearer ${adminLogin.token}`)
    .send({ sampleInvoiceId: "normal-supplier-invoice" });
  assertCondition(parseResponse.status === 200, "Admins should be able to create invoice drafts.", failures);

  const parsedInvoice = parseResponse.body as {
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

  const confirmPayload = {
    supplierId: parsedInvoice.invoiceDraft.supplierId,
    invoiceDate: parsedInvoice.invoiceDraft.invoiceDate,
    invoiceNumber: parsedInvoice.invoiceDraft.invoiceNumber,
    lines: parsedInvoice.lines.map((line) => ({
      lineId: line.id,
      reviewStatus: "confirmed",
      matchedIngredientId: line.matchedIngredientId,
      parsedQuantity: line.parsedQuantity,
      parsedUnit: line.parsedUnit,
      parsedUnitPriceCents: line.parsedUnitPriceCents ?? 1,
      parsedLineTotalCents: line.parsedLineTotalCents
    }))
  };

  const memberConfirmResponse = await request(app)
    .post(`/api/invoices/${parsedInvoice.invoiceDraft.id}/review-confirm?dataset=mixed-restaurant`)
    .set("Authorization", `Bearer ${memberLogin.token}`)
    .send(confirmPayload);
  assertCondition(memberConfirmResponse.status === 403, "Members should not be able to confirm invoice cost updates.", failures);

  const adminConfirmResponse = await request(app)
    .post(`/api/invoices/${parsedInvoice.invoiceDraft.id}/review-confirm?dataset=mixed-restaurant`)
    .set("Authorization", `Bearer ${adminLogin.token}`)
    .send(confirmPayload);
  assertCondition(adminConfirmResponse.status === 200, "Admins should be able to confirm invoice drafts.", failures);
  assertCondition(
    Array.isArray(adminConfirmResponse.body.costHistory) && adminConfirmResponse.body.costHistory.length > 0,
    "Invoice review-confirm safety path should still create cost history only after confirmation.",
    failures
  );

  const demoApp = createApp({
    env: {
      ...process.env,
      APP_MODE: "demo",
      AUTH_MODE: "dev"
    }
  });
  const demoOverviewResponse = await request(demoApp).get("/api/analytics/overview?dataset=mixed-restaurant");
  assertCondition(demoOverviewResponse.status === 200, "Demo mode should still work without login.", failures);

  if (failures.length > 0) {
    console.log("FAIL auth validation");
    for (const failure of failures) {
      console.log(` - ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("PASS auth validation");
  console.log("dev-login works and returns workspace context.");
  console.log("Protected endpoints reject unauthenticated access in pilot mode.");
  console.log("Role checks block member reset/OCR upload/invoice confirm while allowing admin edits.");
  console.log("Workspace isolation blocks cross-workspace reads.");
  console.log("Demo mode still works without login.");
  console.log("Invoice review-confirm safety remains unchanged under auth.");
}

void main();
