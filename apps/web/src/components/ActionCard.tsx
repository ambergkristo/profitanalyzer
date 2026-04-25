import { Link } from "react-router-dom";

import type { RankedDishAction } from "../types.js";
import { formatEuro } from "../utils/format.js";

const severityStyles = {
  urgent: "border-danger/40 bg-danger/10",
  warning: "border-warning/40 bg-warning/10",
  opportunity: "border-profit/30 bg-profit/10"
} as const;

interface ActionCardProps {
  action: RankedDishAction;
}

export function ActionCard({ action }: ActionCardProps) {
  return (
    <div className={`rounded-3xl border p-5 shadow-telemetry ${severityStyles[action.severity]}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted">{action.severity}</p>
          <h3 className="mt-2 font-display text-2xl text-text">{action.title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted">{action.message}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-right">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">Potential</p>
          <p className="font-display text-lg text-text">{formatEuro(action.estimatedImpactCents)}</p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <span className="text-xs uppercase tracking-[0.16em] text-muted">Confidence: {action.confidence}</span>
        <Link className="text-sm font-medium text-accent" to={`/dishes/${action.dishId}`}>
          Inspect dish
        </Link>
      </div>
    </div>
  );
}
