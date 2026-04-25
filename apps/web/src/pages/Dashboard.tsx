import { useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { apiClient } from "../api/client.js";
import { ActionCard } from "../components/ActionCard.js";
import { DishRow } from "../components/DishRow.js";
import { KpiCard } from "../components/KpiCard.js";
import { MenuHealthBar } from "../components/MenuHealthBar.js";
import { StatePanel } from "../components/StatePanel.js";
import { useAsyncData } from "../hooks.js";
import { formatEuro, formatPercent, getStatusLabel } from "../utils/format.js";
import { getScenarioDiagnosis } from "../utils/scenario.js";

export function DashboardPage() {
  const [searchParams] = useSearchParams();
  const datasetId = searchParams.get("dataset") ?? undefined;
  const loadDashboard = useCallback(async () => {
    const [overview, dishes, datasets] = await Promise.all([
      apiClient.getOverview(datasetId),
      apiClient.getDishes(datasetId),
      apiClient.getDemoDatasets()
    ]);

    return { overview, dishes, datasets };
  }, [datasetId]);
  const dashboard = useAsyncData(loadDashboard);

  if (dashboard.loading) {
    return (
      <StatePanel
        title="Loading decision console"
        message="Pulling profit actions, KPI performance, and the latest menu risk signals..."
      />
    );
  }

  if (dashboard.error || !dashboard.data) {
    return (
      <StatePanel
        title="Backend unavailable"
        message="Backend is not reachable. Start the API with npm run dev."
      />
    );
  }

  if (dashboard.data.dishes.length === 0) {
    return (
      <StatePanel
        title="No dishes loaded"
        message="Seed data is empty, so there is nothing to rank yet."
      />
    );
  }

  const { overview, dishes, datasets } = dashboard.data;
  const selectedDataset =
    datasets.find((dataset) => dataset.id === datasetId) ?? datasets[0];
  const dishNameById = new Map(dishes.map((dish) => [dish.dishId, dish.name]));
  const previewDishes = [...dishes]
    .sort((left, right) => left.contributionRank - right.contributionRank)
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="rounded-[2rem] border border-border bg-panel p-6 shadow-telemetry">
          <p className="text-xs uppercase tracking-[0.22em] text-accent">Scenario diagnosis</p>
          <h2 className="mt-3 font-display text-4xl text-text">{selectedDataset.name}</h2>
          <p className="mt-4 max-w-3xl text-lg leading-7 text-text">
            {getScenarioDiagnosis(selectedDataset.profile)}
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{selectedDataset.description}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs uppercase tracking-[0.18em] text-muted">
              {selectedDataset.profile}
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs uppercase tracking-[0.18em] text-muted">
              {overview.totalDishes} tracked dishes
            </span>
          </div>
        </div>

        <section className="rounded-[2rem] border border-border bg-panel p-6 shadow-telemetry">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Menu health</p>
          <h3 className="mt-2 font-display text-3xl">Profit split</h3>
          <p className="mt-3 text-sm leading-6 text-muted">
            Healthy menus skew profitable. Risk-heavy menus surface in warning and loss counts immediately.
          </p>
          <div className="mt-6">
            <MenuHealthBar
              lossCount={overview.lossCount}
              profitableCount={overview.profitableCount}
              warningCount={overview.warningCount}
            />
          </div>
        </section>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Estimated Period Profit" value={formatEuro(overview.estimatedPeriodProfitCents)} tone="profit" />
        <KpiCard label="Weighted Margin" value={formatPercent(overview.weightedAverageMarginPercent)} />
        <KpiCard label="Total Revenue" value={formatEuro(overview.totalRevenueCents)} />
        <KpiCard
          label="Dishes At Risk"
          value={`${overview.warningCount + overview.lossCount}`}
          tone={overview.lossCount > 0 ? "danger" : "warning"}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[2rem] border border-border bg-panel p-6 shadow-telemetry">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted">Priority actions</p>
              <h2 className="mt-2 font-display text-3xl">What to fix first</h2>
            </div>
            <Link className="text-sm font-medium text-accent" to={`/dishes?dataset=${encodeURIComponent(selectedDataset.id)}`}>
              Open full dish list
            </Link>
          </div>
          <div className="mt-6 space-y-4">
            {overview.topActions.map((action) => (
              <ActionCard
                key={action.id}
                action={action}
                datasetId={selectedDataset.id}
                dishName={dishNameById.get(action.dishId)}
              />
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-[2rem] border border-border bg-panel p-6 shadow-telemetry">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Risk radar</p>
            <h2 className="mt-2 font-display text-3xl">Riskiest dishes</h2>
            <div className="mt-6 space-y-3">
              {overview.riskiestDishes.map((dish) => (
                <Link
                  key={dish.dishId}
                  className="block rounded-[1.5rem] border border-border bg-black/20 p-4 transition hover:border-danger/30"
                  to={`/dishes/${dish.dishId}?dataset=${encodeURIComponent(selectedDataset.id)}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-display text-2xl text-text">{dish.name}</p>
                    <span className="text-xs uppercase tracking-[0.16em] text-danger">
                      {getStatusLabel(dish.status)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted">
                    Margin is {formatPercent(dish.marginPercent)} with {formatEuro(dish.grossProfitPerSaleCents)} gross profit per sale across {dish.salesVolume} sales.
                  </p>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-border bg-panel p-6 shadow-telemetry">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Profit contributors</p>
            <h2 className="mt-2 font-display text-3xl">What carries the menu</h2>
            <div className="mt-6 space-y-3">
              {overview.topProfitContributors.map((dish) => (
                <Link
                  key={dish.dishId}
                  className="flex items-center justify-between gap-4 rounded-[1.5rem] border border-border bg-white/[0.02] p-4 transition hover:border-profit/25"
                  to={`/dishes/${dish.dishId}?dataset=${encodeURIComponent(selectedDataset.id)}`}
                >
                  <div>
                    <p className="font-medium text-text">{dish.name}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted">
                      Rank #{dish.contributionRank} contributor
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted">Estimated profit</p>
                    <p className="mt-2 text-lg text-profit">{formatEuro(dish.estimatedPeriodProfitCents)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </section>

      <section className="rounded-[2rem] border border-border bg-panel p-6 shadow-telemetry">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Dish performance preview</p>
            <h2 className="mt-2 font-display text-3xl">Menu snapshot</h2>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-muted">
            Open any dish to inspect its margin, cost drivers, and a live price simulation.
          </p>
        </div>
        <div className="mt-6 space-y-3">
          {previewDishes.map((dish) => (
            <DishRow key={dish.dishId} datasetId={selectedDataset.id} dish={dish} />
          ))}
        </div>
      </section>
    </div>
  );
}
