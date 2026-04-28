import fs from "node:fs";
import path from "node:path";

import request from "supertest";

import type { OcrDraftResponse, OcrProviderConfig, OverviewMetrics } from "../packages/core/src/index.js";
import { createApp } from "../apps/api/src/app.js";

interface BenchmarkExpectedFixture {
  fixtureId: string;
  supplierName?: string;
  invoiceDate?: string;
  lineCount: number;
  lineNames?: string[];
}

interface BenchmarkReport {
  providerConfigured: boolean;
  liveRunExecuted: boolean;
  fixtureCount: number;
  parsedLineAccuracy: number | null;
  supplierDetected: boolean | null;
  dateDetected: boolean | null;
  lineCountDetected: number;
  warnings: string[];
  safetyStatus: string;
}

function ensureReportsDirectory() {
  const reportsDir = path.resolve("reports");
  fs.mkdirSync(reportsDir, { recursive: true });
  return reportsDir;
}

function writeReport(report: BenchmarkReport) {
  const reportsDir = ensureReportsDirectory();
  fs.writeFileSync(
    path.join(reportsDir, "ocr-provider-benchmark-report.json"),
    `${JSON.stringify(report, null, 2)}\n`
  );

  const markdown = `# OCR Provider Benchmark Report

## Summary

- providerConfigured: ${report.providerConfigured}
- liveRunExecuted: ${report.liveRunExecuted}
- fixtureCount: ${report.fixtureCount}
- parsedLineAccuracy: ${report.parsedLineAccuracy ?? "skipped"}
- supplierDetected: ${report.supplierDetected ?? "skipped"}
- dateDetected: ${report.dateDetected ?? "skipped"}
- lineCountDetected: ${report.lineCountDetected}
- safetyStatus: ${report.safetyStatus}

## Warnings

${report.warnings.map((warning) => `- ${warning}`).join("\n")}
`;

  fs.writeFileSync(
    path.join(reportsDir, "ocr-provider-benchmark-report.md"),
    `${markdown}\n`
  );
}

function loadExpectedFixtures() {
  const expectedDir = path.resolve("benchmarks/ocr/expected");
  const files = fs.readdirSync(expectedDir).filter((file) => file.endsWith(".json")).sort();
  return files.map((file) => {
    const absolutePath = path.join(expectedDir, file);
    const parsed = JSON.parse(fs.readFileSync(absolutePath, "utf8")) as BenchmarkExpectedFixture;
    return parsed;
  });
}

function toBufferForSample(samplePath: string) {
  return fs.readFileSync(samplePath);
}

function getMimeType(samplePath: string) {
  const extension = path.extname(samplePath).toLowerCase();
  if (extension === ".png") {
    return "image/png";
  }
  if (extension === ".webp") {
    return "image/webp";
  }
  if (extension === ".pdf") {
    return "application/pdf";
  }
  return "image/jpeg";
}

