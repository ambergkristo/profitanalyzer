import { useCallback, useState } from "react";

import { apiClient } from "../api/client.js";
import { DishRow } from "../components/DishRow.js";
import { StatePanel } from "../components/StatePanel.js";
import { useAsyncData } from "../hooks.js";
import type { DishFilter, DishSortKey } from "../types.js";
import { filterAndSortDishes, mapPrimaryActionByDish } from "../utils/dishes.js";

const filters: DishFilter[] = ["all", "profitable", "warning", "loss"];

export function DishesPage() {
  const [filter, setFilter] = useState<DishFilter>("all");
  const [sortKey, setSortKey] = useState<DishSortKey>("margin");
  const loadDishes = useCallback(async () => {
    const [dishes, actions] = await Promise.all([apiClient.getDishes(), apiClient.getActions()]);

    return {
      dishes,
      actionMap: mapPrimaryActionByDish(actions)
    };
  }, []);
  const { data, loading, error } = useAsyncData(loadDishes);

  if (loading) {
    return <StatePanel title="Loading dishes" message="Ranking menu items by risk, profit, and sales volume..." />;
  }

  if (error || !data) {
    return (
      <StatePanel
        title="Could not load dishes"
        message="Backend is not reachable. Start the API with npm run dev."
      />
    );
  }

  if (data.dishes.length === 0) {
    return (
      <StatePanel title="No dish analytics" message="Add dish data before using the decision table." />
    );
  }

  const visibleDishes = filterAndSortDishes(data.dishes, filter, sortKey);

  return (
    <section className="rounded-[2rem] border border-border bg-panel p-6 shadow-telemetry">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Dish performance</p>
          <h2 className="mt-2 font-display text-3xl">Decision-oriented dish table</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            Filter by status, sort by commercial priority, and open any dish to inspect the cost drivers behind the number.
          </p>
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex flex-wrap gap-2">
            {filters.map((candidate) => (
              <button
                key={candidate}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  filter === candidate
                    ? "border-accent/40 bg-accent/10 text-accent"
                    : "border-border bg-black/20 text-muted hover:text-text"
                }`}
                onClick={() => setFilter(candidate)}
                type="button"
              >
                {candidate}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-3 rounded-full border border-border bg-black/20 px-4 py-2 text-sm text-muted">
            Sort by
            <select
              className="bg-transparent text-text outline-none"
              onChange={(event) => setSortKey(event.target.value as DishSortKey)}
              value={sortKey}
            >
              <option value="margin">Margin</option>
              <option value="estimatedProfit">Estimated profit</option>
              <option value="salesVolume">Sales volume</option>
              <option value="cost">Cost</option>
            </select>
          </label>
        </div>
      </div>

      {visibleDishes.length === 0 ? (
        <div className="mt-8 rounded-[1.75rem] border border-border bg-black/20 p-6">
          <p className="font-medium text-text">No dishes match this filter.</p>
          <p className="mt-2 text-sm leading-6 text-muted">Try a wider filter to see more decision options.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {visibleDishes.map((dish) => (
            <DishRow key={dish.dishId} dish={dish} actionHint={data.actionMap.get(dish.dishId)} />
          ))}
        </div>
      )}
    </section>
  );
}
