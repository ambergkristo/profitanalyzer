import fs from "node:fs";
import path from "node:path";

const requiredDocs = [
  "docs/SECURITY_BASELINE.md",
  "docs/PRIVACY_POLICY_DRAFT.md",
  "docs/TERMS_OF_SERVICE_DRAFT.md",
  "docs/DATA_RETENTION_AND_DELETION.md",
  "docs/CASE_STUDY_AND_TESTIMONIAL_CONSENT.md",
  "docs/SECURITY_CHECKLIST.md",
  "docs/PRODUCTION_LAUNCH_GATE.md"
];

const ignoredPathFragments = [
  "node_modules",
  ".git",
  "dist",
  "coverage",
  "docs",
  "reports",
  "test",
  "scripts/validateLaunchGate.ts",
  "reports/ui-screenshots",
  "profitanalyzer"
];

function read(filePath: string) {
  return fs.readFileSync(path.resolve(filePath), "utf8");
}

function ensureReportsDirectory() {
  const reportsDir = path.resolve("reports");
  fs.mkdirSync(reportsDir, { recursive: true });
  return reportsDir;
}

function walkFiles(dir: string, files: string[] = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    const normalized = fullPath.replaceAll("\\", "/");
    if (ignoredPathFragments.some((fragment) => normalized.includes(fragment))) {
      continue;
    }
    if (entry.isDirectory()) {
      walkFiles(fullPath, files);
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

function hasPrivateFiles() {
  const privateDirs = [
    "benchmarks/ocr/private-samples",
    "benchmarks/ocr/private-results",
    ".uploads",
    "uploads"
  ];

  return privateDirs.some((dir) => {
    const fullPath = path.resolve(dir);
    return fs.existsSync(fullPath) && walkFiles(fullPath).length > 0;
  });
}

function main() {
  const failures: string[] = [];
  for (const doc of requiredDocs) {
    if (!fs.existsSync(path.resolve(doc))) {
      failures.push(`Missing required launch-gate doc: ${doc}`);
    }
  }

  const privacy = read("docs/PRIVACY_POLICY_DRAFT.md");
  const terms = read("docs/TERMS_OF_SERVICE_DRAFT.md");
  const retention = read("docs/DATA_RETENTION_AND_DELETION.md");
  const consent = read("docs/CASE_STUDY_AND_TESTIMONIAL_CONSENT.md");
  const checklist = read("docs/SECURITY_CHECKLIST.md");
  const gate = read("docs/PRODUCTION_LAUNCH_GATE.md");
  const readiness = fs.existsSync(path.resolve("reports/production-readiness-report.json"))
    ? JSON.parse(read("reports/production-readiness-report.json")) as { productionReady?: boolean; sections?: Record<string, unknown> }
    : null;

  if (!gate.includes("Public paid SaaS launch: NO-GO")) {
    failures.push("Production launch gate must keep public paid SaaS launch as NO-GO while blockers remain.");
  }
  if (!gate.includes("Controlled demo: YES") || !gate.includes("Founding partner controlled launch: CONDITIONAL")) {
    failures.push("Launch gate must separate controlled demo, founding partner, and public SaaS statuses.");
  }
  if (readiness?.productionReady !== false) {
    failures.push("Production readiness report must keep productionReady=false.");
  }
  if (!readiness?.sections || !("securityPrivacyLegal" in readiness.sections)) {
    failures.push("Production readiness report must include Phase 18 security/privacy/legal section.");
  }
  if (!readiness?.sections || !("hostedDeployment" in readiness.sections)) {
    failures.push("Production readiness report must include hosted deployment section.");
  }
  if (!privacy.includes("not lawyer-reviewed") || !terms.includes("not lawyer-reviewed")) {
    failures.push("Privacy and terms drafts must include not-lawyer-reviewed disclaimers.");
  }
  if (!terms.includes("does not guarantee profit increase")) {
    failures.push("Terms draft must avoid fake profit guarantees.");
  }
  if (!terms.includes("decision support, not accounting, tax, legal")) {
    failures.push("Terms draft must state the app is not accounting/tax/legal advice.");
  }
  if (!privacy.includes("OCR output must be reviewed") || !terms.toLowerCase().includes("review-confirm is required")) {
    failures.push("Legal drafts must include OCR review-confirm safety language.");
  }
  if (!consent.includes("No fake endorsements") || !consent.includes("No required positive posts")) {
    failures.push("Case study consent must prohibit fake endorsements and pressured positive posts.");
  }
  if (!retention.includes("Deletion Request Process") || !retention.includes("Export Process")) {
    failures.push("Data export/delete process must be documented.");
  }
  if (!checklist.includes("Dependency Audit") || !checklist.includes("5 moderate")) {
    failures.push("Security checklist must document dependency audit status.");
  }

  const repoText = walkFiles(process.cwd())
    .filter((file) => /\.(ts|tsx|js|json|md|env|example|yml|yaml)$/iu.test(file))
    .map((file) => read(file))
    .join("\n");
  const secretPatterns = [
    /SESSION_SECRET=(?!$|replace|local-dev-session-secret)[^\s"']+/iu,
    /DATABASE_URL=(?!$|postgresql:\/\/user:password|postgres:\/\/user:password|postgresql:\/\/profit_analyzer:local_dev_password@localhost:55432\/profit_analyzer)[^\s"']+/iu,
    /sk-[A-Za-z0-9_-]{20,}/u,
    /bearer\s+[A-Za-z0-9._-]{20,}/iu,
    /OCR_PROVIDER_API_KEY=(?!$|your_api_key_here)[^\s"']+/iu,
    /BILLING_PROVIDER_SECRET_KEY=(?!$)[^\s"']+/iu,
    /BILLING_WEBHOOK_SECRET=(?!$)[^\s"']+/iu,
    /password=(?!localhost|example|user:password)[^\s"']+/iu,
    /token=(?!hash|placeholder)[^\s"']+/iu
  ];
  for (const pattern of secretPatterns) {
    if (pattern.test(repoText)) {
      failures.push(`Potential secret pattern found: ${pattern}`);
    }
  }
  if (hasPrivateFiles()) {
    failures.push("Private benchmark or upload files are present in ignored private directories.");
  }

  const report = {
    pass: failures.length === 0,
    productionReady: false,
    verdicts: {
      controlledDemo: "yes",
      foundingPartnerControlledLaunch: "conditional",
      publicPaidSaasLaunch: "no-go"
    },
    docsChecked: requiredDocs,
    checks: {
      legalDraftDisclaimers: privacy.includes("not lawyer-reviewed") && terms.includes("not lawyer-reviewed"),
      ocrSafetyLanguage: privacy.includes("OCR output must be reviewed") && terms.toLowerCase().includes("review-confirm is required"),
      noProfitGuarantee: terms.includes("does not guarantee profit increase"),
      noFakeEndorsements: consent.includes("No fake endorsements"),
      exportDeleteProcess: retention.includes("Deletion Request Process") && retention.includes("Export Process"),
      dependencyAuditDocumented: checklist.includes("Dependency Audit") && checklist.includes("5 moderate"),
      hostedDeploymentDocumented: Boolean(readiness?.sections && "hostedDeployment" in readiness.sections),
      productionReadinessAgrees: readiness?.productionReady === false
    },
    failures
  };

  const reportsDir = ensureReportsDirectory();
  fs.writeFileSync(path.join(reportsDir, "launch-gate-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  fs.writeFileSync(
    path.join(reportsDir, "launch-gate-report.md"),
    `# Launch Gate Report

## Summary

- pass: ${report.pass}
- productionReady: ${report.productionReady}
- controlledDemo: ${report.verdicts.controlledDemo}
- foundingPartnerControlledLaunch: ${report.verdicts.foundingPartnerControlledLaunch}
- publicPaidSaasLaunch: ${report.verdicts.publicPaidSaasLaunch}

## Checks

${Object.entries(report.checks).map(([name, value]) => `- ${name}: ${value}`).join("\n")}

## Failures

${failures.length === 0 ? "- none" : failures.map((failure) => `- ${failure}`).join("\n")}
`,
    "utf8"
  );

  if (failures.length > 0) {
    console.log("FAIL launch gate validation");
    for (const failure of failures) {
      console.log(` - ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("PASS launch gate validation");
  console.log("controlledDemo=yes");
  console.log("foundingPartnerControlledLaunch=conditional");
  console.log("publicPaidSaasLaunch=no-go");
  console.log("productionReady=false");
}

main();
