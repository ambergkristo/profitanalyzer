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

  const sections: Record<string, ReadinessSection> = {
    database: {
      status: process.env.DATABASE_URL?.trim() ? "partial" : "blocked",
      summary: process.env.DATABASE_URL?.trim()
        ? "Database driver exists, but live runtime validation is still environment-dependent."
        : "DATABASE_URL is not configured in this environment, so live database validation is skipped."
    },
    auth: {
      status: "partial",
      summary: "Dev-session auth, RBAC, and workspace scoping exist, but final production identity is not live."
    },
    tenantIsolation: {
      status: "partial",
      summary: "Workspace and restaurant scoping exist in the data and access layers, but production DB runtime is not fully proven here."
    },
    deployment: {
      status: "partial",
      summary: "Deployment profile, readiness endpoint, and runtime validation exist, but production rollout is not yet claimed."
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
      summary: "Dataset export/import exists, but full database backup strategy remains a deployment concern."
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
      .map((check) => check.message),
    "Production readiness remains false until legal review, live DB deployment, production auth, payment decision, live OCR benchmark, monitoring, and backup/restore gates are closed."
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
