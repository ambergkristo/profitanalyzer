import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { canonicalDemoDatasets, validateCanonicalDatasets } from "../packages/core/src/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const reportsDir = path.resolve(__dirname, "..", "reports");

function formatImpact(cents: number) {
  return `EUR ${(cents / 100).toFixed(2)}`;
}

function renderMarkdownReport() {
  const reports = validateCanonicalDatasets();
  const datasetMeta = new Map(canonicalDemoDatasets.map((dataset) => [dataset.id, dataset]));
  const lines: string[] = [
    "# Synthetic Validation Report",
    "",
    "Deterministic validation summary for the three canonical restaurant demo scenarios.",
    "",
    "| Scenario | Profile | Result | Weighted Margin | Actions | Diagnosis |",
    "| --- | --- | --- | --- | --- | --- |"
  ];

  for (const report of reports) {
    const dataset = datasetMeta.get(report.datasetId);
    const actionCount = Object.values(report.actionTypeCounts).reduce((sum, count) => sum + (count ?? 0), 0);

    lines.push(
      `| ${report.datasetName} | ${dataset?.profile ?? "unknown"} | ${report.pass ? "PASS" : "FAIL"} | ${report.weightedAverageMarginPercent.toFixed(2)}% | ${actionCount} | ${dataset?.ownerDiagnosis ?? "n/a"} |`
    );
  }

  lines.push("");

  for (const report of reports) {
    const dataset = datasetMeta.get(report.datasetId);

    lines.push(`## ${report.datasetName}`);
    lines.push("");
    lines.push(`- Dataset ID: \`${report.datasetId}\``);
    lines.push(`- Profile: \`${dataset?.profile ?? "unknown"}\``);
    lines.push(`- Result: ${report.pass ? "PASS" : "FAIL"}`);
    lines.push(`- Dishes: ${report.totalDishes}`);
    lines.push(
      `- Profit split: ${report.profitableCount} profitable / ${report.warningCount} warning / ${report.lossCount} loss`
    );
    lines.push(`- Weighted margin: ${report.weightedAverageMarginPercent.toFixed(2)}%`);
    lines.push(`- Estimated period profit: ${formatImpact(report.estimatedPeriodProfitCents)}`);
    lines.push(`- Owner diagnosis: ${dataset?.ownerDiagnosis ?? "n/a"}`);
    lines.push(`- Expected behavior: ${dataset?.expectedBehavior ?? "n/a"}`);
    lines.push(
      `- Action severity: critical ${report.severityCounts.critical}, high ${report.severityCounts.high}, medium ${report.severityCounts.medium}, low ${report.severityCounts.low}`
    );
    lines.push("");
    lines.push("Top actions:");
    for (const action of report.topActions) {
      lines.push(
        `- [${action.severity}] ${action.title} (${action.reasonCodes.join(", ")}) - impact ${formatImpact(action.estimatedImpactCents)}`
      );
    }

    if (report.warnings.length > 0) {
      lines.push("");
      lines.push("Warnings:");
      for (const warning of report.warnings) {
        lines.push(`- ${warning}`);
      }
    }

    if (report.failures.length > 0) {
      lines.push("");
      lines.push("Failures:");
      for (const failure of report.failures) {
        lines.push(`- ${failure}`);
      }
    }

    lines.push("");
  }

  return lines.join("\n");
}

async function main() {
  const reports = validateCanonicalDatasets();
  const reportBundle = {
    datasets: canonicalDemoDatasets.map((dataset) => ({
      id: dataset.id,
      name: dataset.name,
      profile: dataset.profile,
      ownerDiagnosis: dataset.ownerDiagnosis,
      expectedBehavior: dataset.expectedBehavior,
      demoNarrative: dataset.demoNarrative
    })),
    reports
  };

  await mkdir(reportsDir, { recursive: true });
  await writeFile(
    path.join(reportsDir, "synthetic-validation-report.json"),
    `${JSON.stringify(reportBundle, null, 2)}\n`,
    "utf8"
  );
  await writeFile(path.join(reportsDir, "synthetic-validation-report.md"), `${renderMarkdownReport()}\n`, "utf8");

  for (const report of reports) {
    console.log(`${report.pass ? "PASS" : "FAIL"} ${report.datasetName} (${report.datasetId})`);
    console.log(
      `  Actions: ${Object.values(report.actionTypeCounts).reduce((sum, count) => sum + (count ?? 0), 0)} | Severity: critical ${report.severityCounts.critical}, high ${report.severityCounts.high}, medium ${report.severityCounts.medium}, low ${report.severityCounts.low}`
    );
    console.log(
      `  Profit split: ${report.profitableCount} profitable / ${report.warningCount} warning / ${report.lossCount} loss | Weighted margin ${report.weightedAverageMarginPercent.toFixed(2)}%`
    );
    console.log("  Top actions:");
    for (const action of report.topActions) {
      console.log(
        `   - [${action.severity}] ${action.title} | ${formatImpact(action.estimatedImpactCents)} | ${action.reasonCodes.join(", ")}`
      );
    }

    if (report.warnings.length > 0) {
      console.log("  Warnings:");
      for (const warning of report.warnings) {
        console.log(`   - ${warning}`);
      }
    }

    if (report.failures.length > 0) {
      console.log("  Failures:");
      for (const failure of report.failures) {
        console.log(`   - ${failure}`);
      }
    }
  }

  if (reports.some((report) => !report.pass)) {
    process.exitCode = 1;
  }
}

void main();
