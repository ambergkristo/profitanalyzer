import { useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { apiClient } from "../api/client.js";
import { Panel } from "../components/Panel.js";
import { SeverityBadge } from "../components/SeverityBadge.js";
import { StatePanel } from "../components/StatePanel.js";
import { useAsyncData } from "../hooks.js";
import { formatEuro, formatPercent } from "../utils/format.js";
import { buildDatasetSearch } from "../utils/scenario.js";

export function DashboardPage() {
  const [searchParams] = useSearchParams();
  const datasetId = searchParams.get("dataset") ?? undefined;
  const loadDashboard = useCallback(async () => {
    const [overview, dishes, alerts, ocrJobs] = await Promise.all([
      apiClient.getOverview(datasetId),
      apiClient.getDishes(datasetId),
      apiClient.getPriceChangeAlerts(datasetId),
      apiClient.getOcrJobs(datasetId)
    ]);

    return { overview, dishes, alerts, ocrJobs };
  }, [datasetId]);
  const dashboard = useAsyncData(loadDashboard);

  if (dashboard.loading) {
    return <StatePanel message="Loading profit, margin, and supplier signals." title="Loading overview" tone="loading" />;
  }

  if (dashboard.error || !dashboard.data) {
    return (
      <StatePanel
        actions={[{ href: "/", label: "Open overview" }]}
        message="Restaurant data could not be loaded."
        title="Overview unavailable"
        tone="error"
      />
    );
  }

  const { overview, dishes, alerts, ocrJobs } = dashboard.data;
  const dishNameById = new Map(dishes.map((dish) => [dish.dishId, dish.name]));
  const dishesAtRisk = overview.warningCount + overview.lossCount;
  const recentJobs = ocrJobs.slice(0, 4);

  return (
    <div className="grid h-full min-h-[calc(100vh-7rem)] gap-4 xl:grid-cols-[minmax(0,1.3fr)_22rem]">
      <section className="grid min-h-0 gap-4 xl:grid-rows-[auto_minmax(0,1fr)]">
        <div className="grid gap-3 md:grid-cols-4">
          <Metric label="Estimated profit" value={formatEuro(overview.estimatedPeriodProfitCents)} />
          <Metric label="Weighted margin" value={formatPercent(overview.weightedAverageMarginPercent)} />
          <Metric label="Revenue" value={formatEuro(overview.totalRevenueCents)} />
          <Metric label="Dishes at risk" tone={dishesAtRisk > 0 ? "warning" : "profit"} value={String(dishesAtRisk)} />
        </div>

        <div className="grid min-h-0 gap-4 xl:grid-cols-[1fr_0.9fr]">
          <Panel className="min-h-0 rounded-[2rem]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Priority actions</p>
                <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-text">What needs a decision</h2>
              </div>
              <Link className="text-sm font-semibold text-accent" to={{ pathname: "/dishes", search: buildDatasetSearch(datasetId) }}>
                Open menu
              </Link>
            </div>
            <div className="work-scroll mt-5 max-h-[30rem] space-y-3 overflow-y-auto pr-1">
              {overview.topActions.slice(0, 5).map((action) => (
                <Link
                  className="block rounded-2xl border border-border bg-white/[0.03] p-4 transition hover:border-accent/40"
                  key={action.id}
                  to={{ pathname: `/dishes/${action.dishId}`, search: buildDatasetSearch(datasetId) }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-text">{action.title}</p>
                      <p className="mt-2 text-sm leading-6 text-muted">{dishNameById.get(action.dishId) ?? action.message}</p>
                    </div>
                    <SeverityBadge severity={action.severity} />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-profit">{formatEuro(action.estimatedImpactCents)} opportunity</p>
                </Link>
              ))}
            </div>
          </Panel>

          <div className="grid min-h-0 gap-4">
            <Panel className="rounded-[2rem]">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Menu pressure</p>
              <div className="mt-5 grid grid-cols-3 overflow-hidden rounded-2xl border border-border">
                <Split label="Profitable" value={overview.profitableCount} tone="profit" />
                <Split label="Warning" value={overview.warningCount} tone="warning" />
                <Split label="Loss" value={overview.lossCount} tone="danger" />
              </div>
            </Panel>

            <Panel className="min-h-0 rounded-[2rem]">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Lowest margin dishes</p>
              <div className="work-scroll mt-4 max-h-[17rem] space-y-2 overflow-y-auto pr-1">
                {overview.riskiestDishes.slice(0, 5).map((dish) => (
                  <Link
                    className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-white/[0.03] p-3"
                    key={dish.dishId}
                    to={{ pathname: `/dishes/${dish.dishId}`, search: buildDatasetSearch(datasetId) }}
                  >
                    <span className="text-sm font-semibold text-text">{dish.name}</span>
                    <span className="text-sm text-warning">{formatPercent(dish.marginPercent)}</span>
                  </Link>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      </section>

      <aside className="grid min-h-0 gap-4 xl:grid-rows-[1fr_1fr]">
        <Panel className="min-h-0 rounded-[2rem]">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Supplier alerts</p>
            <Link className="text-sm font-semibold text-accent" to={{ pathname: "/alerts", search: buildDatasetSearch(datasetId) }}>
              View
            </Link>
          </div>
          <div className="work-scroll mt-4 max-h-[20rem] space-y-3 overflow-y-auto pr-1">
            {alerts.length === 0 ? (
              <p className="rounded-2xl border border-border bg-white/[0.03] p-4 text-sm leading-6 text-muted">
                No supplier alerts yet. Confirm an invoice to start tracking cost movement.
              </p>
            ) : (
              alerts.slice(0, 5).map((alert) => (
                <div className="rounded-2xl border border-border bg-white/[0.03] p-4" key={alert.id}>
                  <SeverityBadge severity={alert.severity} />
                  <p className="mt-3 text-sm leading-6 text-text">{alert.message}</p>
                </div>
              ))
            )}
          </div>
        </Panel>

        <Panel className="min-h-0 rounded-[2rem]">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Recent cost intake</p>
            <Link className="text-sm font-semibold text-accent" to={{ pathname: "/invoices", search: buildDatasetSearch(datasetId) }}>
              New invoice
            </Link>
          </div>
          <div className="work-scroll mt-4 max-h-[20rem] space-y-3 overflow-y-auto pr-1">
            {recentJobs.length === 0 ? (
              <p className="rounded-2xl border border-border bg-white/[0.03] p-4 text-sm leading-6 text-muted">
                No OCR jobs yet. Upload or enter an invoice when supplier costs change.
              </p>
            ) : (
              recentJobs.map((job) => (
                <div className="rounded-2xl border border-border bg-white/[0.03] p-4" key={job.id}>
                  <p className="text-sm font-semibold text-text">{job.originalFileName}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted">{job.status}</p>
                </div>
              ))
            )}
          </div>
        </Panel>
      </aside>
    </div>
  );
}

function Metric({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "profit" | "warning" }) {
  const toneClass = tone === "profit" ? "text-profit" : tone === "warning" ? "text-warning" : "text-text";
  return (
    <div className="rounded-3xl border border-border bg-panel p-4 shadow-telemetry">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className={`mt-2 text-2xl font-bold tracking-[-0.04em] ${toneClass}`}>{value}</p>
    </div>
  );
}

function Split({ label, value, tone }: { label: string; value: number; tone: "profit" | "warning" | "danger" }) {
  const toneClass = tone === "profit" ? "text-profit" : tone === "warning" ? "text-warning" : "text-danger";
  return (
    <div className="border-r border-border p-4 last:border-r-0">
      <p className={`text-2xl font-bold ${toneClass}`}>{value}</p>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </div>
  );
}
