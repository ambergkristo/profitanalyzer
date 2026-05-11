import fs from "node:fs";
import path from "node:path";

type Status = "pass" | "fail" | "warn" | "skipped";

interface HostedValidationReport {
  hostedValidationRan: boolean;
  hostedApiConfigured: boolean;
  hostedAppConfigured: boolean;
  productionReady: false;
  health: Status;
  deepHealth: Status;
  readiness: Status;
  cors: Status;
  appConfig: Status;
  auth: Status;
  analytics: Status;
  invoiceSafety: Status;
  billing: Status;
  secretExposure: Status;
  missingInputs: string[];
  blockers: string[];
  warnings: string[];
  notes: string[];
}

interface JsonResponse<T> {
  status: number;
  headers: Headers;
  body: T;
  text: string;
}

const sampleDataset = "mixed-restaurant";

function ensureReportsDirectory() {
  const reportsDir = path.resolve("reports");
  fs.mkdirSync(reportsDir, { recursive: true });
  return reportsDir;
}

function normalizeBaseUrl(value: string | undefined) {
  return value?.trim().replace(/\/+$/u, "") ?? "";
}

function buildUrl(baseUrl: string, route: string) {
  return `${baseUrl}${route.startsWith("/") ? route : `/${route}`}`;
}

function missingHostedInputs() {
  const missing: string[] = [];
  if (process.env.HOSTED_SMOKE_ENABLED !== "true") {
    missing.push("HOSTED_SMOKE_ENABLED=true");
  }
  if (!normalizeBaseUrl(process.env.HOSTED_API_BASE_URL)) {
    missing.push("HOSTED_API_BASE_URL");
  }
  if (!normalizeBaseUrl(process.env.HOSTED_APP_BASE_URL)) {
    missing.push("HOSTED_APP_BASE_URL");
  }
  return missing;
}

async function getJson<T>(url: string, token?: string): Promise<JsonResponse<T>> {
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined
  });
  const text = await response.text();
  return {
    status: response.status,
    headers: response.headers,
    body: text ? JSON.parse(text) as T : {} as T,
    text
  };
}

async function postJson<T>(
  url: string,
  body: unknown,
  token?: string
): Promise<JsonResponse<T>> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  return {
    status: response.status,
    headers: response.headers,
    body: text ? JSON.parse(text) as T : {} as T,
    text
  };
}

