import { useCallback, useEffect } from "react";
import { NavLink, Outlet, useSearchParams } from "react-router-dom";

import { apiClient } from "../api/client.js";
import { useAsyncData } from "../hooks.js";
import { buildDatasetSearch, getScenarioMeta } from "../utils/scenario.js";
import { Panel } from "./Panel.js";
import { ScenarioSelector } from "./ScenarioSelector.js";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-4 py-2 text-sm font-medium transition ${
    isActive ? "bg-accent/15 text-accent" : "text-muted hover:text-text"
  }`;

export function Layout() {
  const [searchParams, setSearchParams] = useSearchParams();
  const datasetId = searchParams.get("dataset") ?? undefined;
  const loadDatasets = useCallback(() => apiClient.getDemoDatasets(), []);
  const loadConfig = useCallback(() => apiClient.getAppConfig(), []);
  const datasets = useAsyncData(loadDatasets);
  const config = useAsyncData(loadConfig);
  const appMode = config.data?.appMode ?? "demo";
  const isDemoMode = appMode === "demo";

  useEffect(() => {
    if (!datasetId && datasets.data?.length) {
      const nextParams = new URLSearchParams(searchParams);
      const preferredDatasetId =
        appMode === "pilot"
          ? datasets.data.find((dataset) => dataset.id === "pilot-workspace")?.id ?? datasets.data[0].id
          : datasets.data[0].id;
      nextParams.set("dataset", preferredDatasetId);
      setSearchParams(nextParams, { replace: true });
    }
  }, [appMode, datasetId, datasets.data, searchParams, setSearchParams]);

  const selectedDataset = datasets.data ? getScenarioMeta(datasets.data, datasetId) : undefined;

  function handleDatasetChange(nextDatasetId: string) {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("dataset", nextDatasetId);
    setSearchParams(nextParams);
  }

  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="mx-auto flex min-h-screen max-w-[1400px] flex-col px-4 py-6 md:px-6 xl:px-8">
        <header className="rounded-[2rem] border border-border bg-panel/90 p-5 shadow-telemetry backdrop-blur">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs uppercase tracking-[0.24em] text-accent">Menu Profit Optimizer</p>
                <h1 className="mt-3 font-display text-4xl leading-none md:text-6xl">Restaurant Profit Command Center</h1>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">
                  {isDemoMode
                    ? "Scenario-switchable decision cockpit for margin repair, profit protection, and price testing."
                    : "Pilot workspace for invoice-driven cost updates, supplier alerts, and decision-first menu reviews."}
                </p>
              </div>

              {datasets.data && isDemoMode ? (
                <ScenarioSelector
                  datasets={datasets.data}
                  onChange={handleDatasetChange}
                  selectedDatasetId={selectedDataset?.id}
                />
              ) : null}
            </div>

            <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
              <Panel className="rounded-tile border-white/8 bg-black/20 px-4 py-4" tone="subtle">
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted">
                  {isDemoMode ? "Active demo profile" : "Pilot workspace"}
                </p>
                <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-display text-2xl text-text">
                      {selectedDataset?.name ?? "Loading scenario"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted">
                      {selectedDataset?.ownerDiagnosis ??
                        (isDemoMode
                          ? "Loading scenario metadata..."
                          : "Pilot mode uses a single workspace and keeps invoice review-confirm safety active.")}
                    </p>
                    {selectedDataset ? (
                      <p className="mt-2 text-sm leading-6 text-muted">{selectedDataset.description}</p>
                    ) : null}
                    {config.data ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-full border border-white/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-text">
                          {config.data.appMode === "demo" ? "Demo mode" : "Pilot mode"}
                        </span>
                        <span className="rounded-full border border-white/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-muted">
                          Storage {config.data.storage.driver}
                        </span>
                        {config.data.features.externalOcrConfigured ? (
                          <span className="rounded-full border border-profit/20 bg-profit/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-profit">
                            External OCR configured
                          </span>
                        ) : (
                          <span className="rounded-full border border-warning/20 bg-warning/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-warning">
                            Fixture OCR default
                          </span>
                        )}
                      </div>
                    ) : null}
                  </div>
                  <nav className="flex flex-wrap gap-2">
                    <NavLink
                      className={linkClass}
                      to={{ pathname: "/onboarding", search: buildDatasetSearch(selectedDataset?.id) }}
                    >
                      Onboarding
                    </NavLink>
                    <NavLink
                      className={linkClass}
                      to={{ pathname: "/", search: buildDatasetSearch(selectedDataset?.id) }}
                    >
                      Dashboard
                    </NavLink>
                    <NavLink
                      className={linkClass}
                      to={{ pathname: "/dishes", search: buildDatasetSearch(selectedDataset?.id) }}
                    >
                      Dishes
                    </NavLink>
                    <NavLink
                      className={linkClass}
                      to={{ pathname: "/invoices", search: buildDatasetSearch(selectedDataset?.id) }}
                    >
                      Cost Intake
                    </NavLink>
                    <NavLink
                      className={linkClass}
                      to={{ pathname: "/alerts", search: buildDatasetSearch(selectedDataset?.id) }}
                    >
                      Supplier Alerts
                    </NavLink>
                    <NavLink
                      className={linkClass}
                      to={{ pathname: "/pilot-tools", search: buildDatasetSearch(selectedDataset?.id) }}
                    >
                      Pilot Tools
                    </NavLink>
                  </nav>
                </div>
              </Panel>
              {config.data?.storage.persistenceWarning ? (
                <Panel className="rounded-tile border-warning/25 bg-warning/[0.08] px-4 py-4" tone="warning">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-warning">Persistence warning</p>
                  <p className="mt-2 text-sm leading-6 text-text">
                    {config.data.storage.persistenceWarning}
                  </p>
                </Panel>
              ) : null}
            </div>
          </div>
        </header>

        <main className="mt-6 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
