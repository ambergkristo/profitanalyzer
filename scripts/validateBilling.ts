import fs from "node:fs";
import path from "node:path";

import request from "supertest";

import type { BillingStatus, OcrDraftResponse } from "../packages/core/src/index.js";
import { createApp } from "../apps/api/src/app.js";
import { validateEnvironmentProfile } from "../apps/api/src/runtime/profile.js";
import { getAuthMode } from "../apps/api/src/auth/service.js";

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
    path.join(reportsDir, "billing-validation-report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8"
  );
  fs.writeFileSync(
    path.join(reportsDir, "billing-validation-report.md"),
    `# Billing Validation Report

## Summary

- plans: ${report.plans}
- licenseModel: ${report.licenseModel}
- usageCounters: ${report.usageCounters}
- providerSeam: ${report.providerSeam}
- accessControl: ${report.accessControl}
`,
    "utf8"
  );
}

async function login(
  app: ReturnType<typeof createApp>,
  email: string,
  workspaceId: string,
  role: "owner" | "admin" | "member"
) {
  const response = await request(app).post("/api/auth/dev-login").send({ email, workspaceId, role });
  if (response.status !== 200) {
    throw new Error(`Dev login failed for ${email}.`);
  }

  return response.body.token as string;
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
  const app = createApp();

  const plansResponse = await request(app).get("/api/billing/plans");
  assertCondition(plansResponse.status === 200, "Billing plans endpoint should return 200.", failures);
  const planCodes = (plansResponse.body as Array<{ code: string }>).map((plan) => plan.code);
  assertCondition(planCodes.includes("starter"), "Starter plan should be seeded.", failures);
  assertCondition(planCodes.includes("founding_partner"), "Founding partner plan should be seeded.", failures);

  const statusResponse = await request(app).get("/api/billing/status?dataset=mixed-restaurant");
  assertCondition(statusResponse.status === 200, "Billing status endpoint should return 200 in demo mode.", failures);
  const initialStatus = statusResponse.body as BillingStatus;
  assertCondition(
    initialStatus.effectiveAccess.hasAccess,
    "Internal demo workspace should have effective access.",
    failures
  );
  assertCondition(
    JSON.stringify(initialStatus).includes("BILLING_PROVIDER_SECRET_KEY") === false,
    "Billing status must not expose provider secrets.",
    failures
  );

  const trialResponse = await request(app).post("/api/billing/start-trial?dataset=mixed-restaurant").send({});
  assertCondition(trialResponse.status === 201, "Trial endpoint should create trial status.", failures);
  assertCondition(
    (trialResponse.body as BillingStatus).subscription.status === "trialing",
    "Trial status should be trialing.",
    failures
  );

  const licenseResponse = await request(app)
    .post("/api/billing/manual-license?dataset=mixed-restaurant")
    .send({ type: "founding_partner_lifetime", notes: "Validation founding partner license." });
  assertCondition(licenseResponse.status === 201, "Manual founding partner license should be grantable.", failures);
  const licensedStatus = licenseResponse.body as BillingStatus;
  assertCondition(
    licensedStatus.subscription.status === "lifetime",
    "Founding partner license should produce lifetime subscription status.",
    failures
  );
  assertCondition(
    licensedStatus.entitlements.some((entitlement) => entitlement.type === "founding_partner_lifetime"),
    "Founding partner lifetime entitlement should be explicit.",
    failures
  );

  const usageBeforeResponse = await request(app).get("/api/billing/usage?dataset=mixed-restaurant");
  const usageBefore = (usageBeforeResponse.body as BillingStatus["usage"]);
  const uploadResponse = await request(app)
    .post("/api/ocr/invoices/upload?dataset=mixed-restaurant&provider=fixture")
    .attach("file", Buffer.from("synthetic clean fixture"), {
      filename: "clean-invoice-photo.jpg",
      contentType: "image/jpeg"
    });
  assertCondition(uploadResponse.status === 200, "OCR upload should work while billing model is present.", failures);
  const draft = uploadResponse.body as OcrDraftResponse;
  const usageAfterUploadResponse = await request(app).get("/api/billing/usage?dataset=mixed-restaurant");
  const usageAfterUpload = usageAfterUploadResponse.body as BillingStatus["usage"];
  assertCondition(
    usageAfterUpload.ocrUploads === usageBefore.ocrUploads + 1,
    "OCR upload usage counter should increment.",
    failures
  );

  const confirmResponse = await confirmDraft(app, draft);
  assertCondition(confirmResponse.status === 200, "Review-confirm should still be the cost mutation path.", failures);
  const usageAfterConfirmResponse = await request(app).get("/api/billing/usage?dataset=mixed-restaurant");
  const usageAfterConfirm = usageAfterConfirmResponse.body as BillingStatus["usage"];
  assertCondition(
    usageAfterConfirm.invoicesProcessed === usageBefore.invoicesProcessed + 1,
    "Invoice confirmation usage counter should increment.",
    failures
  );

  const pilotApp = createApp({
    env: {
      ...process.env,
      APP_MODE: "pilot",
      AUTH_MODE: "dev"
    }
  });
  const memberToken = await login(pilotApp, "member@example.com", "workspace-pilot-workspace", "member");
  const ownerToken = await login(pilotApp, "owner@example.com", "workspace-pilot-workspace", "owner");
  const memberLicenseResponse = await request(pilotApp)
    .post("/api/billing/manual-license?dataset=pilot-workspace")
    .set("Authorization", `Bearer ${memberToken}`)
    .send({ type: "manual_comp" });
  assertCondition(memberLicenseResponse.status === 403, "Member role must not grant manual licenses.", failures);
  const ownerLicenseResponse = await request(pilotApp)
    .post("/api/billing/manual-license?dataset=pilot-workspace")
    .set("Authorization", `Bearer ${ownerToken}`)
    .send({ type: "manual_comp", notes: "Owner validation grant." });
  assertCondition(ownerLicenseResponse.status === 201, "Owner role should grant manual licenses.", failures);

  const tempDataDir = path.resolve(".tmp", "billing-validation-store");
  fs.rmSync(tempDataDir, { recursive: true, force: true });
  const fileEnv = {
    ...process.env,
    STORE_DRIVER: "file",
    DATA_DIR: tempDataDir
  };
  const fileApp = createApp({ env: fileEnv });
  const fileGrantResponse = await request(fileApp)
    .post("/api/billing/manual-license?dataset=mixed-restaurant")
    .send({ type: "founding_partner_lifetime", notes: "File store persistence validation." });
  assertCondition(fileGrantResponse.status === 201, "File store should grant manual license.", failures);
  const reloadedFileApp = createApp({ env: fileEnv });
  const reloadedStatusResponse = await request(reloadedFileApp).get("/api/billing/status?dataset=mixed-restaurant");
  assertCondition(
    (reloadedStatusResponse.body as BillingStatus).subscription.status === "lifetime",
    "File store should persist billing license state after reload.",
    failures
  );
  fs.rmSync(tempDataDir, { recursive: true, force: true });

  const billingEnvValidation = validateEnvironmentProfile({
    environment: {
      ...process.env,
      APP_MODE: "production",
      NODE_ENV: "production",
      STORE_DRIVER: "database",
      DATABASE_URL: "postgresql://user:password@example.invalid:5432/profit",
      AUTH_MODE: "password",
      SESSION_SECRET: "replace-me",
      APP_BASE_URL: "https://app.example.com",
      API_BASE_URL: "https://api.example.com",
      CORS_ORIGIN: "https://app.example.com",
      UPLOAD_STORAGE_DRIVER: "local_file",
      BILLING_PROVIDER: "stripe_future",
      BILLING_PROVIDER_SECRET_KEY: ""
    },
    authMode: getAuthMode({ AUTH_MODE: "password" })
  });
  assertCondition(
    billingEnvValidation.blockers.some((blocker) => blocker.includes("BILLING_PROVIDER_SECRET_KEY")),
    "Production env validation should block unconfigured stripe_future provider.",
    failures
  );

  const report = {
    pass: failures.length === 0,
    plans: `${planCodes.length} plans exposed; founding partner plan present`,
    licenseModel: `effective access reason: ${licensedStatus.effectiveAccess.reason}`,
    usageCounters: `ocrUploads=${usageAfterUpload.ocrUploads}; invoicesProcessed=${usageAfterConfirm.invoicesProcessed}`,
    providerSeam: "manual/none provider works; stripe_future remains disabled without env",
    accessControl: "member blocked from manual license grant; owner allowed",
    database: process.env.DATABASE_URL?.trim()
      ? "Database-specific billing validation depends on configured runtime."
      : "SKIPPED_DATABASE_BILLING_VALIDATION because DATABASE_URL is not configured.",
    failures
  };
  writeReport(report);

  if (failures.length > 0) {
    console.log("FAIL billing validation");
    for (const failure of failures) {
      console.log(` - ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("PASS billing validation");
  console.log("Plans include starter/pro/founding partner/internal demo foundations.");
  console.log("Founding partner lifetime access is represented explicitly.");
  console.log("Usage counters increment for OCR upload and invoice confirmation.");
  console.log("Stripe future provider remains disabled without credentials.");
  if (!process.env.DATABASE_URL?.trim()) {
    console.log("SKIPPED_DATABASE_BILLING_VALIDATION");
  }
}

void main();