function responseHasSecretLeak(text: string) {
  const hostedPassword = process.env.HOSTED_TEST_PASSWORD;
  const explicitSecrets = [
    hostedPassword,
    process.env.SESSION_SECRET,
    process.env.DATABASE_URL,
    process.env.OCR_PROVIDER_API_KEY,
    process.env.BILLING_PROVIDER_SECRET_KEY,
    process.env.BILLING_WEBHOOK_SECRET
  ].filter((value): value is string => Boolean(value && value.length > 0));

  return explicitSecrets.some((secret) => text.includes(secret)) ||
    /postgres(?:ql)?:\/\/[^"'\s]+/iu.test(text) ||
    /sk-[A-Za-z0-9_-]{20,}/u.test(text) ||
    /bearer\s+[A-Za-z0-9._-]{20,}/iu.test(text);
}

function writeReport(report: HostedValidationReport) {
  const reportsDir = ensureReportsDirectory();
  fs.writeFileSync(
    path.join(reportsDir, "hosted-validation-report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8"
  );

  fs.writeFileSync(
    path.join(reportsDir, "hosted-validation-report.md"),
    `# Hosted Validation Report

## Summary

- hostedValidationRan: ${report.hostedValidationRan}
- hostedApiConfigured: ${report.hostedApiConfigured}
- hostedAppConfigured: ${report.hostedAppConfigured}
- productionReady: false

## Checks

- health: ${report.health}
- deepHealth: ${report.deepHealth}
- readiness: ${report.readiness}
- cors: ${report.cors}
- appConfig: ${report.appConfig}
- auth: ${report.auth}
- analytics: ${report.analytics}
- invoiceSafety: ${report.invoiceSafety}
- billing: ${report.billing}
- secretExposure: ${report.secretExposure}

## Missing Inputs

${report.missingInputs.length === 0 ? "- none" : report.missingInputs.map((input) => `- ${input}`).join("\n")}

## Blockers

${report.blockers.length === 0 ? "- none" : report.blockers.map((blocker) => `- ${blocker}`).join("\n")}

## Warnings

${report.warnings.length === 0 ? "- none" : report.warnings.map((warning) => `- ${warning}`).join("\n")}

## Notes

${report.notes.length === 0 ? "- none" : report.notes.map((note) => `- ${note}`).join("\n")}
`,
    "utf8"
  );
}

function skippedReport(missingInputs: string[]): HostedValidationReport {
  return {
    hostedValidationRan: false,
    hostedApiConfigured: Boolean(normalizeBaseUrl(process.env.HOSTED_API_BASE_URL)),
    hostedAppConfigured: Boolean(normalizeBaseUrl(process.env.HOSTED_APP_BASE_URL)),
    productionReady: false,
    health: "skipped",
    deepHealth: "skipped",
    readiness: "skipped",
    cors: "skipped",
    appConfig: "skipped",
    auth: "skipped",
    analytics: "skipped",
    invoiceSafety: "skipped",
    billing: "skipped",
    secretExposure: "skipped",
    missingInputs,
    blockers: [],
    warnings: ["Hosted smoke validation did not run because hosted environment inputs were not provided."],
    notes: ["Set HOSTED_SMOKE_ENABLED=true, HOSTED_API_BASE_URL, HOSTED_APP_BASE_URL, HOSTED_TEST_EMAIL, and HOSTED_TEST_PASSWORD to run hosted smoke checks."]
  };
}

function addFailure(report: HostedValidationReport, key: keyof HostedValidationReport, message: string) {
  report.blockers.push(message);
  if (typeof report[key] === "string") {
    (report[key] as Status) = "fail";
  }
}

async function main() {
  const missingInputs = missingHostedInputs();
  if (missingInputs.length > 0) {
    const report = skippedReport(missingInputs);
    writeReport(report);
    console.log("SKIPPED_HOSTED_VALIDATION");
    console.log(`missing=${missingInputs.join(", ")}`);
    return;
  }

  const apiBaseUrl = normalizeBaseUrl(process.env.HOSTED_API_BASE_URL);
  const appBaseUrl = normalizeBaseUrl(process.env.HOSTED_APP_BASE_URL);
  const testEmail = process.env.HOSTED_TEST_EMAIL;
  const testPassword = process.env.HOSTED_TEST_PASSWORD;
  const report: HostedValidationReport = {
    hostedValidationRan: true,
    hostedApiConfigured: true,
    hostedAppConfigured: true,
    productionReady: false,
    health: "fail",
    deepHealth: "fail",
    readiness: "fail",
    cors: "fail",
    appConfig: "fail",
    auth: "fail",
    analytics: "fail",
    invoiceSafety: "fail",
    billing: "fail",
    secretExposure: "fail",
    missingInputs: [],
    blockers: [],
    warnings: [],
    notes: ["Hosted URLs are intentionally omitted from this report to avoid leaking deployment details."]
  };

  if (!testEmail || !testPassword) {
    report.missingInputs.push("HOSTED_TEST_EMAIL", "HOSTED_TEST_PASSWORD");
    addFailure(report, "auth", "Hosted auth smoke requires HOSTED_TEST_EMAIL and HOSTED_TEST_PASSWORD.");
    writeReport(report);
    console.log("FAIL hosted validation");
    console.log(" - Hosted auth smoke requires HOSTED_TEST_EMAIL and HOSTED_TEST_PASSWORD.");
    process.exitCode = 1;
    return;
  }

  try {
    const health = await getJson<Record<string, unknown>>(buildUrl(apiBaseUrl, "/health"));
    report.health = health.status === 200 ? "pass" : "fail";
    if (health.status !== 200) {
      report.blockers.push(`Hosted /health returned HTTP ${health.status}.`);
    }

    const deepHealth = await getJson<Record<string, unknown>>(buildUrl(apiBaseUrl, "/api/health/deep"));
    report.deepHealth = deepHealth.status === 200 ? "pass" : "fail";
    if (deepHealth.status !== 200) {
      report.blockers.push(`Hosted /api/health/deep returned HTTP ${deepHealth.status}.`);
    }

    const readiness = await getJson<{ appMode?: string; productionReady?: boolean; ok?: boolean }>(
      buildUrl(apiBaseUrl, "/api/health/readiness")
    );
    const readinessText = JSON.stringify(readiness.body);
    report.readiness =
      readiness.status === 200 &&
      readiness.body.appMode === "production" &&
      readiness.body.productionReady === false
        ? "pass"
        : "fail";
    if (report.readiness === "fail") {
      report.blockers.push("Hosted readiness must respond with appMode=production and productionReady=false.");
    }
    if (responseHasSecretLeak(readinessText)) {
      report.blockers.push("Hosted readiness response exposed secret-like values.");
      report.secretExposure = "fail";
    }

    const corsResponse = await fetch(buildUrl(apiBaseUrl, "/api/app/config"), {
      method: "OPTIONS",
      headers: {
        Origin: appBaseUrl,
        "Access-Control-Request-Method": "GET"
      }
    });
    const allowOrigin = corsResponse.headers.get("access-control-allow-origin");
    report.cors = allowOrigin === appBaseUrl ? "pass" : "fail";
    if (report.cors === "fail") {
      report.blockers.push("Hosted CORS did not allow the configured frontend origin.");
    }

    const config = await getJson<Record<string, unknown>>(buildUrl(apiBaseUrl, "/api/app/config"));
    report.appConfig = config.status === 200 && !responseHasSecretLeak(JSON.stringify(config.body)) ? "pass" : "fail";
    if (report.appConfig === "fail") {
      report.blockers.push("Hosted app config failed or exposed secret-like values.");
    }

    const devLogin = await postJson<Record<string, unknown>>(
      buildUrl(apiBaseUrl, "/api/auth/dev-login"),
      { email: testEmail }
    );
    const login = await postJson<{ token?: string }>(
      buildUrl(apiBaseUrl, "/api/auth/login"),
      { email: testEmail, password: testPassword }
    );
    const token = login.body.token;
    report.auth = devLogin.status === 403 && login.status === 200 && Boolean(token) ? "pass" : "fail";
    if (report.auth === "fail") {
      report.blockers.push("Hosted auth smoke failed: dev-login must be blocked and password login must succeed.");
    }

    if (token) {
      const analytics = await getJson<Record<string, unknown>>(
        buildUrl(apiBaseUrl, `/api/analytics/overview?dataset=${sampleDataset}`),
        token
      );
      report.analytics = analytics.status === 200 ? "pass" : "fail";
      if (analytics.status !== 200) {
        report.blockers.push(`Hosted analytics returned HTTP ${analytics.status}.`);
      }

      const billing = await getJson<Record<string, unknown>>(
        buildUrl(apiBaseUrl, `/api/billing/status?dataset=${sampleDataset}`),
        token
      );
      report.billing = billing.status === 200 ? "pass" : "fail";
      if (billing.status !== 200) {
        report.blockers.push(`Hosted billing status returned HTTP ${billing.status}.`);
      }

      const blockedConfirm = await postJson<Record<string, unknown>>(
        buildUrl(apiBaseUrl, `/api/invoices/messy-supplier-invoice-02/review-confirm?dataset=${sampleDataset}`),
        { reviewedLines: [] },
        token
      );
      report.invoiceSafety = blockedConfirm.status === 400 || blockedConfirm.status === 409 ? "pass" : "fail";
      if (report.invoiceSafety === "fail") {
        report.blockers.push("Hosted invoice safety smoke did not block unsafe review-confirm.");
      }
    }

    report.secretExposure =
      report.secretExposure === "fail" ? "fail" : "pass";
  } catch (error) {
    report.blockers.push(error instanceof Error ? error.message : "Hosted smoke validation failed unexpectedly.");
  }

  writeReport(report);

  if (report.blockers.length > 0) {
    console.log("FAIL hosted validation");
    for (const blocker of report.blockers) {
      console.log(` - ${blocker}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("PASS hosted validation");
  console.log("Hosted health, readiness, CORS, auth, analytics, billing, and invoice safety smoke passed.");
  console.log("productionReady=false remains intentional.");
}

void main();
