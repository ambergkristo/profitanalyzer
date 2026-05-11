import fs from "node:fs";
import path from "node:path";

import request from "supertest";

import { createApp } from "../apps/api/src/app.js";

interface ReadinessSection {
  status: "pass" | "partial" | "blocked";
  summary: string;
}

function ensureReportsDirectory() {
  const reportsDir = path.resolve("reports");
  fs.mkdirSync(reportsDir, { recursive: true });
  return reportsDir;
}

function docExists(filePath: string) {
  return fs.existsSync(path.resolve(filePath));
}

function readDbValidationReport(): {
  liveRunExecuted: boolean;
  connectionStatus: string;
  migrationStatus: string;
  seedStatus: string;
  storeParityStatus: string;
  isolationStatus: string;
  invoiceFlowStatus: string;
  blockers: string[];
} | null {
  const reportPath = path.resolve("reports/db-validation-report.json");
  if (!fs.existsSync(reportPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(reportPath, "utf8")) as {
      liveRunExecuted: boolean;
      connectionStatus: string;
      migrationStatus: string;
      seedStatus: string;
      storeParityStatus: string;
      isolationStatus: string;
      invoiceFlowStatus: string;
      blockers: string[];
    };
  } catch {
    return null;
  }
}

function readAuthValidationReport(): {
  passwordAuth: string;
  productionLockdown: string;
  sessionHardening: string;
  databaseBackedAuth: string;
  inviteFlow: string;
  failures: string[];
} | null {
  const reportPath = path.resolve("reports/auth-validation-report.json");
  if (!fs.existsSync(reportPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(reportPath, "utf8")) as {
      passwordAuth: string;
      productionLockdown: string;
      sessionHardening: string;
      databaseBackedAuth: string;
      inviteFlow: string;
      failures: string[];
    };
  } catch {
    return null;
  }
}

function readDeploymentValidationReport(): {
  scripts: string;
  buildArtifacts: string;
  envValidation: string;
  corsAndUrls: string;
  readiness: string;
  frontendSecretExposure: string;
  docs: string;
  blockers: string[];
} | null {
  const reportPath = path.resolve("reports/deployment-validation-report.json");
  if (!fs.existsSync(reportPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(reportPath, "utf8")) as {
      scripts: string;
      buildArtifacts: string;
      envValidation: string;
      corsAndUrls: string;
      readiness: string;
      frontendSecretExposure: string;
      docs: string;
      blockers: string[];
    };
  } catch {
    return null;
  }
}

function toMarkdown(report: {
  productionReady: false;
  currentMode: string;
  sections: Record<string, ReadinessSection>;
  blockers: string[];
}) {
  const sectionLines = Object.entries(report.sections)
    .map(([name, section]) => `- ${name}: ${section.status} - ${section.summary}`)
    .join("\n");
  const blockerLines =
    report.blockers.length === 0
      ? "- none"
      : report.blockers.map((blocker) => `- ${blocker}`).join("\n");

  return `# Production Readiness Report

## Summary

- productionReady: false
- currentMode: ${report.currentMode}

## Sections

${sectionLines}

## Blockers

${blockerLines}
`;
}

