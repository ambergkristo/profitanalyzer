import fs from "node:fs";
import path from "node:path";

import request from "supertest";

import { createApp } from "../apps/api/src/app.js";
import { getAuthMode } from "../apps/api/src/auth/service.js";
import { validateEnvironmentProfile } from "../apps/api/src/runtime/profile.js";

type Status = "pass" | "fail" | "warn" | "skipped";

interface DeploymentReport {
  scripts: Status;
  buildArtifacts: Status;
  envValidation: Status;
  corsAndUrls: Status;
  readiness: Status;
  frontendSecretExposure: Status;
  docs: Status;
  productionReady: false;
  blockers: string[];
  warnings: string[];
}

const requiredDocs = [
  "docs/HOSTED_DEPLOYMENT_PLAN.md",
  "docs/HOSTED_DEPLOYMENT_EXECUTION.md",
  "docs/PRODUCTION_MIGRATION_RUNBOOK.md",
  "docs/BACKUP_RESTORE_RUNBOOK.md",
  "docs/DEPLOYMENT_READINESS.md",
  "docs/PRODUCTION_RUNBOOK.md"
];

function readJson(filePath: string) {
  return JSON.parse(fs.readFileSync(path.resolve(filePath), "utf8")) as {
    scripts?: Record<string, string>;
  };
}

function exists(filePath: string) {
  return fs.existsSync(path.resolve(filePath));
}

function ensureReportsDirectory() {
  const reportsDir = path.resolve("reports");
  fs.mkdirSync(reportsDir, { recursive: true });
  return reportsDir;
}

function walkFiles(directory: string, files: string[] = []) {
  if (!fs.existsSync(directory)) {
    return files;
  }

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, files);
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

function scanFrontendBundleForSecretNames() {
  const distDir = path.resolve("apps/web/dist");
  const forbidden = [
    "DATABASE_URL",
    "SESSION_SECRET",
    "OIDC_CLIENT_SECRET",
    "OCR_PROVIDER_API_KEY",
    "BILLING_PROVIDER_SECRET_KEY",
    "BILLING_WEBHOOK_SECRET"
  ];

  for (const filePath of walkFiles(distDir)) {
    const content = fs.readFileSync(filePath, "utf8");
    const found = forbidden.find((token) => content.includes(token));
    if (found) {
      return found;
    }
  }

  return null;
}

