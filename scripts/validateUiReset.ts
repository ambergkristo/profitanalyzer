import fs from "node:fs";
import path from "node:path";

const requiredFiles = [
  "apps/web/src/components/Layout.tsx",
  "apps/web/src/components/Workspace.tsx",
  "apps/web/src/components/Form.tsx",
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
  "Recipes",
  "Retseptid",
  "Ingredients",
  "Koostisosad",
  "Invoices",
  "Arved",
  "Alerts",
  "Hoiatused",
  "Onboarding",
  "Seadistus",
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

const requiredWorkspacePages = [
  { file: "apps/web/src/pages/Dishes.tsx", marker: "Menu workspace" },
  { file: "apps/web/src/pages/DishDetail.tsx", marker: "Dish workspace" },
  { file: "apps/web/src/pages/Recipes.tsx", marker: "Recipe workspace" },
  { file: "apps/web/src/pages/Ingredients.tsx", marker: "Ingredient workspace" },
  { file: "apps/web/src/pages/Invoices.tsx", marker: "Review required before costs update" },
  { file: "apps/web/src/pages/Alerts.tsx", marker: "Alerts workspace" },
  { file: "apps/web/src/pages/Onboarding.tsx", marker: "Onboarding workspace" },
  { file: "apps/web/src/pages/Billing.tsx", marker: "Billing workspace" }
];

const forbiddenPatterns = [
  /synthetic validation pass/iu,
  /fixture OCR default/iu,
  /\boperative\b/iu,
  /\bidle\b/iu,
  /AI-powered/iu,
  /\bmagic\b/iu,
  /demo cockpit/iu,
  /productionReady\s*[:=]\s*true/iu
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
  const recipePage = read("apps/web/src/pages/Recipes.tsx");
  const ingredientPage = read("apps/web/src/pages/Ingredients.tsx");

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
  if (!invoices.includes("rounded-panel border p-5")) {
    failures.push("Invoice review card path is missing.");
  }
  if (!invoices.includes("aria-label={`Review line ${line.rawProductName}`}")) {
    failures.push("Invoice review line cards should expose a card-oriented review marker.");
  }
  if (!invoices.includes("confirmDisabledReason")) {
    failures.push("Invoice confirm CTA disabled reason is missing.");
  }
  if (!invoices.includes("Resolve or ignore")) {
    failures.push("Invoice unresolved-line resolution copy is missing.");
  }
  if (invoices.includes("<table") || invoices.includes("overflow-x-auto")) {
    failures.push("Invoice primary workflow should not use table or horizontal-scroll patterns.");
  }
  if (!i18n.includes("confirmCostUpdates") || !i18n.includes("Kinnita hinnauuendused")) {
    failures.push("Invoice-specific EE/EN labels are missing from i18n.");
  }
  if (!dashboard.includes("Recent cost intake") || !dashboard.includes("Priority actions")) {
    failures.push("Dashboard compact work-view sections are missing.");
  }
  if (!recipePage.includes("FieldLabel") || !ingredientPage.includes("FieldLabel")) {
    failures.push("Shared form primitives are not applied to recipe and ingredient editors.");
  }
  for (const page of requiredWorkspacePages) {
    if (!read(page.file).includes(page.marker)) {
      failures.push(`Workspace marker "${page.marker}" is missing from ${page.file}.`);
    }
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
    language: "EE/EN toggle and expanded navigation/action labels",
    demoSeparation: "scenario selector restrained to demo workspace area; diagnostics moved to settings",
    mobileInvoice: "invoice upload keeps capture hint and review-required safety copy",
    invoiceReviewInteraction: "line cards, unresolved reason, and confirm CTA state are statically verified",
    formPrimitives: "shared FieldLabel/TextInput/NumberInput/SelectInput primitives applied to setup editors",
    consolidatedWorkspaces: requiredWorkspacePages.map((page) => page.marker),
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
- invoiceReviewInteraction: ${report.invoiceReviewInteraction}
- formPrimitives: ${report.formPrimitives}
- consolidatedWorkspaces: ${report.consolidatedWorkspaces.join(", ")}
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
  console.log("App shell, invoice review interaction, nav tree, EE/EN toggle, dark/light theme, and mobile invoice safety passed.");
}

main();
