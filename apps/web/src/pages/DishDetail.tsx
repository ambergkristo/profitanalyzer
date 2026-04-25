import { useCallback } from "react";
import { useParams } from "react-router-dom";

import { apiClient } from "../api/client.js";
import { StatusTag } from "../components/StatusTag.js";
import { useAsyncData } from "../hooks.js";
import { formatEuro, formatPercent } from "../utils/format.js";

export function DishDetailPage() {
  const params = useParams<{ dishId: string }>();
  const dishId = params.dishId ?? "";
  const loadDishDetail = useCallback(() => apiClient.getDishDetail(dishId), [dishId]);
  const { data, loading, error } = useAsyncData(loadDishDetail);

  if (loading) {
    return <StatePanel title="Loading dish detail" message="Tracing the current cost structure and explanation..." />;
  }

  if (error || !data) {
    return (
      <StatePanel
        title="Dish detail unavailable"
        message="The detailed profitability view could not be loaded. Confirm the backend is available."
      />
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-[2rem] border border-border bg-panel p-6 shadow-telemetry">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Dish detail</p>
            <h2 className="mt-2 font-display text-4xl text-text">{data.dish.name}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{data.whyThisMatters}</p>
          </div>
          <StatusTag status={data.status} />
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <MetricCard label="Price" value={formatEuro(data.calculated.priceCents)} />
          <MetricCard label="Cost" value={formatEuro(data.calculated.costCents)} />
          <MetricCard label="Margin" value={formatPercent(data.calculated.marginPercent)} />
          <MetricCard label="Profit per sale" value={formatEuro(data.calculated.grossProfitPerSaleCents)} />
          <MetricCard label="Estimated period profit" value={formatEuro(data.calculated.estimatedPeriodProfitCents)} />
          <MetricCard label="Sales volume" value={`${data.calculated.salesVolume}`} />
        </div>

        <div className="mt-8 rounded-3xl border border-white/8 bg-black/20 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Cost driver explanation</p>
          <p className="mt-3 text-sm leading-6 text-text">{data.explanation}</p>
        </div>
      </section>

      <section className="rounded-[2rem] border border-border bg-panel p-6 shadow-telemetry">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">Ingredient breakdown</p>
        <h3 className="mt-2 font-display text-3xl">Where the cost comes from</h3>
        <div className="mt-6 space-y-3">
          {data.ingredientBreakdown.map((item) => (
            <div key={item.ingredientId} className="rounded-3xl border border-border bg-white/[0.02] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-text">{item.ingredientName}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted">
                    {item.quantity} {item.unit}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted">Total cost</p>
                  <p className="mt-2 text-lg text-text">{formatEuro(item.totalCostCents)}</p>
                </div>
              </div>
              {item.isMissing ? (
                <p className="mt-3 text-sm text-danger">Missing ingredient cost data for this line.</p>
              ) : (
                <p className="mt-3 text-sm text-muted">
                  Unit cost {item.unitCostCents !== null ? formatEuro(item.unitCostCents) : "n/a"} per {item.unit}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/8 bg-white/[0.02] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-3 font-display text-3xl text-text">{value}</p>
    </div>
  );
}

function StatePanel({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-[2rem] border border-border bg-panel p-8 shadow-telemetry">
      <h2 className="font-display text-3xl text-text">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-muted">{message}</p>
    </div>
  );
}
