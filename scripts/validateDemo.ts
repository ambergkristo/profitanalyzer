import {
  canonicalDemoDatasets,
  validateCanonicalDatasets
} from "../packages/core/src/index.js";

const requiredDatasetIds = [
  "mixed-restaurant",
  "low-margin-kitchen",
  "high-margin-bistro"
] as const;

function main() {
  const reports = validateCanonicalDatasets();
  const failures: string[] = [];

  if (canonicalDemoDatasets.length !== requiredDatasetIds.length) {
    failures.push(`Expected ${requiredDatasetIds.length} canonical datasets, found ${canonicalDemoDatasets.length}.`);
  }

  for (const datasetId of requiredDatasetIds) {
    const dataset = canonicalDemoDatasets.find((candidate) => candidate.id === datasetId);

    if (!dataset) {
      failures.push(`Missing canonical dataset "${datasetId}".`);
      continue;
    }

    if (!dataset.ownerDiagnosis || !dataset.expectedBehavior || !dataset.demoNarrative) {
      failures.push(`Dataset "${datasetId}" is missing demo narrative metadata.`);
    }
  }

  for (const report of reports) {
    if (!report.pass) {
      failures.push(`Synthetic validation failed for ${report.datasetId}.`);
    }
  }

  if (failures.length > 0) {
    console.log("FAIL demo readiness validation");
    for (const failure of failures) {
      console.log(` - ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("PASS demo readiness validation");
  console.log(`Datasets: ${canonicalDemoDatasets.length}`);
  console.log(`Synthetic validation reports: ${reports.length}`);
  console.log("Required metadata: present");
}

main();
