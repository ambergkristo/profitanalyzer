import { useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { apiClient } from "../api/client.js";
import { ActionCard } from "../components/ActionCard.js";
import { DishRow } from "../components/DishRow.js";
import { KpiCard } from "../components/KpiCard.js";
import { MenuHealthBar } from "../components/MenuHealthBar.js";
import { PageHeader } from "../components/PageHeader.js";
import { Panel } from "../components/Panel.js";
import { SectionHeader } from "../components/SectionHeader.js";
import { SeverityBadge } from "../components/SeverityBadge.js";
import { StatePanel } from "../components/StatePanel.js";
import { useAsyncData } from "../hooks.js";
import { formatEuro, formatPercent, getStatusLabel } from "../utils/format.js";
import { buildDatasetSearch, getScenarioMeta } from "../utils/scenario.js";

export function DashboardPage() {
  const [searchParams] = useSearchParams();
  const datasetId = searchParams.get("dataset") ?? undefined;
  const loadDashboard = useCallback(async () => {
    const [overview, dishes, datasets, alerts] = await Promise.all([
      apiClient.getOverview(datasetId),
      apiClient.getDishes(datasetId),
      apiClient.getDemoDatasets(),
      apiClient.getPriceChangeAlerts(datasetId)
    ]);

    return { overview, dishes, datasets, alerts };
  }, [datasetId]);
  const dashboard = useAsyncData(loadDashboard);

  if (dashboard.loading) {
    return (
      <StatePanel
        message="Pulling profit actions, KPI performance, and the latest menu risk signals..."
        title="Loading decision console"
        tone="loading"
      />
    );
  }

  if (dashboard.error || !dashboard.data) {
    const missingScenario = dashboard.error?.includes("404");

    return (
      <StatePanel
        actions={missingScenario ? [{ href: "/", label: "Open default dashboard" }] : undefined}
        message={
          missingScenario
            ? "The selected scenario does not exist. Switch back to a valid demo dataset."
            : "Backend is not reachable. Start the API with npm run dev."
        }
        title={missingScenario ? "Scenario unavailable" : "Backend unavailable"}
        tone="error"
      />
    );
  }

  if (dashboard.data.dishes.length === 0) {
    return (
      <StatePanel
        message="Seed data is empty, so there is nothing to rank yet."
        title="No dishes loaded"
        tone="empty"
      />
    );
  }

  const { overview, dishes, datasets, alerts } = dashboard.data;
  const selectedDataset = getScenarioMeta(datasets, datasetId);

  if (!selectedDataset) {
    return (
      <StatePanel
        message="The selected scenario is not available. Switch back to a valid demo dataset."
        title="Scenario unavailable"
        tone="error"
        actions={[{ href: "/", label: "Open dashboard" }]}
      />
    );
  }

  const dishNameById = new Map(dishes.map((dish) => [dish.dishId, dish.name]));
  const previewDishes = [...dishes]
    .sort((left, right) => left.contributionRank - right.contributionRank)
    .slice(0, 6);
  const dishesAtRisk = overview.warningCount + overview.lossCount;

  return (
    <div className="space-y-6">
      <Panel className="p-7">
        <PageHeader
          actions={
            <Panel className="rounded-tile p-4" tone="subtle">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Scenario narrative</p>
              <p className="mt-3 text-sm leading-6 text-text">{selectedDataset.demoNarrative}</p>
              <p className="mt-3 text-sm leading-6 text-muted">{selectedDataset.expectedBehavior}</p>
            </Panel>
          }
          badges={
            <>
              <span className="rounded-full border border-white/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-muted">
                {selectedDataset.name}
              </span>
              <span className="rounded-full border border-white/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-muted">
                {selectedDataset.profile}
              </span>
              <span className="rounded-full border border-profit/20 bg-profit/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-profit">
                Synthetic validation {selectedDataset.validationStatus}
              </span>
            </>
          }
          description={selectedDataset.description}
          eyebrow="Dashboard diagnosis"
          title={selectedDataset.ownerDiagnosis}
        />
      </Panel>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          hint={`Top contributors are carrying ${formatEuro(overview.estimatedPeriodProfitCents)} this period.`}
          label="Estimated Period Profit"
          tone="profit"
          value={formatEuro(overview.estimatedPeriodProfitCents)}
        />
        <KpiCard
          hint={
            overview.weightedAverageMarginPercent < 30
              ? "Below the comfort zone. Repair high-sales leaks first."
              : "Weighted margin is holding above the warning floor."
          }
          label="Weighted Margin"
          tone={overview.weightedAverageMarginPercent < 30 ? "warning" : "default"}
          value={formatPercent(overview.weightedAverageMarginPercent)}
        />
        <KpiCard
          hint={`${overview.totalDishes} tracked dishes are feeding this revenue view.`}
          label="Total Revenue"
          value={formatEuro(overview.totalRevenueCents)}
        />
        <KpiCard
          hint={
            dishesAtRisk > 0
              ? `${overview.lossCount} loss dishes and ${overview.warningCount} warning dishes need attention.`
              : "No dishes are currently below the risk threshold."
          }
          label="Dishes At Risk"
          tone={overview.lossCount > 0 ? "danger" : dishesAtRisk > 0 ? "warning" : "profit"}
          value={`${dishesAtRisk}`}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel>
          <SectionHeader
            aside={
              <Link
                className="text-sm font-medium text-accent"
                to={{ pathname: "/dishes", search: buildDatasetSearch(selectedDataset.id) }}
              >
                Open full dish list
              </Link>
            }
            description="Start with the dishes that sell often, leak margin, or are already losing money."
            eyebrow="Priority actions"
            title="What to fix first"
          />
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
        </Panel>

        <div className="space-y-6">
          <Panel>
            <SectionHeader
              description="Healthy menus skew profitable. Risk-heavy menus show pressure immediately."
              eyebrow="Menu health"
              title="Profit split"
            />
            <div className="mt-6">
              <MenuHealthBar
                lossCount={overview.lossCount}
                profitableCount={overview.profitableCount}
                warningCount={overview.warningCount}
              />
            </div>
            <p className="mt-4 text-sm leading-6 text-muted">
              {selectedDataset.expectedBehavior}
            </p>
          </Panel>

          <Panel>
            <SectionHeader
              description="These dishes are the first places where weak margin or negative gross profit can drag the menu."
              eyebrow="Risk radar"
              title="Riskiest dishes"
            />
            <div className="mt-6 space-y-3">
              {overview.riskiestDishes.map((dish) => (
                <Link
                  key={dish.dishId}
                  className="block rounded-tile border border-border bg-black/20 p-4 transition hover:border-danger/30"
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
          </Panel>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel>
          <SectionHeader
            description="These dishes are carrying the current-period profit, so protect them before a cost move erodes the result."
            eyebrow="Profit contributors"
            title="What carries the menu"
          />
          <div className="mt-6 space-y-3">
            {overview.topProfitContributors.map((dish) => (
              <Link
                key={dish.dishId}
                className="flex items-center justify-between gap-4 rounded-tile border border-border bg-white/[0.02] p-4 transition hover:border-profit/25"
                to={`/dishes/${dish.dishId}?dataset=${encodeURIComponent(selectedDataset.id)}`}
              >
                <div>
                  <p className="font-medium text-text">{dish.name}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted">
                    Margin {formatPercent(dish.marginPercent)} | {dish.salesVolume} sales
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted">Estimated profit</p>
                  <p className="mt-2 text-lg text-profit">{formatEuro(dish.estimatedPeriodProfitCents)}</p>
                </div>
              </Link>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionHeader
            aside={
              <Link
                className="text-sm font-medium text-accent"
                to={{ pathname: "/alerts", search: buildDatasetSearch(selectedDataset.id) }}
              >
                Open all alerts
              </Link>
            }
            description="Confirmed invoice cost moves show up here with the first dishes likely to feel the change."
            eyebrow="Latest supplier price alerts"
            title="What changed since the last cost intake"
          />
          <div className="mt-6 space-y-3">
            {alerts.length === 0 ? (
              <StatePanel
                message="No supplier price alerts yet. Confirm a sample invoice to see cost-change impact."
                title="No supplier price alerts yet."
                tone="empty"
              />
            ) : (
              alerts.slice(0, 4).map((alert) => (
                <div key={alert.id} className="rounded-tile border border-border bg-white/[0.02] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <SeverityBadge severity={alert.severity} />
                    <span className="text-xs uppercase tracking-[0.16em] text-muted">
                      {alert.type.replaceAll("_", " ")}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-text">{alert.message}</p>
                  <p className="mt-2 text-sm leading-6 text-muted">{alert.recommendedAction}</p>
                  {typeof alert.estimatedMarginImpactCents === "number" ? (
                    <p className="mt-3 text-sm leading-6 text-warning">
                      Estimated period impact {formatEuro(alert.estimatedMarginImpactCents)}
                    </p>
                  ) : null}
                  {alert.affectedDishNames?.length ? (
                    <p className="mt-3 text-sm leading-6 text-muted">
                      Affected dishes: {alert.affectedDishNames.join(", ")}.
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel>
          <SectionHeader
            description="Open any dish to inspect its cost driver, review the recommendation, and run the live simulator."
            eyebrow="Dish performance preview"
            title="Menu snapshot"
          />
          <div className="mt-6 space-y-3">
            {previewDishes.map((dish) => (
              <DishRow key={dish.dishId} datasetId={selectedDataset.id} dish={dish} />
            ))}
          </div>
          {overview.dataQualityWarnings.length > 0 ? (
            <div className="mt-6 rounded-tile border border-warning/25 bg-warning/[0.08] p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-warning">Data quality warning</p>
              <div className="mt-3 space-y-2">
                {overview.dataQualityWarnings.map((warning) => (
                  <p key={warning} className="text-sm leading-6 text-text">
                    {warning}
                  </p>
                ))}
              </div>
            </div>
          ) : null}
        </Panel>
      </section>
    </div>
  );
}
