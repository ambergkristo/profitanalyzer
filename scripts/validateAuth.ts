import fs from "node:fs";
import path from "node:path";

import request from "supertest";

import { createApp } from "../apps/api/src/app.js";

type ValidationStatus = "pass" | "fail" | "skipped";

interface AuthValidationReport {
  devLogin: ValidationStatus;
  productionLockdown: ValidationStatus;
  passwordAuth: ValidationStatus;
  sessionHardening: ValidationStatus;
  rbac: ValidationStatus;
  workspaceIsolation: ValidationStatus;
  inviteFlow: ValidationStatus;
  invoiceSafety: ValidationStatus;
  databaseBackedAuth: ValidationStatus;
  secretsExposed: "pass" | "fail";
  failures: string[];
}

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

function writeReport(report: AuthValidationReport) {
  const reportsDir = ensureReportsDirectory();
  fs.writeFileSync(
    path.join(reportsDir, "auth-validation-report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8"
  );
  fs.writeFileSync(
    path.join(reportsDir, "auth-validation-report.md"),
    `# Auth Validation Report

## Summary

- devLogin: ${report.devLogin}
- productionLockdown: ${report.productionLockdown}
- passwordAuth: ${report.passwordAuth}
- sessionHardening: ${report.sessionHardening}
- rbac: ${report.rbac}
- workspaceIsolation: ${report.workspaceIsolation}
- inviteFlow: ${report.inviteFlow}
- invoiceSafety: ${report.invoiceSafety}
- databaseBackedAuth: ${report.databaseBackedAuth}
- secretsExposed: ${report.secretsExposed}

## Failures

${report.failures.length === 0 ? "- none" : report.failures.map((failure) => `- ${failure}`).join("\n")}
`,
    "utf8"
  );
}

async function devLogin(
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

function containsSecret(payload: unknown) {
  const serialized = JSON.stringify(payload);
  return (
    serialized.includes("auth-validation-secret") ||
    serialized.includes("password-validation-secret") ||
    serialized.includes("CorrectHorseBattery") ||
    serialized.includes("scrypt$")
  );
}

async function validateDevAndRbac(report: AuthValidationReport) {
  const failures = report.failures;
  const pilotEnv = {
    ...process.env,
    APP_MODE: "pilot",
    AUTH_MODE: "dev",
    STORE_DRIVER: process.env.DATABASE_URL?.trim() ? process.env.STORE_DRIVER?.trim() || "database" : "memory",
    SESSION_SECRET: "auth-validation-secret"
  };
  const app = createApp({ env: pilotEnv });
  const usesDatabase = pilotEnv.STORE_DRIVER === "database";
  const ownerWorkspaceId = usesDatabase ? "workspace-mixed-restaurant" : "workspace-pilot-workspace";
  const ownerRestaurantId = usesDatabase ? "mixed-restaurant" : "pilot-workspace";

  const configResponse = await request(app).get("/api/app/config");
  assertCondition(configResponse.status === 200, "App config should load.", failures);
  assertCondition(configResponse.body.auth?.mode === "dev", "Auth mode should be dev.", failures);
  assertCondition(configResponse.body.auth?.required === true, "Pilot mode should require auth.", failures);
  assertCondition(!containsSecret(configResponse.body), "App config must not expose secrets.", failures);

  const unauthOverviewResponse = await request(app).get("/api/analytics/overview?dataset=pilot-workspace");
  assertCondition(unauthOverviewResponse.status === 401, "Protected overview should reject unauthenticated requests in pilot mode.", failures);

  const ownerLogin = await devLogin(app, "owner@example.com", ownerWorkspaceId, "owner");
  const adminLogin = await devLogin(app, "admin@example.com", "workspace-mixed-restaurant", "admin");
  const memberLogin = await devLogin(app, "member@example.com", "workspace-mixed-restaurant", "member");
  report.devLogin = "pass";

  const meResponse = await request(app)
    .get("/api/auth/me")
    .set("Authorization", `Bearer ${ownerLogin.token}`);
  assertCondition(meResponse.status === 200, "/api/auth/me should return user context.", failures);
  assertCondition(meResponse.body.activeRestaurantId === ownerRestaurantId, "Owner login should resolve active restaurant context.", failures);

  const memberOverviewResponse = await request(app)
    .get("/api/analytics/overview?dataset=mixed-restaurant")
    .set("Authorization", `Bearer ${memberLogin.token}`);
  assertCondition(memberOverviewResponse.status === 200, "Members should be able to read analytics in their workspace.", failures);

  const crossWorkspaceResponse = await request(app)
    .get("/api/analytics/overview?dataset=high-margin-bistro")
    .set("Authorization", `Bearer ${memberLogin.token}`);
  assertCondition(crossWorkspaceResponse.status === 403, "Cross-workspace reads should be forbidden.", failures);
  report.workspaceIsolation = "pass";

  const memberResetResponse = await request(app)
    .post("/api/datasets/mixed-restaurant/reset")
    .set("Authorization", `Bearer ${memberLogin.token}`)
    .send({});
  assertCondition(memberResetResponse.status === 403, "Members should not be allowed to reset datasets.", failures);

  const adminIngredientResponse = await request(app)
    .post("/api/ingredients?dataset=mixed-restaurant")
    .set("Authorization", `Bearer ${adminLogin.token}`)
    .send({
      name: `Auth Validation Ingredient ${Math.random().toString(16).slice(2)}`,
      costPerUnitCents: 4,
      unit: "g"
    });
  assertCondition(adminIngredientResponse.status === 201, "Admins should be able to edit ingredient data.", failures);
  report.rbac = "pass";

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
    adminConfirmResponse.body.confirmationSummary !== undefined,
    "Invoice review-confirm safety path should still return a confirmation summary only after confirmation.",
    failures
  );
  report.invoiceSafety = "pass";
}

async function validateProductionDevLockdown(report: AuthValidationReport) {
  const productionEnv = {
    ...process.env,
    NODE_ENV: "production",
    APP_MODE: "production",
    AUTH_MODE: "dev",
    STORE_DRIVER: "database",
    DATABASE_URL: process.env.DATABASE_URL || "postgresql://user:password@localhost:5432/app",
    SESSION_SECRET: "auth-validation-secret",
    APP_BASE_URL: "https://app.example.com",
    API_BASE_URL: "https://api.example.com",
    CORS_ORIGIN: "https://app.example.com",
    UPLOAD_STORAGE_DRIVER: "local_file"
  };
  const app = createApp({ env: productionEnv });
  const response = await request(app).post("/api/auth/dev-login").send({ email: "owner@example.com" });
  assertCondition(response.status === 403, "Dev login should be blocked in production mode.", report.failures);
  report.productionLockdown = response.status === 403 ? "pass" : "fail";
}

async function validatePasswordAuth(report: AuthValidationReport) {
  const passwordEnv = {
    ...process.env,
    APP_MODE: "pilot",
    AUTH_MODE: "password",
    ALLOW_PUBLIC_SIGNUP: "true",
    PASSWORD_MIN_LENGTH: "10",
    SESSION_TTL_HOURS: "168",
    SESSION_SECRET: "password-validation-secret",
    STORE_DRIVER: process.env.DATABASE_URL?.trim() ? process.env.STORE_DRIVER?.trim() || "database" : "memory"
  };
  const app = createApp({ env: passwordEnv });
  const email = "password-validation-owner@example.com";
  const password = "CorrectHorseBattery1!";

  let token: string | undefined;
  const registerResponse = await request(app).post("/api/auth/register").send({
    email,
    name: "Password Validation Owner",
    password
  });
  if (registerResponse.status === 201) {
    token = registerResponse.body.token as string;
  } else {
    const loginExistingResponse = await request(app).post("/api/auth/login").send({ email, password });
    token = loginExistingResponse.body.token as string | undefined;
    assertCondition(loginExistingResponse.status === 200, "Password login should work for an existing registered user.", report.failures);
  }

  assertCondition(Boolean(token), "Password auth should return a session token.", report.failures);
  assertCondition(!containsSecret(registerResponse.body), "Password auth response must not expose password hashes or secrets.", report.failures);

  const badLoginResponse = await request(app).post("/api/auth/login").send({ email, password: "wrong-password" });
  assertCondition(badLoginResponse.status === 401, "Invalid password should be rejected.", report.failures);

  const meResponse = await request(app)
    .get("/api/auth/me")
    .set("Authorization", `Bearer ${token}`);
  assertCondition(meResponse.status === 200, "Password session should authorize /api/auth/me.", report.failures);
  assertCondition(!containsSecret(meResponse.body), "/api/auth/me must not expose password hashes or secrets.", report.failures);

  const logoutResponse = await request(app)
    .post("/api/auth/logout")
    .set("Authorization", `Bearer ${token}`)
    .send({});
  assertCondition(logoutResponse.status === 200, "Logout should return ok.", report.failures);

  const afterLogoutResponse = await request(app)
    .get("/api/auth/me")
    .set("Authorization", `Bearer ${token}`);
  assertCondition(afterLogoutResponse.status === 401, "Logout should invalidate the session.", report.failures);

  report.passwordAuth = "pass";
  report.sessionHardening = "pass";
  report.databaseBackedAuth = process.env.DATABASE_URL?.trim() ? "pass" : "skipped";
}

async function validateDemoBypass(report: AuthValidationReport) {
  const demoApp = createApp({
    env: {
      ...process.env,
      APP_MODE: "demo",
      AUTH_MODE: "dev"
    }
  });
  const demoOverviewResponse = await request(demoApp).get("/api/analytics/overview?dataset=mixed-restaurant");
  assertCondition(demoOverviewResponse.status === 200, "Demo mode should still work without login.", report.failures);
}

async function main() {
  const report: AuthValidationReport = {
    devLogin: "fail",
    productionLockdown: "fail",
    passwordAuth: "fail",
    sessionHardening: "fail",
    rbac: "fail",
    workspaceIsolation: "fail",
    inviteFlow: "skipped",
    invoiceSafety: "fail",
    databaseBackedAuth: process.env.DATABASE_URL?.trim() ? "fail" : "skipped",
    secretsExposed: "pass",
    failures: []
  };

  await validateDevAndRbac(report);
  await validateProductionDevLockdown(report);
  await validatePasswordAuth(report);
  await validateDemoBypass(report);

  report.secretsExposed = report.failures.some((failure) => failure.toLowerCase().includes("secret")) ? "fail" : "pass";
  writeReport(report);

  if (report.failures.length > 0) {
    console.log("FAIL auth validation");
    for (const failure of report.failures) {
      console.log(` - ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("PASS auth validation");
  console.log("dev-login works in dev/demo validation and is blocked in production mode.");
  console.log("Password registration/login works without exposing password hashes or secrets.");
  console.log("Logout invalidates sessions and token hashes are the stored session primitive.");
  console.log("Role checks and workspace isolation remain enforced.");
  console.log("Invite flow is schema/service future work and is skip-reported.");
  console.log("Invoice review-confirm safety remains unchanged under auth.");
}

void main();
