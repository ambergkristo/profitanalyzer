import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { apiClient } from "../api/client.js";
import { ActionButton } from "../components/ActionButton.js";
import { DishRow } from "../components/DishRow.js";
import { MenuHealthBar } from "../components/MenuHealthBar.js";
import { PageHeader } from "../components/PageHeader.js";
import { Panel } from "../components/Panel.js";
import { SectionHeader } from "../components/SectionHeader.js";
import { StatePanel } from "../components/StatePanel.js";
import { useAsyncData } from "../hooks.js";
import type { DishFilter, DishSortKey } from "../types.js";
import { filterAndSortDishes, mapPrimaryActionByDish } from "../utils/dishes.js";
import { getScenarioMeta } from "../utils/scenario.js";

const filters: DishFilter[] = ["all", "profitable", "warning", "loss"];

export function DishesPage() {
  const [searchParams] = useSearchParams();
  const datasetId = searchParams.get("dataset") ?? undefined;
  const [filter, setFilter] = useState<DishFilter>("all");
  const [sortKey, setSortKey] = useState<DishSortKey>("riskPriority");
  const loadDishes = useCallback(async () => {
    const [dishes, actions, overview, datasets] = await Promise.all([
      apiClient.getDishes(datasetId),
      apiClient.getActions(datasetId),
      apiClient.getOverview(datasetId),
      apiClient.getDemoDatasets()
    ]);

    return {
      dishes,
      overview,
      datasets,
      actionMap: mapPrimaryActionByDish(actions)
    };
  }, [datasetId]);
  const { data, loading, error } = useAsyncData(loadDishes);

  const visibleDishes = useMemo(
    () => (data ? filterAndSortDishes(data.dishes, filter, sortKey, data.actionMap) : []),
    [data, filter, sortKey]
  );

  if (loading) {
    return (
      <StatePanel
        message="Ranking menu items by risk, profit, and sales volume..."
        title="Loading dishes"
        tone="loading"
      />
    );
  }

  if (error || !data) {
    const missingScenario = error?.includes("404");

    return (
      <StatePanel
        actions={missingScenario ? [{ href: "/", label: "Open default dashboard" }] : undefined}
        message={
          missingScenario
            ? "The selected scenario does not exist. Switch back to a valid demo dataset."
            : "Backend is not reachable. Start the API with npm run dev."
        }
        title={missingScenario ? "Scenario unavailable" : "Could not load dishes"}
        tone="error"
      />
    );
  }

  if (data.dishes.length === 0) {
    return (
      <StatePanel
        message="Add dish data before using the decision list."
        title="No dish analytics"
        tone="empty"
      />
    );
  }

  const selectedDataset = getScenarioMeta(data.datasets, datasetId);

  if (!selectedDataset) {
    return (
      <StatePanel
        message="The selected scenario is not available. Switch back to a valid demo dataset."
        title="Scenario unavailable"
        tone="error"
      />
    );
  }

  return (
    <div className="space-y-6">
      <Panel className="p-7">
        <PageHeader
          actions={
            <Panel className="rounded-tile p-4" tone="subtle">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Expected behavior</p>
              <p className="mt-3 text-sm leading-6 text-text">{selectedDataset.expectedBehavior}</p>
            </Panel>
          }
          badges={
            <>
              <span className="rounded-full border border-white/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-muted">
                {visibleDishes.length} visible dishes
              </span>
              <span className="rounded-full border border-white/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-muted">
                {selectedDataset.profile}
              </span>
            </>
          }
          description={selectedDataset.description}
          eyebrow="Decision list"
          title={selectedDataset.ownerDiagnosis}
        />
      </Panel>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel>
          <SectionHeader
            description="Switch between filter states to isolate leaks, or sort by risk priority to follow the action engine."
            eyebrow="Control strip"
            title="Filter and sort the menu"
          />

          <div className="mt-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="flex flex-wrap gap-2">
              {filters.map((candidate) => (
                <ActionButton
                  key={candidate}
                  onClick={() => setFilter(candidate)}
                  variant={filter === candidate ? "primary" : "secondary"}
                >
                  {candidate}
                </ActionButton>
              ))}
            </div>

            <label className="flex items-center gap-3 rounded-full border border-border bg-black/20 px-4 py-2 text-sm text-muted">
              Sort by
              <select
                aria-label="Sort dishes"
                className="bg-transparent text-text outline-none"
                onChange={(event) => setSortKey(event.target.value as DishSortKey)}
                value={sortKey}
              >
                <option value="riskPriority">Risk priority</option>
                <option value="margin">Margin</option>
                <option value="estimatedProfit">Estimated profit</option>
                <option value="salesVolume">Sales volume</option>
                <option value="cost">Cost</option>
              </select>
            </label>
          </div>
        </Panel>

        <Panel>
          <SectionHeader
            description="Use the split to explain whether the menu is healthy, pressured, or mixed before drilling into a dish."
            eyebrow="Menu health snapshot"
            title="Current split"
          />
          <div className="mt-6">
            <MenuHealthBar
              lossCount={data.overview.lossCount}
              profitableCount={data.overview.profitableCount}
              warningCount={data.overview.warningCount}
            />
          </div>
        </Panel>
      </section>

      <Panel>
        <SectionHeader
          aside={
            <span className="rounded-full border border-white/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-muted">
              {visibleDishes.length} results
            </span>
          }
          description="Each dish tile combines status, contribution, and the top action hint so owners can move quickly."
          eyebrow="Ranked dishes"
          title="Menu decisions"
        />

        {visibleDishes.length === 0 ? (
          <StatePanel
            message="Try a wider filter to see more decision options."
            title="No dishes match this filter."
            tone="empty"
          />
        ) : (
          <div className="mt-6 space-y-3">
            {visibleDishes.map((dish) => (
              <DishRow
                key={dish.dishId}
                actionHint={data.actionMap.get(dish.dishId)}
                datasetId={datasetId}
                dish={dish}
              />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
