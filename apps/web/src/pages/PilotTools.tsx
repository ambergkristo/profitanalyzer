import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { apiClient } from "../api/client.js";
import { PageHeader } from "../components/PageHeader.js";
import { Panel } from "../components/Panel.js";
import { StatePanel } from "../components/StatePanel.js";
import { useAsyncData } from "../hooks.js";
import type { DatasetExportPayload } from "../types.js";
import { getScenarioMeta } from "../utils/scenario.js";

export function PilotToolsPage() {
  const [searchParams] = useSearchParams();
  const datasetId = searchParams.get("dataset") ?? undefined;
  const [exportJson, setExportJson] = useState("");
  const [importJson, setImportJson] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<"export" | "reset" | "import" | null>(null);

  const loadBootstrap = useCallback(async () => {
    const [config, datasets, deepHealth] = await Promise.all([
      apiClient.getAppConfig(),
      apiClient.getDemoDatasets(),
      apiClient.getDeepHealth()
    ]);

    return { config, datasets, deepHealth };
  }, []);

  const bootstrap = useAsyncData(loadBootstrap);

  const selectedDataset = useMemo(
    () => (bootstrap.data ? getScenarioMeta(bootstrap.data.datasets, datasetId) ?? bootstrap.data.datasets[0] : undefined),
    [bootstrap.data, datasetId]
  );

  if (bootstrap.loading) {
    return (
      <StatePanel
        title="Loading pilot tools"
        message="Checking storage mode, OCR readiness, and workspace safety controls."
        tone="loading"
      />
    );
  }

  if (bootstrap.error || !bootstrap.data) {
    return (
      <StatePanel
        title="Pilot tools unavailable"
        message="Backend is not reachable. Start the API with npm run dev."
        tone="error"
      />
    );
  }

  const bootstrapData = bootstrap.data;

  async function handleExport() {
    if (!selectedDataset?.id) {
      return;
    }

    setBusyAction("export");
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const payload = await apiClient.exportDataset(selectedDataset.id);
      setExportJson(`${JSON.stringify(payload, null, 2)}\n`);
      setStatusMessage(`Exported ${selectedDataset.name} into JSON snapshot format.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Export failed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleReset() {
    if (!selectedDataset?.id) {
      return;
    }

    setBusyAction("reset");
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const result = await apiClient.resetDataset(selectedDataset.id);
      setStatusMessage(
        `Reset ${result.datasetId}. Cleared ${result.clearedInvoices} invoices, ${result.clearedAlerts} alerts, and restored ${result.restoredDishCount} dishes.`
      );
      setExportJson("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Reset failed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleImport() {
    const seededDatasetIds = new Set(bootstrapData.datasets.map((dataset) => dataset.id));
    const targetDatasetId =
      datasetId && !seededDatasetIds.has(datasetId) ? datasetId : "pilot-workspace";

    setBusyAction("import");
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const payload = JSON.parse(importJson) as DatasetExportPayload;
      const result = await apiClient.importDataset(payload, targetDatasetId);
      setStatusMessage(
        `Imported ${result.datasetId} with ${result.dishCount} dishes, ${result.ingredientCount} ingredients, and ${result.supplierCount} suppliers.`
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="space-y-6">
      <Panel className="p-7">
        <PageHeader
          eyebrow="Pilot tools"
          title="Reset, export, and validate the workspace"
          description="These controls are for controlled pilot setup and recovery. They are not customer-facing admin tooling."
          badges={
            <>
              <span className="rounded-full border border-white/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-text">
                {bootstrapData.config.appMode === "demo" ? "Demo mode" : "Pilot mode"}
              </span>
              <span className="rounded-full border border-warning/20 bg-warning/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-warning">
                Storage {bootstrapData.config.features.persistence}
              </span>
            </>
          }
          actions={
            <Panel className="rounded-tile p-4" tone="subtle">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Current workspace</p>
              <p className="mt-3 text-sm leading-6 text-text">
                {selectedDataset?.name ?? "No dataset selected"}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">
                {selectedDataset?.description ??
                  "Use a dataset query param to choose which workspace to export or reset."}
              </p>
            </Panel>
          }
        />
      </Panel>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Environment gate</p>
          <div className="mt-4 space-y-3">
            {bootstrapData.deepHealth.checks.map((check) => (
              <div key={check.key} className="rounded-tile border border-border bg-white/[0.02] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-text">{check.key.replaceAll("_", " ")}</p>
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.16em] ${
                      check.status === "pass"
                        ? "border border-profit/20 bg-profit/10 text-profit"
                        : "border border-warning/20 bg-warning/10 text-warning"
                    }`}
                  >
                    {check.status}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted">{check.message}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel tone="warning">
          <p className="text-[11px] uppercase tracking-[0.18em] text-warning">Safety note</p>
          <h2 className="mt-4 font-display text-3xl text-text">Reset and import are controlled tools</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Reset restores the selected dataset baseline. Import is intended for a pilot workspace and should not target the seeded demo scenarios.
          </p>
          {statusMessage ? (
            <p className="mt-4 rounded-tile border border-profit/20 bg-profit/10 p-4 text-sm leading-6 text-profit">
              {statusMessage}
            </p>
          ) : null}
          {errorMessage ? (
            <p className="mt-4 rounded-tile border border-danger/20 bg-danger/10 p-4 text-sm leading-6 text-danger">
              {errorMessage}
            </p>
          ) : null}
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Panel>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Export and reset</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              className="rounded-full border border-accent/30 bg-accent/10 px-4 py-2 text-sm text-accent transition hover:border-accent/60 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!selectedDataset?.id || busyAction !== null}
              onClick={() => {
                void handleExport();
              }}
              type="button"
            >
              {busyAction === "export" ? "Exporting..." : "Export dataset"}
            </button>
            <button
              className="rounded-full border border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger transition hover:border-danger/60 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!selectedDataset?.id || busyAction !== null}
              onClick={() => {
                void handleReset();
              }}
              type="button"
            >
              {busyAction === "reset" ? "Resetting..." : "Reset current dataset"}
            </button>
          </div>
          <p className="mt-4 text-sm leading-6 text-muted">
            Reset warning: invoices, cost history, alerts, and OCR jobs for this dataset are cleared back to baseline.
          </p>
          <label className="mt-4 block text-sm font-medium text-text" htmlFor="export-json">
            Export JSON
          </label>
          <textarea
            className="mt-3 min-h-[22rem] w-full rounded-tile border border-border bg-black/20 p-4 font-mono text-xs leading-6 text-text outline-none transition focus:border-accent/40"
            id="export-json"
            readOnly
            value={exportJson}
          />
        </Panel>

        <Panel>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Import pilot workspace JSON</p>
          <p className="mt-3 text-sm leading-6 text-muted">
            Import is intentionally limited. Use it for a pilot workspace id such as <span className="text-text">pilot-workspace</span>, not the seeded demo datasets.
          </p>
          <label className="mt-4 block text-sm font-medium text-text" htmlFor="import-json">
            Dataset JSON
          </label>
          <textarea
            className="mt-3 min-h-[22rem] w-full rounded-tile border border-border bg-black/20 p-4 font-mono text-xs leading-6 text-text outline-none transition focus:border-accent/40"
            id="import-json"
            onChange={(event) => setImportJson(event.target.value)}
            placeholder='Paste a dataset export payload here for a pilot workspace import.'
            value={importJson}
          />
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-text transition hover:border-accent/30 hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
              disabled={importJson.trim().length === 0 || busyAction !== null}
              onClick={() => {
                void handleImport();
              }}
              type="button"
            >
              {busyAction === "import" ? "Importing..." : "Import pilot dataset"}
            </button>
          </div>
        </Panel>
      </section>
    </div>
  );
}
