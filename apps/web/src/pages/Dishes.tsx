import { useCallback, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { apiClient } from "../api/client.js";
import { ActionButton } from "../components/ActionButton.js";
import { MenuHealthBar } from "../components/MenuHealthBar.js";
import { StatePanel } from "../components/StatePanel.js";
import {
  CompactMetric,
  ContextPanel,
  EmptyWorkspaceState,
  WorkspaceActionBar,
  WorkspaceDetailPanel,
  WorkspaceGrid,
  WorkspaceHeader,
  WorkspaceList,
  WorkspacePage,
  WorkspaceToolbar
} from "../components/Workspace.js";
import { useAsyncData } from "../hooks.js";
import type { CalculatedDish, DishAction, DishFilter, DishSortKey } from "../types.js";
import { filterAndSortDishes, mapPrimaryActionByDish } from "../utils/dishes.js";
import { formatEuro, formatPercent } from "../utils/format.js";
import { getScenarioMeta } from "../utils/scenario.js";

const filters: DishFilter[] = ["all", "profitable", "warning", "loss"];

export function DishesPage() {
  const [searchParams] = useSearchParams();
  const datasetId = searchParams.get("dataset") ?? undefined;
  const [filter, setFilter] = useState<DishFilter>("all");
  const [sortKey, setSortKey] = useState<DishSortKey>("riskPriority");
  const [selectedDishId, setSelectedDishId] = useState<string | null>(null);

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
  const selectedDish = visibleDishes.find((dish) => dish.dishId === selectedDishId) ?? visibleDishes[0];

  if (loading) {
    return <StatePanel message="Ranking menu items by risk, profit, and sales volume..." title="Loading dishes" tone="loading" />;
  }

  if (error || !data) {
    const missingScenario = error?.includes("404");
    return (
      <StatePanel
        actions={missingScenario ? [{ href: "/", label: "Open default dashboard" }] : undefined}
        message={missingScenario ? "The selected restaurant data is not available." : "Backend is not reachable. Start the API with npm run dev."}
        title={missingScenario ? "Menu unavailable" : "Could not load dishes"}
        tone="error"
      />
    );
  }

  if (data.dishes.length === 0) {
    return <StatePanel message="Add dish data before using the decision list." title="No dish analytics" tone="empty" />;
  }

  const selectedDataset = getScenarioMeta(data.datasets, datasetId) ?? data.datasets[0];

  return (
    <WorkspacePage>
      <WorkspaceHeader
        description="Rank dishes by margin pressure, sales volume, and action value without turning the menu into a spreadsheet."
        eyebrow="Menu workspace"
        meta={
          <>
            <span className="rounded-full border border-border px-3 py-1 text-xs text-muted">{selectedDataset.name}</span>
            <span className="rounded-full border border-border px-3 py-1 text-xs text-muted">{visibleDishes.length} visible dishes</span>
          </>
        }
        title="Menu decisions"
      />

      <div className="grid gap-3 md:grid-cols-4">
        <CompactMetric label="Total dishes" value={data.overview.totalDishes} />
        <CompactMetric label="Average margin" value={formatPercent(data.overview.weightedAverageMarginPercent)} />
        <CompactMetric label="Dishes at risk" tone="warning" value={data.overview.warningCount + data.overview.lossCount} />
        <CompactMetric label="Estimated profit" tone="success" value={formatEuro(data.overview.estimatedPeriodProfitCents)} />
      </div>

      <WorkspaceToolbar>
        <WorkspaceActionBar>
          {filters.map((candidate) => (
            <ActionButton key={candidate} onClick={() => setFilter(candidate)} variant={filter === candidate ? "primary" : "secondary"}>
              {candidate}
            </ActionButton>
          ))}
        </WorkspaceActionBar>

        <label className="flex items-center gap-3 rounded-full border border-border bg-elevated px-4 py-2 text-sm text-muted">
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
      </WorkspaceToolbar>

      <WorkspaceGrid className="flex-1">
        <ContextPanel className="min-h-0">
          {visibleDishes.length === 0 ? (
            <EmptyWorkspaceState message="Try a wider filter to see more decision options." title="No dishes match this filter." />
          ) : (
            <WorkspaceList className="max-h-[34rem]">
              {visibleDishes.map((dish) => (
                <DishDecisionRow
                  key={dish.dishId}
                  actionHint={data.actionMap.get(dish.dishId)}
                  datasetId={datasetId}
                  dish={dish}
                  isSelected={dish.dishId === selectedDish?.dishId}
                  onSelect={() => setSelectedDishId(dish.dishId)}
                />
              ))}
            </WorkspaceList>
          )}
        </ContextPanel>

        <WorkspaceDetailPanel className="min-h-0">
          {selectedDish ? (
            <DishPreview actionHint={data.actionMap.get(selectedDish.dishId)} datasetId={datasetId} dish={selectedDish} />
          ) : (
            <EmptyWorkspaceState message="Select a dish to see margin context." title="No dish selected" />
          )}
          <div className="mt-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Menu split</p>
            <div className="mt-4">
              <MenuHealthBar lossCount={data.overview.lossCount} profitableCount={data.overview.profitableCount} warningCount={data.overview.warningCount} />
            </div>
          </div>
        </WorkspaceDetailPanel>
      </WorkspaceGrid>
    </WorkspacePage>
  );
}

function DishDecisionRow({
  actionHint,
  dish,
  isSelected,
  onSelect
}: {
  actionHint?: DishAction;
  datasetId?: string;
  dish: CalculatedDish;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const tone =
    dish.status === "loss"
      ? "border-danger/40 bg-danger/10"
      : dish.status === "warning"
        ? "border-warning/35 bg-warning/10"
        : "border-success/25 bg-success/10";

  return (
    <button
      className={`w-full rounded-[1.5rem] border p-4 text-left transition hover:border-accent/50 ${isSelected ? "border-accent/60 bg-accent/10" : tone}`}
      onClick={onSelect}
      type="button"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-text">{dish.name}</p>
          <p className="mt-1 text-sm text-muted">{actionHint?.title ?? "Monitor margin and supplier changes."}</p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-right sm:min-w-[18rem]">
          <MiniValue label="Price" value={formatEuro(dish.priceCents)} />
          <MiniValue label="Cost" value={formatEuro(dish.costCents)} />
          <MiniValue label="Margin" value={formatPercent(dish.marginPercent)} />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
        <span>{dish.salesVolume} sales</span>
        <span>{formatEuro(dish.estimatedPeriodProfitCents)} period profit</span>
        <span>{dish.status}</span>
      </div>
    </button>
  );
}

function DishPreview({ actionHint, datasetId, dish }: { actionHint?: DishAction; datasetId?: string; dish: CalculatedDish }) {
  const search = datasetId ? `?dataset=${encodeURIComponent(datasetId)}` : "";
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">Selected dish</p>
      <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-text">{dish.name}</h2>
      <div className="mt-5 grid gap-3">
        <CompactMetric label="Margin" tone={dish.status === "loss" ? "danger" : dish.status === "warning" ? "warning" : "success"} value={formatPercent(dish.marginPercent)} />
        <CompactMetric label="Gross profit / sale" value={formatEuro(dish.grossProfitPerSaleCents)} />
        <CompactMetric label="Period profit" value={formatEuro(dish.estimatedPeriodProfitCents)} />
      </div>
      <div className="mt-5 rounded-[1.5rem] border border-border bg-elevated p-4">
        <p className="text-sm font-semibold text-text">{actionHint?.title ?? "No urgent action"}</p>
        <p className="mt-2 text-sm leading-6 text-muted">{actionHint?.message ?? "This dish is available for margin review and price simulation."}</p>
      </div>
      <Link className="mt-5 inline-flex rounded-full bg-accent px-4 py-2 text-sm font-semibold text-bg" to={`/dishes/${dish.dishId}${search}`}>
        Open dish detail
      </Link>
    </div>
  );
}

function MiniValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-text">{value}</p>
    </div>
  );
}