function writeReport(report: DeploymentReport) {
  const reportsDir = ensureReportsDirectory();
  fs.writeFileSync(
    path.join(reportsDir, "deployment-validation-report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8"
  );

  fs.writeFileSync(
    path.join(reportsDir, "deployment-validation-report.md"),
    `# Deployment Validation Report

## Summary

- scripts: ${report.scripts}
- buildArtifacts: ${report.buildArtifacts}
- envValidation: ${report.envValidation}
- corsAndUrls: ${report.corsAndUrls}
- readiness: ${report.readiness}
- frontendSecretExposure: ${report.frontendSecretExposure}
- docs: ${report.docs}
- productionReady: false

## Blockers

${report.blockers.length === 0 ? "- none" : report.blockers.map((blocker) => `- ${blocker}`).join("\n")}

## Warnings

${report.warnings.length === 0 ? "- none" : report.warnings.map((warning) => `- ${warning}`).join("\n")}
`,
    "utf8"
  );
}

function validateScripts(report: DeploymentReport) {
  const rootPackage = readJson("package.json");
  const requiredScripts = [
    "build",
    "build:production",
    "start:api",
    "preview:web",
    "validate:deployment",
    "validate:hosted",
    "db:migrate",
    "db:seed",
    "db:deploy:migrate",
    "db:deploy:seed",
    "validate:db"
  ];
  const missing = requiredScripts.filter((script) => !rootPackage.scripts?.[script]);
  if (missing.length > 0) {
    report.blockers.push(`Missing package scripts: ${missing.join(", ")}.`);
    report.scripts = "fail";
    return;
  }

  report.scripts = "pass";
}

function validateBuildArtifacts(report: DeploymentReport) {
  const requiredArtifacts = [
    "apps/api/dist/index.js",
    "apps/web/dist/index.html"
  ];
  const missing = requiredArtifacts.filter((artifact) => !exists(artifact));
  if (missing.length > 0) {
    report.blockers.push(`Missing production build artifacts. Run npm run build first: ${missing.join(", ")}.`);
    report.buildArtifacts = "fail";
    return;
  }

  report.buildArtifacts = "pass";
}

function validateEnvRules(report: DeploymentReport) {
  const unsafeResult = validateEnvironmentProfile({
    environment: {
      NODE_ENV: "production",
      APP_MODE: "production",
      AUTH_MODE: "dev",
      STORE_DRIVER: "memory",
      OCR_PROVIDER: "fixture",
      UPLOAD_STORAGE_DRIVER: "memory",
      CORS_ORIGIN: "*"
    },
    authMode: "dev"
  });

  if (unsafeResult.ok) {
    report.blockers.push("Unsafe production profile unexpectedly passed environment validation.");
    report.envValidation = "fail";
    return;
  }

  const safeProfile = {
    NODE_ENV: "production",
    APP_MODE: "production",
    AUTH_MODE: "password",
    SESSION_SECRET: "deployment-validation-session-secret",
    STORE_DRIVER: "database",
    DATABASE_URL: "postgresql://deploy_user:deploy_pass@db.example.com:5432/profit_analyzer",
    APP_BASE_URL: "https://app.example.com",
    API_BASE_URL: "https://api.example.com",
    CORS_ORIGIN: "https://app.example.com",
    OCR_PROVIDER: "disabled",
    UPLOAD_STORAGE_DRIVER: "local_file",
    UPLOAD_DATA_DIR: "/var/lib/profit-analyzer/uploads",
    BILLING_PROVIDER: "manual",
    LOG_LEVEL: "info"
  };
  const safeResult = validateEnvironmentProfile({
    environment: safeProfile,
    authMode: "password"
  });

  if (!safeResult.ok) {
    report.blockers.push(`Strict production-like profile failed validation: ${safeResult.blockers.join("; ")}.`);
    report.envValidation = "fail";
    return;
  }

  if (!safeResult.checks.some((check) => check.name === "cors_origin" && check.status === "pass")) {
    report.blockers.push("CORS_ORIGIN did not pass in the strict production-like profile.");
    report.corsAndUrls = "fail";
  } else {
    report.corsAndUrls = "pass";
  }

  report.warnings.push(...safeResult.warnings);
  report.envValidation = "pass";
}

async function validateReadiness(report: DeploymentReport) {
  const unsafeApp = createApp({
    env: {
      NODE_ENV: "production",
      APP_MODE: "production",
      AUTH_MODE: "dev",
      STORE_DRIVER: "memory",
      OCR_PROVIDER: "fixture",
      UPLOAD_STORAGE_DRIVER: "memory",
      SESSION_SECRET: "deployment-validation-session-secret"
    }
  });
  const readinessResponse = await request(unsafeApp).get("/api/health/readiness");
  const serialized = JSON.stringify(readinessResponse.body);

  if (readinessResponse.status !== 200 || readinessResponse.body.ok !== false) {
    report.blockers.push("Unsafe production readiness check should return ok=false.");
    report.readiness = "fail";
    return;
  }

  if (
    serialized.includes("deployment-validation-session-secret") ||
    serialized.includes("postgresql://")
  ) {
    report.blockers.push("Readiness response exposed secret-like deployment values.");
    report.readiness = "fail";
    return;
  }

  if (readinessResponse.body.productionReady !== false) {
    report.blockers.push("Readiness endpoint must not claim productionReady=true.");
    report.readiness = "fail";
    return;
  }

  report.readiness = "pass";
}

function validateFrontendBundle(report: DeploymentReport) {
  const exposed = scanFrontendBundleForSecretNames();
  if (exposed) {
    report.blockers.push(`Frontend production bundle includes forbidden secret env name: ${exposed}.`);
    report.frontendSecretExposure = "fail";
    return;
  }

  report.frontendSecretExposure = "pass";
}

function validateDocs(report: DeploymentReport) {
  const missing = requiredDocs.filter((doc) => !exists(doc));
  if (missing.length > 0) {
    report.blockers.push(`Missing deployment docs: ${missing.join(", ")}.`);
    report.docs = "fail";
    return;
  }

  report.docs = "pass";
}

async function main() {
  const report: DeploymentReport = {
    scripts: "fail",
    buildArtifacts: "fail",
    envValidation: "fail",
    corsAndUrls: "fail",
    readiness: "fail",
    frontendSecretExposure: "fail",
    docs: "fail",
    productionReady: false,
    blockers: [],
    warnings: []
  };

  validateScripts(report);
  validateBuildArtifacts(report);
  validateEnvRules(report);
  await validateReadiness(report);
  validateFrontendBundle(report);
  validateDocs(report);

  writeReport(report);

  if (report.blockers.length > 0) {
    console.log("FAIL deployment validation");
    for (const blocker of report.blockers) {
      console.log(` - ${blocker}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("PASS deployment validation");
  console.log("Production scripts, build artifacts, env validation, readiness behavior, CORS/base URLs, and docs passed.");
  console.log("productionReady=false remains intentional.");
  console.log(`authMode=${getAuthMode({ AUTH_MODE: "password" })}`);
}

void main();
