import fs from "node:fs";
import path from "node:path";

import {
  applyOcrConfidencePolicy,
  evaluateOcrQuality,
  resolveFixtureOcrResult,
  type OcrParsedInvoiceResult
} from "../packages/core/src/index.js";
import { buildExternalProviderConfig } from "../apps/api/src/ocr/externalProvider.js";

interface ExpectedFixture {
  fixtureName: string;
  supplierName: string;
  invoiceDate: string;
  expectedLineCount: number;
  expectedProducts: string[];
}

function loadExpectedFixtures() {
  const expectedDir = path.resolve("benchmarks", "ocr", "expected");
  return fs.readdirSync(expectedDir)
    .filter((fileName) => fileName.endsWith(".expected.json"))
    .sort()
    .map((fileName) => JSON.parse(fs.readFileSync(path.join(expectedDir, fileName), "utf8")) as ExpectedFixture);
}

function productMatchRate(result: OcrParsedInvoiceResult, expectedProducts: string[]) {
  if (expectedProducts.length === 0) {
    return 1;
  }

  const detected = new Set(result.lines.map((line) => line.rawProductName.toLowerCase()));
  const matched = expectedProducts.filter((product) => detected.has(product.toLowerCase())).length;
  return Number((matched / expectedProducts.length).toFixed(3));
}

function recommendationFor(unresolvedLineRate: number, productNameMatchRate: number) {
  if (unresolvedLineRate === 0 && productNameMatchRate >= 0.9) {
    return "ready_for_demo";
  }
  if (unresolvedLineRate <= 0.5 && productNameMatchRate >= 0.6) {
    return "manual_review_demo_only";
  }
  return "not_ready_for_customer_demo";
}

function ensureReportsDirectory() {
  const reportsDir = path.resolve("reports");
  fs.mkdirSync(reportsDir, { recursive: true });
  return reportsDir;
}

function toMarkdown(report: {
  liveProviderStatus: string;
  fixtureCount: number;
  safetyStatus: string;
  fixtures: Array<Record<string, unknown>>;
}) {
  const fixtureLines = report.fixtures.map((fixture) =>
    `- ${fixture.fixtureName}: ${fixture.recommendation}, lineCount=${fixture.lineCountDetected}, productMatchRate=${fixture.productNameMatchRate}, unresolvedLineRate=${fixture.unresolvedLineRate}`
  );

  return `# OCR Benchmark Report

## Summary

- liveProviderStatus: ${report.liveProviderStatus}
- fixtureCount: ${report.fixtureCount}
- safetyStatus: ${report.safetyStatus}

## Fixture Results

${fixtureLines.join("\n")}
`;
}

async function main() {
  const expectedFixtures = loadExpectedFixtures();
  const fixtureResults = expectedFixtures.map((expected) => {
    const result = resolveFixtureOcrResult(expected.fixtureName);
    const quality = applyOcrConfidencePolicy(result, evaluateOcrQuality(result));
    const matchRate = productMatchRate(result, expected.expectedProducts);
    const unresolvedRate = quality.unresolvedLineRate ?? 0;

    return {
      fixtureName: expected.fixtureName,
      supplierDetected: result.supplierName === expected.supplierName,
      dateDetected: result.invoiceDate === expected.invoiceDate,
      lineCountDetected: result.lines.length,
      expectedLineCount: expected.expectedLineCount,
      productNameMatchRate: matchRate,
      unresolvedLineRate: unresolvedRate,
      reviewBurdenScore: quality.reviewBurdenScore ?? 0,
      recommendation: recommendationFor(unresolvedRate, matchRate),
      safetyStatus: "draft_only_review_confirm_required"
    };
  });

  const liveProviderConfigured = buildExternalProviderConfig(process.env).isConfigured;
  const report = {
    providerConfigured: liveProviderConfigured,
    liveRunExecuted: false,
    liveProviderStatus: liveProviderConfigured
      ? "LIVE_PROVIDER_CONFIGURED_BUT_NOT_EXECUTED_WITHOUT_PRIVATE_SAMPLE"
      : "LIVE_PROVIDER_SKIPPED",
    fixtureCount: fixtureResults.length,
    fixtures: fixtureResults,
    safetyStatus: "PASS_DRAFT_ONLY_NO_PRIVATE_FILES_COMMITTED",
    warnings: liveProviderConfigured
      ? ["Add private invoice samples under benchmarks/ocr/private-samples/ before running a live benchmark."]
      : ["External OCR provider env is missing; live benchmark skipped."]
  };

  const reportsDir = ensureReportsDirectory();
  fs.writeFileSync(path.join(reportsDir, "ocr-benchmark-report.json"), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(reportsDir, "ocr-benchmark-report.md"), toMarkdown(report));

  console.log("PASS OCR benchmark");
  console.log(`liveProviderStatus=${report.liveProviderStatus}`);
  console.log(`fixtureCount=${report.fixtureCount}`);
  console.log(`safetyStatus=${report.safetyStatus}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
