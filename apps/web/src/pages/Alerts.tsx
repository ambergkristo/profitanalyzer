import { useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { apiClient } from "../api/client.js";
import { PageHeader } from "../components/PageHeader.js";
import { Panel } from "../components/Panel.js";
import { SectionHeader } from "../components/SectionHeader.js";
import { SeverityBadge } from "../components/SeverityBadge.js";
import { StatePanel } from "../components/StatePanel.js";
import { useAsyncData } from "../hooks.js";
import { formatEuro } from "../utils/format.js";
import { buildDatasetSearch } from "../utils/scenario.js";

export function AlertsPage() {
  const [searchParams] = useSearchParams();
  const datasetId = searchParams.get("dataset") ?? undefined;
  const loadAlerts = useCallback(
    () => apiClient.getPriceChangeAlerts(datasetId),
    [datasetId]
  );
  const alerts = useAsyncData(loadAlerts);

  if (alerts.loading) {
    return (
      <StatePanel
        message="Loading open supplier-price alerts and the dishes they can move first..."
        title="Loading supplier alerts"
        tone="loading"
      />
    );
  }

  if (alerts.error || !alerts.data) {
    return (
      <StatePanel
        message="Backend is not reachable. Start the API with npm run dev."
        title="Supplier alerts unavailable"
        tone="error"
        actions={[{ href: "/", label: "Open dashboard" }]}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Panel className="p-7">
        <PageHeader
          description="Open alerts show where confirmed supplier-cost changes have started to affect dish margin."
          eyebrow="Supplier alerts"
          title="Price changes that need a menu decision"
        />
      </Panel>

      <Panel>
        <SectionHeader
          description="These alerts are sorted by severity so the first items are the best next review targets."
          eyebrow="Open alerts"
          title="Latest supplier cost pressure"
        />
        <div className="mt-6 space-y-4">
          {alerts.data.length === 0 ? (
            <StatePanel
              message="No supplier price alerts yet. Confirm a sample or manual invoice to see cost-change impact."
              title="No open supplier alerts."
              tone="empty"
            />
          ) : (
            alerts.data.map((alert) => (
              <div key={alert.id} className="rounded-panel border border-border bg-black/20 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <SeverityBadge severity={alert.severity} />
                    <span className="text-xs uppercase tracking-[0.16em] text-muted">
                      {alert.type.replaceAll("_", " ")}
                    </span>
                    <span className="text-xs uppercase tracking-[0.16em] text-muted">
                      {alert.status}
                    </span>
                  </div>
                  <span className="text-sm text-muted">
                    {alert.supplierName ?? "Unknown supplier"}
                  </span>
                </div>

                <p className="mt-4 text-sm leading-6 text-text">{alert.message}</p>
                <p className="mt-2 text-sm leading-6 text-muted">{alert.recommendedAction}</p>

                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <AlertMetric
                    label="Previous cost"
                    value={
                      typeof alert.previousCostPerUnitCents === "number"
                        ? formatEuro(alert.previousCostPerUnitCents)
                        : "Baseline only"
                    }
                  />
                  <AlertMetric label="New cost" value={formatEuro(alert.newCostPerUnitCents)} />
                  <AlertMetric
                    label="Delta"
                    value={
                      typeof alert.deltaPercent === "number"
                        ? `${alert.deltaPercent > 0 ? "+" : ""}${alert.deltaPercent.toFixed(1)}%`
                        : "n/a"
                    }
                  />
                  <AlertMetric
                    label="Est. period impact"
                    value={
                      typeof alert.estimatedMarginImpactCents === "number"
                        ? formatEuro(alert.estimatedMarginImpactCents)
                        : "n/a"
                    }
                  />
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm leading-6 text-muted">
                    Source {alert.sourceInvoiceNumber ?? "manual draft"} on{" "}
                    {alert.sourceInvoiceDate ?? "unknown date"}.
                  </p>
                  {alert.affectedDishIds[0] ? (
                    <Link
                      className="text-sm font-medium text-accent"
                      to={{
                        pathname: `/dishes/${alert.affectedDishIds[0]}`,
                        search: buildDatasetSearch(datasetId)
                      }}
                    >
                      View affected dish
                    </Link>
                  ) : null}
                </div>

                {alert.affectedDishNames && alert.affectedDishNames.length > 0 ? (
                  <p className="mt-3 text-sm leading-6 text-muted">
                    Affected dishes: {alert.affectedDishNames.join(", ")}.
                  </p>
                ) : null}
              </div>
            ))
          )}
        </div>
      </Panel>
    </div>
  );
}

function AlertMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-tile border border-white/8 bg-white/[0.03] p-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 text-lg text-text">{value}</p>
    </div>
  );
}
