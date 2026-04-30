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
    /Confirm cost updates/u,
    "Invoice page should include review-confirm CTA.",
    failures
  );
  assertNotContains(
    invoicePagePath,
    /<table/iu,
    "Invoice page should not rely on a desktop-only table layout.",
    failures
  );
  assertContains(
    invoiceTestsPath,
    /Photo\/OCR Upload/u,
    "Invoice tests should cover OCR upload mode.",
    failures
  );
  assertContains(
    dashboardTestsPath,
    /What changed since the last cost intake/u,
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
  console.log("Dashboard and dish-detail smoke coverage is present.");
}

main();
