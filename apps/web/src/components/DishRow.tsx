import { Link } from "react-router-dom";

import type { CalculatedDish, DishAction } from "../types.js";
import { formatEuro, formatPercent } from "../utils/format.js";
import { SeverityBadge } from "./SeverityBadge.js";
import { StatusTag } from "./StatusTag.js";

interface DishRowProps {
  dish: CalculatedDish;
  actionHint?: DishAction;
}

export function DishRow({ dish, actionHint }: DishRowProps) {
  return (
    <Link
      className="grid gap-4 rounded-[1.75rem] border border-border bg-panel p-5 shadow-telemetry transition hover:border-accent/40 hover:bg-white/[0.02] xl:grid-cols-[1.6fr_repeat(5,minmax(0,1fr))]"
      to={`/dishes/${dish.dishId}`}
    >
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-display text-2xl text-text">{dish.name}</p>
          <StatusTag status={dish.status} />
        </div>
        <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted">
          Sales volume {dish.salesVolume} • Contribution rank #{dish.contributionRank}
        </p>
        {actionHint ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <SeverityBadge severity={actionHint.severity} />
            <p className="text-sm leading-6 text-muted">{actionHint.title}</p>
          </div>
        ) : (
          <p className="mt-4 text-sm leading-6 text-muted">
            Margin holds at {formatPercent(dish.marginPercent)} with {formatEuro(dish.grossProfitPerSaleCents)} gross profit per sale.
          </p>
        )}
      </div>

      <Metric label="Price" value={formatEuro(dish.priceCents)} />
      <Metric label="Cost" value={formatEuro(dish.costCents)} />
      <Metric label="Margin" value={formatPercent(dish.marginPercent)} />
      <Metric label="Profit / sale" value={formatEuro(dish.grossProfitPerSaleCents)} />
      <Metric label="Estimated profit" value={formatEuro(dish.estimatedPeriodProfitCents)} />
    </Link>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 text-lg text-text">{value}</p>
    </div>
  );
}
