import fs from "node:fs";
import path from "node:path";

function assertContains(filePath: string, pattern: RegExp, message: string, failures: string[]) {
  const contents = fs.readFileSync(filePath, "utf8");
  if (!pattern.test(contents)) {
    failures.push(message);
  }
}

function assertNotContains(filePath: string, pattern: RegExp, message: string, failures: string[]) {
  const contents = fs.readFileSync(filePath, "utf8");
  if (pattern.test(contents)) {
    failures.push(message);
  }
}

function main() {
  const failures: string[] = [];
  const invoicePagePath = path.resolve("apps/web/src/pages/Invoices.tsx");
  const invoiceTestsPath = path.resolve("apps/web/src/test/InvoicesPage.test.tsx");
  const onboardingPagePath = path.resolve("apps/web/src/pages/Onboarding.tsx");
  const onboardingTestsPath = path.resolve("apps/web/src/test/OnboardingPage.test.tsx");
  const dashboardTestsPath = path.resolve("apps/web/src/test/Dashboard.test.tsx");
  const dishDetailTestsPath = path.resolve("apps/web/src/test/DishDetail.test.tsx");

  assertContains(
    invoicePagePath,
    /Create review draft/u,
    "Invoice page should include OCR/mobile upload draft flow copy.",
    failures
  );
  assertContains(
    invoicePagePath,
    /accept="image\/\*,application\/pdf"/u,
    "Invoice upload should accept mobile images and PDFs.",
    failures
  );
  assertContains(
    invoicePagePath,
    /capture="environment"/u,
    "Invoice upload should expose browser camera capture when supported.",
    failures
  );
  assertContains(
    invoicePagePath,
    /Upload creates a review draft\. Costs update only after confirmation\./u,
    "Invoice upload should show mobile-safe review-confirm safety copy.",
    failures
  );
  assertContains(
    invoicePagePath,
    /Confirm cost updates/u,
    "Invoice page should include review-confirm CTA.",
    failures
  );
  assertContains(
    invoicePagePath,
    /confirmDisabledReason/u,
    "Invoice page should show why confirmation is disabled.",
    failures
  );
  assertContains(
    invoicePagePath,
    /aria-label=\{`Review line/u,
    "Invoice review should expose line cards instead of a desktop-table dependency.",
    failures
  );
  assertContains(
    invoicePagePath,
    /Selected \{ocrFile\.name\}/u,
    "Invoice upload should render selected file metadata.",
    failures
  );
  assertNotContains(
    invoicePagePath,
    /<table/iu,
    "Invoice page should not rely on a desktop-only table layout.",
    failures
  );
  assertNotContains(
    invoicePagePath,
    /overflow-x-auto/iu,
    "Invoice page should not use horizontal scrolling as the primary mobile workflow.",
    failures
  );
  assertContains(
    invoiceTestsPath,
    /Photo\/OCR Upload/u,
    "Invoice tests should cover OCR upload mode.",
    failures
  );
  assertContains(
    onboardingPagePath,
    /Onboarding workspace/u,
    "Onboarding page should expose the production setup workspace.",
    failures
  );
  assertContains(
    onboardingPagePath,
    /Restaurant Profile/u,
    "Onboarding page should include restaurant profile setup.",
    failures
  );
  assertContains(
    onboardingPagePath,
    /Add ingredient line/u,
    "Onboarding recipe builder should support touch-friendly ingredient line cards.",
    failures
  );
  assertContains(
    onboardingPagePath,
    /Open invoice intake/u,
    "Onboarding first invoice step should link to the existing invoice intake flow.",
    failures
  );
  assertNotContains(
    onboardingPagePath,
    /<table/iu,
    "Onboarding setup flow should not rely on desktop-only table layout.",
    failures
  );
  assertContains(
    onboardingTestsPath,
    /mobile-first onboarding wizard/u,
    "Onboarding tests should cover the wizard.",
    failures
  );
  assertContains(
    onboardingTestsPath,
    /first invoice/u,
    "Onboarding tests should cover the invoice setup step.",
    failures
  );
  assertContains(
    dashboardTestsPath,
    /Priority actions[\s\S]*Supplier alerts/u,
    "Dashboard tests should cover supplier alert or dashboard action rendering.",
    failures
  );
  assertContains(
    dishDetailTestsPath,
    /Reach 50% margin/u,
    "Dish detail tests should cover simulator controls.",
    failures
  );

  if (failures.length > 0) {
    console.log("FAIL mobile validation");
    for (const failure of failures) {
      console.log(` - ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("PASS mobile validation");
  console.log("Invoice upload and review copy is present without a desktop-only table dependency.");
  console.log("Onboarding setup, dashboard, and dish-detail smoke coverage is present.");
}

main();
