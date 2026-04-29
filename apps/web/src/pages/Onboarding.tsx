import { Link, useSearchParams } from "react-router-dom";

import { apiClient } from "../api/client.js";
import { PageHeader } from "../components/PageHeader.js";
import { Panel } from "../components/Panel.js";
import { StatePanel } from "../components/StatePanel.js";
import { useAsyncData } from "../hooks.js";
import { buildDatasetSearch, getScenarioMeta } from "../utils/scenario.js";

const steps = [
  {
    index: "01",
    title: "Choose mode",
    message:
      "Explore synthetic scenarios in demo mode, or run a single restaurant workspace in pilot mode."
  },
  {
    index: "02",
    title: "Set menu baseline",
    message:
      "Start with the sample menu, then use Pilot Tools to edit ingredients, recipes, dish links, or validate a JSON import before replacing the workspace."
  },
  {
    index: "03",
    title: "Confirm current costs",
    message:
      "Use Invoice Cost Intake to review supplier lines, confirm ingredient matches, and update costs safely."
  },
  {
    index: "04",
    title: "Take the first action",
    message:
      "Open the dashboard, inspect the top action, open the affected dish, and test price repair in the simulator."
  }
] as const;

export function OnboardingPage() {
  const [searchParams] = useSearchParams();
  const datasetId = searchParams.get("dataset") ?? undefined;
  const bootstrap = useAsyncData(async () => {
    const [config, datasets] = await Promise.all([
      apiClient.getAppConfig(),
      apiClient.getDemoDatasets()
    ]);

    return { config, datasets };
  });

  if (bootstrap.loading) {
    return (
      <StatePanel
        title="Loading onboarding"
        message="Checking app mode, workspace behavior, and the safest way to start."
        tone="loading"
      />
    );
  }

  if (bootstrap.error || !bootstrap.data) {
    return (
      <StatePanel
        title="Onboarding unavailable"
        message="Backend is not reachable. Start the API with npm run dev."
        tone="error"
      />
    );
  }

  const { config, datasets } = bootstrap.data;
  const selectedDataset =
    (datasetId ? getScenarioMeta(datasets, datasetId) : undefined) ??
    (config.appMode === "pilot"
      ? datasets.find((dataset) => dataset.id === "pilot-workspace")
      : undefined) ??
    datasets[0];

  return (
    <div className="space-y-6">
      <Panel className="p-7">
        <PageHeader
          eyebrow="Onboarding"
          title={config.appMode === "demo" ? "Start with a guided demo loop" : "Start the pilot workspace carefully"}
          description={
            config.appMode === "demo"
              ? "Use the synthetic scenarios to understand the full profit workflow before touching live restaurant data."
              : "Pilot mode keeps the same review-confirm safety model, but moves the product toward a controlled restaurant test."
          }
          badges={
            <>
              <span className="rounded-full border border-white/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-text">
                {config.appMode === "demo" ? "Demo mode" : "Pilot mode"}
              </span>
              <span className="rounded-full border border-warning/20 bg-warning/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-warning">
                Storage {config.storage.driver}
              </span>
            </>
          }
          actions={
            <Panel className="rounded-tile p-4" tone="subtle">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Recommended start</p>
              <p className="mt-3 text-sm leading-6 text-text">
                {selectedDataset?.ownerDiagnosis ?? "Choose a dataset to begin."}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">
                {config.storage.driver === "file"
                  ? "Changes persist to local pilot data files."
                  : "Changes reset when the API restarts because memory storage is active."}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  className="rounded-full border border-accent/30 bg-accent/10 px-4 py-2 text-sm text-accent transition hover:border-accent/60"
                  to={{ pathname: "/", search: buildDatasetSearch(selectedDataset?.id) }}
                >
                  {config.appMode === "demo" ? "Open demo dashboard" : "Open pilot dashboard"}
                </Link>
                <Link
                  className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-text transition hover:border-accent/30 hover:text-accent"
                  to={{ pathname: "/pilot-tools", search: buildDatasetSearch(selectedDataset?.id) }}
                >
                  Start pilot workspace
                </Link>
                <Link
                  className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-text transition hover:border-accent/30 hover:text-accent"
                  to={{ pathname: "/invoices", search: buildDatasetSearch(selectedDataset?.id) }}
                >
                  Start invoice cost intake
                </Link>
              </div>
            </Panel>
          }
        />
      </Panel>

      <section className="grid gap-4 xl:grid-cols-2">
        {steps.map((step) => (
          <Panel key={step.index}>
            <p className="text-[11px] uppercase tracking-[0.18em] text-accent">Step {step.index}</p>
            <h2 className="mt-4 font-display text-3xl text-text">{step.title}</h2>
            <p className="mt-3 text-sm leading-6 text-muted">{step.message}</p>
          </Panel>
        ))}
      </section>

      <Panel>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted">First decision path</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Link
            className="rounded-tile border border-border bg-white/[0.02] p-4 transition hover:border-accent/30"
            to={{ pathname: "/", search: buildDatasetSearch(selectedDataset?.id) }}
          >
            <p className="font-medium text-text">Open dashboard</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Start with the ranked action stack and margin diagnosis.
            </p>
          </Link>
          <Link
            className="rounded-tile border border-border bg-white/[0.02] p-4 transition hover:border-accent/30"
            to={{ pathname: "/alerts", search: buildDatasetSearch(selectedDataset?.id) }}
          >
            <p className="font-medium text-text">Review supplier alerts</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              See where ingredient cost changes have already pushed dish economics.
            </p>
          </Link>
          <Link
            className="rounded-tile border border-border bg-white/[0.02] p-4 transition hover:border-accent/30"
            to={{ pathname: "/pilot-tools", search: buildDatasetSearch(selectedDataset?.id) }}
          >
            <p className="font-medium text-text">Open pilot tools</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Export, reset, and validate the current workspace before a pilot session.
            </p>
          </Link>
        </div>
      </Panel>
    </div>
  );
}
