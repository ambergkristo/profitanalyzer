import { Link } from "react-router-dom";

import type { CalculatedDish } from "../types.js";
import { formatEuro, formatPercent } from "../utils/format.js";
import { StatusTag } from "./StatusTag.js";

interface DishRowProps {
  dish: CalculatedDish;
}

export function DishRow({ dish }: DishRowProps) {
  return (
    <Link
      className="grid grid-cols-2 gap-4 rounded-3xl border border-border bg-panel p-4 shadow-telemetry transition hover:border-accent/40 hover:bg-white/[0.02] md:grid-cols-[2fr_repeat(5,minmax(0,1fr))_auto]"
      to={`/dishes/${dish.dishId}`}
    >
      <div>
        <p className="font-display text-xl text-text">{dish.name}</p>
        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted">Sales volume {dish.salesVolume}</p>
      </div>
      <Metric label="Price" value={formatEuro(dish.priceCents)} />
      <Metric label="Cost" value={formatEuro(dish.costCents)} />
      <Metric label="Margin" value={formatPercent(dish.marginPercent)} />
      <Metric label="Profit / sale" value={formatEuro(dish.grossProfitPerSaleCents)} />
      <Metric label="Estimated profit" value={formatEuro(dish.estimatedPeriodProfitCents)} />
      <div className="flex items-center justify-end">
        <StatusTag status={dish.status} />
      </div>
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
