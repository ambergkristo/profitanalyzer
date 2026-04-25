import { Link } from "react-router-dom";

import type { DishAction } from "../types.js";
import { formatEuro, formatPercent } from "../utils/format.js";
import { SeverityBadge } from "./SeverityBadge.js";

const severityStyles = {
  critical: "border-danger/40 bg-danger/10",
  high: "border-warning/35 bg-warning/10",
  medium: "border-accent/25 bg-accent/8",
  low: "border-profit/25 bg-profit/8"
} as const;

interface ActionCardProps {
  action: DishAction;
  dishName?: string;
  datasetId?: string;
}

export function ActionCard({ action, dishName, datasetId }: ActionCardProps) {
  return (
    <div className={`rounded-[1.75rem] border p-5 shadow-telemetry ${severityStyles[action.severity]}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <SeverityBadge severity={action.severity} />
            <span className="text-xs uppercase tracking-[0.16em] text-muted">{dishName ?? action.dishId}</span>
          </div>
          <div>
            <h3 className="font-display text-2xl text-text">{action.title}</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{action.message}</p>
          </div>
        </div>

        <div className="grid min-w-[200px] gap-3 rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
          <Metric label="Estimated impact" value={formatEuro(action.estimatedImpactCents)} />
          <Metric label="Confidence" value={action.confidence} />
          {typeof action.currentMarginPercent === "number" ? (
            <Metric label="Current margin" value={formatPercent(action.currentMarginPercent)} />
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {action.reasonCodes.map((reasonCode) => (
          <span
            key={reasonCode}
            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-muted"
          >
            {reasonCode.replaceAll("_", " ")}
          </span>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between gap-4">
        <div className="text-xs uppercase tracking-[0.16em] text-muted">
          {action.recommendedPriceCents
            ? `Suggested price ${formatEuro(action.recommendedPriceCents)}`
            : "No direct price target"}
        </div>
        <Link
          className="text-sm font-medium text-accent"
          to={`/dishes/${action.dishId}${datasetId ? `?dataset=${encodeURIComponent(datasetId)}` : ""}`}
        >
          View dish
        </Link>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 text-lg text-text">{value}</p>
    </div>
  );
}