async function main() {
  const expectedFixtures = loadExpectedFixtures();
  const app = createApp();
  const providersResponse = await request(app).get("/api/ocr/providers");
  const providers = providersResponse.body as OcrProviderConfig[];
  const fixtureProvider = providers.find((provider) => provider.id === "fixture");
  const externalProvider = providers.find((provider) => provider.id === "external_env");

  if (!fixtureProvider?.isConfigured || !fixtureProvider.isDefault) {
    throw new Error("Fixture OCR provider must remain configured and default.");
  }

  if (!externalProvider?.isConfigured) {
    const fixtureUploadResponse = await request(app)
      .post("/api/ocr/invoices/upload?dataset=mixed-restaurant&provider=fixture")
      .attach("file", Buffer.from("fixture"), {
        filename: "clean-invoice-photo.jpg",
        contentType: "image/jpeg"
      });

    if (fixtureUploadResponse.status !== 200) {
      throw new Error("Fixture provider validation failed while external provider was skipped.");
    }

    const report: BenchmarkReport = {
      providerConfigured: false,
      liveRunExecuted: false,
      fixtureCount: expectedFixtures.length,
      parsedLineAccuracy: null,
      supplierDetected: null,
      dateDetected: null,
      lineCountDetected: 0,
      warnings: [
        "SKIPPED_EXTERNAL_PROVIDER: OCR_PROVIDER=external_env, OCR_PROVIDER_API_KEY, and OCR_PROVIDER_MODEL are required to run live provider validation.",
        "Fixture provider remained available and created a review draft successfully."
      ],
      safetyStatus: "draft_only_preserved"
    };

    writeReport(report);
    console.log("PASS OCR provider validation");
    console.log("SKIPPED_EXTERNAL_PROVIDER");
    console.log("Fixture fallback remained available and review-only.");
    return;
  }

  const samplePath = path.resolve("benchmarks/ocr/private-samples/clean-invoice-provider-sample.jpg");
  if (!fs.existsSync(samplePath)) {
    throw new Error(
      "External OCR provider is configured, but benchmarks/ocr/private-samples/clean-invoice-provider-sample.jpg is missing."
    );
  }

  const expected = expectedFixtures.find((fixture) => fixture.fixtureId === "clean-invoice");
  if (!expected) {
    throw new Error("Missing clean benchmark expectation.");
  }

  const beforeOverviewResponse = await request(app).get("/api/analytics/overview?dataset=mixed-restaurant");
  const beforeOverview = beforeOverviewResponse.body as OverviewMetrics;
  const beforeHistoryResponse = await request(app).get(
    "/api/ingredients/parmesan/cost-history?dataset=mixed-restaurant"
  );

  const uploadResponse = await request(app)
    .post("/api/ocr/invoices/upload?dataset=mixed-restaurant&provider=external_env")
    .attach("file", toBufferForSample(samplePath), {
      filename: path.basename(samplePath),
      contentType: getMimeType(samplePath)
    });

  if (uploadResponse.status !== 200) {
    throw new Error(`External OCR provider upload failed with status ${uploadResponse.status}.`);
  }

  const draft = uploadResponse.body as OcrDraftResponse;
  const afterDraftOverviewResponse = await request(app).get("/api/analytics/overview?dataset=mixed-restaurant");
  const afterDraftOverview = afterDraftOverviewResponse.body as OverviewMetrics;
  const afterDraftHistoryResponse = await request(app).get(
    "/api/ingredients/parmesan/cost-history?dataset=mixed-restaurant"
  );

  if (
    afterDraftOverview.estimatedPeriodProfitCents !== beforeOverview.estimatedPeriodProfitCents ||
    afterDraftHistoryResponse.body.history.length !== beforeHistoryResponse.body.history.length
  ) {
    throw new Error("External OCR draft mutated analytics or cost history before confirmation.");
  }

  const matchedLineNames = draft.lines.filter((line) =>
    expected.lineNames?.includes(line.rawProductName)
  ).length;
  const parsedLineAccuracy =
    expected.lineNames && expected.lineNames.length > 0
      ? Number((matchedLineNames / expected.lineNames.length).toFixed(2))
      : draft.summary.totalLines === expected.lineCount
        ? 1
        : 0;

  const report: BenchmarkReport = {
    providerConfigured: true,
    liveRunExecuted: true,
    fixtureCount: expectedFixtures.length,
    parsedLineAccuracy,
    supplierDetected: draft.ocrResult.supplierName === expected.supplierName,
    dateDetected: draft.ocrResult.invoiceDate === expected.invoiceDate,
    lineCountDetected: draft.summary.totalLines,
    warnings: draft.qualityReport.warnings,
    safetyStatus: "draft_only_preserved"
  };

  writeReport(report);
  console.log("PASS OCR provider validation");
  console.log(`Provider configured: ${report.providerConfigured}`);
  console.log(`Live run executed: ${report.liveRunExecuted}`);
  console.log(`Parsed line accuracy: ${report.parsedLineAccuracy}`);
  console.log(`Supplier detected: ${report.supplierDetected}`);
  console.log(`Date detected: ${report.dateDetected}`);
  console.log(`Line count detected: ${report.lineCountDetected}`);
  console.log(`Safety status: ${report.safetyStatus}`);
}

main();
