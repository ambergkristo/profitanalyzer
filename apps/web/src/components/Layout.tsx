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
  const datasets = useAsyncData(loadDatasets);

  useEffect(() => {
    if (!datasetId && datasets.data?.[0]?.id) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("dataset", datasets.data[0].id);
      setSearchParams(nextParams, { replace: true });
    }
  }, [datasetId, datasets.data, searchParams, setSearchParams]);

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
                  Scenario-switchable decision cockpit for margin repair, profit protection, and price testing.
                </p>
              </div>

              {datasets.data ? (
                <ScenarioSelector
                  datasets={datasets.data}
                  onChange={handleDatasetChange}
                  selectedDatasetId={selectedDataset?.id}
                />
              ) : null}
            </div>

            <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
              <Panel className="rounded-tile border-white/8 bg-black/20 px-4 py-4" tone="subtle">
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted">Active demo profile</p>
                <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-display text-2xl text-text">
                      {selectedDataset?.name ?? "Loading scenario"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted">
                      {selectedDataset?.ownerDiagnosis ?? "Loading scenario metadata..."}
                    </p>
                    {selectedDataset ? (
                      <p className="mt-2 text-sm leading-6 text-muted">{selectedDataset.description}</p>
                    ) : null}
                  </div>
                  <nav className="flex flex-wrap gap-2">
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
                  </nav>
                </div>
              </Panel>
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
