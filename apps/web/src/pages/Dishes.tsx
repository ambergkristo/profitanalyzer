import { useCallback } from "react";

import { apiClient } from "../api/client.js";
import { DishRow } from "../components/DishRow.js";
import { useAsyncData } from "../hooks.js";

export function DishesPage() {
  const loadDishes = useCallback(() => apiClient.getDishes(), []);
  const { data, loading, error } = useAsyncData(loadDishes);

  if (loading) {
    return <StatePanel title="Loading dishes" message="Building the full margin table..." />;
  }

  if (error || !data) {
    return (
      <StatePanel
        title="Could not load dishes"
        message="The dish performance feed is unavailable. Confirm the backend is running and retry."
      />
    );
  }

  return (
    <section className="rounded-[2rem] border border-border bg-panel p-6 shadow-telemetry">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Dish performance</p>
          <h2 className="mt-2 font-display text-3xl">Decision-oriented dish table</h2>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-muted">
          Prices, costs, margin, and estimated profit are shown side by side so the operator can act without switching screens.
        </p>
      </div>
      <div className="mt-6 space-y-3">
        {data.map((dish) => (
          <DishRow key={dish.dishId} dish={dish} />
        ))}
      </div>
    </section>
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