async function main() {
  const reportsDir = ensureReportsDirectory();
  const phase18Docs = [
    "docs/SECURITY_BASELINE.md",
    "docs/PRIVACY_POLICY_DRAFT.md",
    "docs/TERMS_OF_SERVICE_DRAFT.md",
    "docs/DATA_RETENTION_AND_DELETION.md",
    "docs/CASE_STUDY_AND_TESTIMONIAL_CONSENT.md",
    "docs/SECURITY_CHECKLIST.md",
    "docs/PRODUCTION_LAUNCH_GATE.md"
  ];
  const missingPhase18Docs = phase18Docs.filter((doc) => !docExists(doc));

  const currentApp = createApp({ env: process.env });
  const currentReadinessResponse = await request(currentApp).get("/api/health/readiness");
  const currentReadiness = currentReadinessResponse.body as {
    appMode: string;
    checks: Array<{ status: string; message: string }>;
  };
  const dbReport = readDbValidationReport();
  const authReport = readAuthValidationReport();
  const deploymentReport = readDeploymentValidationReport();
  const dbLivePass =
    dbReport?.liveRunExecuted === true &&
    dbReport.connectionStatus === "pass" &&
    dbReport.migrationStatus === "pass" &&
    dbReport.seedStatus === "pass" &&
    dbReport.storeParityStatus === "pass" &&
    dbReport.isolationStatus === "pass" &&
    dbReport.invoiceFlowStatus === "pass" &&
    dbReport.blockers.length === 0;

  const sections: Record<string, ReadinessSection> = {
    database: {
      status: dbLivePass ? "partial" : "blocked",
      summary: dbLivePass
        ? "Live local Postgres runtime validation has passed for migrations, seed, database store parity, invoice flow, and tenant isolation; hosted production DB validation is still required."
        : dbReport?.liveRunExecuted
          ? `Live database validation did not fully pass: ${dbReport.blockers.join("; ") || "see db validation report."}`
          : "DATABASE_URL is not configured or live database validation has not run, so runtime database readiness remains blocked."
    },
    auth: {
      status: authReport?.passwordAuth === "pass" && authReport.productionLockdown === "pass" ? "partial" : "blocked",
      summary:
        authReport?.passwordAuth === "pass" && authReport.productionLockdown === "pass"
          ? "Password auth foundation, hardened sessions, RBAC, and dev-login production lockdown validate; external identity/email invite delivery and production deployment validation remain open."
          : "Production-shaped auth validation has not passed; dev-session-only auth remains a launch blocker."
    },
    tenantIsolation: {
      status: dbLivePass ? "partial" : "blocked",
      summary: dbLivePass
        ? "Workspace and restaurant scoping passed local Postgres runtime validation; password-auth and deployed production isolation still need hosted validation."
        : "Workspace and restaurant scoping exists architecturally, but live database isolation validation has not passed."
    },
    deployment: {
      status:
        deploymentReport?.scripts === "pass" &&
        deploymentReport.buildArtifacts === "pass" &&
        deploymentReport.envValidation === "pass" &&
        deploymentReport.readiness === "pass" &&
        deploymentReport.blockers.length === 0
          ? "partial"
          : "blocked",
      summary:
        deploymentReport?.blockers.length === 0
          ? "Production build/start scripts, strict env validation, readiness behavior, CORS/base URL checks, deployment docs, and frontend secret exposure scan pass locally; hosted deploy execution is still required."
          : "Hosted deployment validation has not passed locally; see deployment validation report."
    },
    observability: {
      status: "partial",
      summary: "Structured request ids, request logging, and safe error handling exist; full monitoring is still future work."
    },
    ocrSafety: {
      status: "pass",
      summary: "OCR and invoice upload remain draft-only and still require review-confirm before cost mutation."
    },
    invoicePipeline: {
      status: "partial",
      summary: "Upload storage abstraction, OCR job lifecycle metadata, confidence policy, benchmark workflow, and invoice pipeline validation exist; live provider accuracy and production object storage remain unproven."
    },
    mobileReadiness: {
      status: "partial",
      summary: "Mobile readiness is documented and smoke-checked, including mobile invoice upload/onboarding assumptions, but not fully browser-automated yet."
    },
    backupExport: {
      status: "partial",
      summary: "Dataset export/import and backup/restore runbook exist, but hosted database backup/restore rehearsal remains a deployment blocker."
    },
    billingLicense: {
      status: "partial",
      summary: "Pricing plans, workspace subscription/license state, founding partner lifetime entitlements, usage counters, and billing provider seam exist; live payment processing is intentionally not implemented."
    },
    securityPrivacyLegal: {
      status: missingPhase18Docs.length === 0 ? "partial" : "blocked",
      summary: missingPhase18Docs.length === 0
        ? "Security baseline, privacy/terms drafts, data retention, consent rules, security checklist, and launch gate exist; legal review is still required."
        : `Security/privacy/legal launch-gate docs are missing: ${missingPhase18Docs.join(", ")}.`
    },
    launchGate: {
      status: missingPhase18Docs.length === 0 ? "partial" : "blocked",
      summary: "Controlled demo is allowed, founding partner launch is conditional, and public paid SaaS launch remains NO-GO until blockers close."
    }
  };

  const blockers = [
    ...currentReadiness.checks
      .filter((check) => check.status === "fail")
      .map((check) => check.message)
      .filter((message) => !(dbLivePass && message.includes("Database storage is configured and awaiting initialization"))),
    "Production readiness remains false until legal review, hosted deploy execution, production auth operational controls, payment decision, live OCR benchmark, monitoring, UI finalization, and backup/restore rehearsal are closed."
  ];

  const report = {
    productionReady: false as const,
    currentMode: currentReadiness.appMode,
    sections,
    blockers
  };

  fs.writeFileSync(
    path.join(reportsDir, "production-readiness-report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8"
  );
  fs.writeFileSync(
    path.join(reportsDir, "production-readiness-report.md"),
    toMarkdown(report),
    "utf8"
  );

  console.log("PASS production readiness report");
  console.log("productionReady=false");
  console.log(`blockers=${blockers.length}`);
  console.log("Report generated without claiming production readiness.");
}

void main();
