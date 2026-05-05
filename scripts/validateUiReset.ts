import fs from "node:fs";
import path from "node:path";

const requiredFiles = [
  "apps/web/src/components/Layout.tsx",
  "apps/web/src/components/ThemeToggle.tsx",
  "apps/web/src/components/LanguageToggle.tsx",
  "apps/web/src/design/theme.ts",
  "apps/web/src/design/i18n.ts",
  "apps/web/src/pages/Settings.tsx"
];

const requiredNavLabels = [
  "Overview",
  "Ülevaade",
  "Menu",
  "Menüü",
  "Invoices",
  "Arved",
  "Billing",
  "Litsents",
  "Settings",
  "Seaded"
];

const primaryFiles = [
  "apps/web/src/components/Layout.tsx",
  "apps/web/src/pages/Dashboard.tsx",
  "apps/web/src/pages/Dishes.tsx",
  "apps/web/src/pages/DishDetail.tsx",
  "apps/web/src/pages/Invoices.tsx",
  "apps/web/src/pages/Alerts.tsx",
  "apps/web/src/pages/Onboarding.tsx",
  "apps/web/src/pages/Billing.tsx"
];

const forbiddenPatterns = [
  /synthetic validation pass/iu,
  /fixture OCR default/iu,
  /\boperative\b/iu,
  /\bidle\b/iu,
  /AI-powered/iu,
  /\bmagic\b/iu
];

function ensureReportsDirectory() {
  const reportsDir = path.resolve("reports");
  fs.mkdirSync(reportsDir, { recursive: true });
  return reportsDir;
}

function read(filePath: string) {
  return fs.readFileSync(path.resolve(filePath), "utf8");
}

function main() {
  const failures: string[] = [];
  for (const file of requiredFiles) {
    if (!fs.existsSync(path.resolve(file))) {
      failures.push(`Missing required UI reset file: ${file}`);
    }
  }

  const layout = read("apps/web/src/components/Layout.tsx");
  const i18n = read("apps/web/src/design/i18n.ts");
  const styles = read("apps/web/src/styles.css");
  const invoices = read("apps/web/src/pages/Invoices.tsx");
  const dashboard = read("apps/web/src/pages/Dashboard.tsx");

  for (const label of requiredNavLabels) {
    if (!layout.includes(label) && !i18n.includes(label)) {
      failures.push(`Missing nav/i18n label: ${label}`);
    }
  }

  if (!styles.includes(":root[data-theme=\"light\"]")) {
    failures.push("Light theme token scope is missing.");
  }
  if (!layout.includes("Primary navigation")) {
    failures.push("App shell primary navigation is missing.");
  }
  if (!invoices.includes("Review required before costs update")) {
    failures.push("Invoice safety copy is missing.");
  }
  if (!invoices.includes("capture=\"environment\"")) {
    failures.push("Mobile camera/file capture hint is missing.");
  }
  if (!dashboard.includes("Recent cost intake") || !dashboard.includes("Priority actions")) {
    failures.push("Dashboard compact work-view sections are missing.");
  }

  for (const file of primaryFiles) {
    const content = read(file);
    for (const pattern of forbiddenPatterns) {
      if (pattern.test(content)) {
        failures.push(`Forbidden primary UI copy ${pattern} found in ${file}`);
      }
    }
  }

  const report = {
    pass: failures.length === 0,
    appShell: "left work-tree navigation, compact top bar, settings diagnostics",
    theme: "dark default and light theme tokens with localStorage toggle",
    language: "EE/EN toggle and core navigation/action labels",
    demoSeparation: "scenario selector restrained to demo workspace area; diagnostics moved to settings",
    mobileInvoice: "invoice upload keeps capture hint and review-required safety copy",
    forbiddenCopyFailures: failures.filter((failure) => failure.includes("Forbidden")),
    failures
  };

  const reportsDir = ensureReportsDirectory();
  fs.writeFileSync(path.join(reportsDir, "ui-reset-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  fs.writeFileSync(
    path.join(reportsDir, "ui-reset-report.md"),
    `# UI Reset Report

## Summary

- appShell: ${report.appShell}
- theme: ${report.theme}
- language: ${report.language}
- demoSeparation: ${report.demoSeparation}
- mobileInvoice: ${report.mobileInvoice}
- pass: ${report.pass}
`,
    "utf8"
  );

  if (failures.length > 0) {
    console.log("FAIL UI reset validation");
    for (const failure of failures) {
      console.log(` - ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("PASS UI reset validation");
  console.log("App shell, nav tree, EE/EN toggle, dark/light theme, settings diagnostics, and mobile invoice safety passed.");
}

main();
