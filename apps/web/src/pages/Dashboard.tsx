import { useCallback } from "react";
import { Link } from "react-router-dom";

import { apiClient } from "../api/client.js";
import { ActionCard } from "../components/ActionCard.js";
import { DishRow } from "../components/DishRow.js";
import { KpiCard } from "../components/KpiCard.js";
import { useAsyncData } from "../hooks.js";
import { formatEuro, formatPercent } from "../utils/format.js";

export function DashboardPage() {
  const loadOverview = useCallback(() => apiClient.getOverview(), []);
  const loadDishes = useCallback(() => apiClient.getDishes(), []);
  const overview = useAsyncData(loadOverview);
  const dishes = useAsyncData(loadDishes);

  if (overview.loading || dishes.loading) {
    return <StatePanel title="Loading decision console" message="Pulling seeded restaurant performance data..." />;
  }

  if (overview.error || dishes.error || !overview.data || !dishes.data) {
    return (
      <StatePanel
        title="Backend unavailable"
        message="The dashboard could not load analytics. Make sure the API is running on http://localhost:3001."
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Estimated Period Profit" value={formatEuro(overview.data.estimatedPeriodProfitCents)} tone="profit" />
        <KpiCard label="Average Margin" value={formatPercent(overview.data.averageMarginPercent)} />
        <KpiCard label="Profitable Dishes" value={`${overview.data.profitableCount}`} tone="profit" />
        <KpiCard label="Warning / Loss" value={`${overview.data.warningCount} / ${overview.data.lossCount}`} tone={overview.data.lossCount > 0 ? "danger" : "warning"} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <div className="rounded-[2rem] border border-border bg-panel p-6 shadow-telemetry">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted">Top actions</p>
              <h2 className="mt-2 font-display text-3xl">What to fix first</h2>
            </div>
            <Link className="text-sm font-medium text-accent" to="/dishes">
              Open full dish list
            </Link>
          </div>
          <div className="mt-6 space-y-4">
            {overview.data.topActions.map((action) => (
              <ActionCard key={action.id} action={action} />
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-border bg-panel p-6 shadow-telemetry">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Decision snapshot</p>
          <h2 className="mt-2 font-display text-3xl">Dish performance preview</h2>
          <div className="mt-6 space-y-3">
            {dishes.data.slice(0, 3).map((dish) => (
              <DishRow key={dish.dishId} dish={dish} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function StatePanel({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-[2rem] border border-border bg-panel p-8 shadow-telemetry">
      <h2 className="font-display text-3xl text-text">{title}</h2>
      <p className="mt-3 max-w-xl text-sm leading-6 text-muted">{message}</p>
    </div>
  );
}
