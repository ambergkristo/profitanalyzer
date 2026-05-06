import { useCallback, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { apiClient } from "../api/client.js";
import { SeverityBadge } from "../components/SeverityBadge.js";
import { StatePanel } from "../components/StatePanel.js";
import {
  CompactMetric,
  ContextPanel,
  EmptyWorkspaceState,
  WorkspaceDetailPanel,
  WorkspaceGrid,
  WorkspaceHeader,
  WorkspaceList,
  WorkspacePage
} from "../components/Workspace.js";
import { useAsyncData } from "../hooks.js";
import type { PriceChangeAlert } from "../types.js";
import { formatEuro } from "../utils/format.js";
import { buildDatasetSearch } from "../utils/scenario.js";

export function AlertsPage() {
  const [searchParams] = useSearchParams();
  const datasetId = searchParams.get("dataset") ?? undefined;
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const loadAlerts = useCallback(() => apiClient.getPriceChangeAlerts(datasetId), [datasetId]);
  const alerts = useAsyncData(loadAlerts);

  const selectedAlert = useMemo(
    () => alerts.data?.find((alert) => alert.id === selectedAlertId) ?? alerts.data?.[0],
    [alerts.data, selectedAlertId]
  );

  if (alerts.loading) {
    return <StatePanel message="Loading open supplier-price alerts and affected dishes..." title="Loading supplier alerts" tone="loading" />;
  }

  if (alerts.error || !alerts.data) {
    return <StatePanel actions={[{ href: "/", label: "Open dashboard" }]} message="Backend is not reachable. Start the API with npm run dev." title="Supplier alerts unavailable" tone="error" />;
  }

  return (
    <WorkspacePage>
      <WorkspaceHeader
        description="Work confirmed supplier price movement as a prioritized menu risk list."
        eyebrow="Alerts workspace"
        title="Supplier cost pressure"
      />

      <div className="grid gap-3 md:grid-cols-3">
        <CompactMetric label="Open alerts" value={alerts.data.length} />
        <CompactMetric label="High severity" tone="warning" value={alerts.data.filter((alert) => alert.severity === "high").length} />
        <CompactMetric label="Affected dishes" value={new Set(alerts.data.flatMap((alert) => alert.affectedDishIds)).size} />
      </div>

      <WorkspaceGrid>
        <ContextPanel className="min-h-0">
          {alerts.data.length === 0 ? (
            <EmptyWorkspaceState message="Confirm an invoice to see cost-change impact." title="No open supplier alerts" />
          ) : (
            <WorkspaceList className="max-h-[34rem]">
              {alerts.data.map((alert) => (
                <button
                  className={`w-full rounded-[1.5rem] border p-4 text-left transition hover:border-accent/50 ${
                    selectedAlert?.id === alert.id ? "border-accent/60 bg-accent/10" : "border-border bg-elevated"
                  }`}
                  key={alert.id}
                  onClick={() => setSelectedAlertId(alert.id)}
                  type="button"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <SeverityBadge severity={alert.severity} />
                    <span className="text-sm text-muted">{alert.supplierName ?? "Unknown supplier"}</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-text">{alert.message}</p>
                  <p className="mt-2 text-xs text-muted">{alert.affectedDishNames?.join(", ") ?? "No affected dish names"}</p>
                </button>
              ))}
            </WorkspaceList>
          )}
        </ContextPanel>

        <WorkspaceDetailPanel>
          {selectedAlert ? (
            <AlertDetail alert={selectedAlert} datasetId={datasetId} />
          ) : (
            <EmptyWorkspaceState message="Select an alert to review affected dishes and source invoice context." title="No alert selected" />
          )}
        </WorkspaceDetailPanel>
      </WorkspaceGrid>
    </WorkspacePage>
  );
}

function AlertDetail({ alert, datasetId }: { alert: PriceChangeAlert; datasetId?: string }) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SeverityBadge severity={alert.severity} />
        <span className="rounded-full border border-border px-3 py-1 text-xs text-muted">{alert.status}</span>
      </div>
      <h2 className="mt-4 text-3xl font-bold tracking-[-0.04em] text-text">Supplier price alert</h2>
      <p className="mt-3 text-sm leading-6 text-muted">{alert.recommendedAction}</p>

      <div className="mt-5 grid gap-3">
        <CompactMetric label="Previous cost" value={typeof alert.previousCostPerUnitCents === "number" ? formatEuro(alert.previousCostPerUnitCents) : "Baseline"} />
        <CompactMetric label="New cost" value={formatEuro(alert.newCostPerUnitCents)} />
        <CompactMetric label="Delta" tone="warning" value={typeof alert.deltaPercent === "number" ? `${alert.deltaPercent > 0 ? "+" : ""}${alert.deltaPercent.toFixed(1)}%` : "n/a"} />
        <CompactMetric label="Period impact" tone="danger" value={typeof alert.estimatedMarginImpactCents === "number" ? formatEuro(alert.estimatedMarginImpactCents) : "n/a"} />
      </div>

      <div className="mt-5 rounded-[1.5rem] border border-border bg-elevated p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Source invoice</p>
        <p className="mt-2 text-sm text-text">{alert.sourceInvoiceNumber ?? "Manual draft"}</p>
        <p className="mt-1 text-sm text-muted">{alert.sourceInvoiceDate ?? "Unknown date"}</p>
      </div>

      {alert.affectedDishIds[0] ? (
        <Link
          className="mt-5 inline-flex rounded-full bg-accent px-4 py-2 text-sm font-semibold text-bg"
          to={{ pathname: `/dishes/${alert.affectedDishIds[0]}`, search: buildDatasetSearch(datasetId) }}
        >
          Open affected dish
        </Link>
      ) : null}
    </div>
  );
}
