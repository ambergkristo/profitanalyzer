import { useCallback, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";

import { apiClient } from "../api/client.js";
import { ActionButton } from "../components/ActionButton.js";
import { StatePanel } from "../components/StatePanel.js";
import {
  CompactMetric,
  ContextPanel,
  EmptyWorkspaceState,
  WorkspaceDetailPanel,
  WorkspaceGrid,
  WorkspaceHeader,
  WorkspaceList,
  WorkspacePage,
  WorkspaceToolbar
} from "../components/Workspace.js";
import { useAsyncData } from "../hooks.js";
import type { Ingredient } from "../types.js";
import { formatEuro } from "../utils/format.js";

const units: Array<Ingredient["unit"]> = ["g", "ml", "piece"];

export function IngredientsPage() {
  const [searchParams] = useSearchParams();
  const datasetId = searchParams.get("dataset") ?? undefined;
  const [reloadKey, setReloadKey] = useState(0);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    void reloadKey;
    const [ingredients, dishes] = await Promise.all([
      apiClient.getIngredients(datasetId),
      apiClient.getDishes(datasetId)
    ]);
    return { ingredients, dishes };
  }, [datasetId, reloadKey]);
  const page = useAsyncData(loadData);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return page.data?.ingredients.filter((ingredient) => ingredient.name.toLowerCase().includes(normalized)) ?? [];
  }, [page.data?.ingredients, query]);
  const selected = filtered.find((ingredient) => ingredient.id === selectedId) ?? filtered[0];

  async function saveIngredient(event: FormEvent<HTMLFormElement>, ingredient?: Ingredient) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const rawName = form.get("name");
    const rawUnit = form.get("unit");
    const name = typeof rawName === "string" ? rawName.trim() : "";
    const unit = (typeof rawUnit === "string" ? rawUnit : "g") as Ingredient["unit"];
    const costPerUnitCents = Math.round(Number(form.get("costPerUnitCents") ?? 0));

    try {
      if (ingredient) {
        await apiClient.updateIngredient(ingredient.id, { name, unit, costPerUnitCents }, datasetId);
        setStatus("Ingredient updated.");
      } else {
        await apiClient.createIngredient({ name, unit, costPerUnitCents }, datasetId);
        setStatus("Ingredient added.");
        event.currentTarget.reset();
      }
      setError(null);
      setReloadKey((current) => current + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Ingredient save failed.");
      setStatus(null);
    }
  }

  if (page.loading) {
    return <StatePanel message="Loading ingredient costs and menu impact..." title="Loading ingredients" tone="loading" />;
  }

  if (page.error || !page.data) {
    return <StatePanel message="Backend is not reachable. Start the API with npm run dev." title="Ingredients unavailable" tone="error" />;
  }

  return (
    <WorkspacePage>
      <WorkspaceHeader
        description="Maintain the ingredient cost base that drives dish margin, invoice updates, and supplier alerts."
        eyebrow="Ingredient workspace"
        title="Ingredient costs"
      />

      <div className="grid gap-3 md:grid-cols-3">
        <CompactMetric label="Ingredients" value={page.data.ingredients.length} />
        <CompactMetric label="Menu dishes" value={page.data.dishes.length} />
        <CompactMetric label="Average cost" value={formatEuro(averageCost(page.data.ingredients))} />
      </div>

      <WorkspaceToolbar>
        <label className="w-full max-w-md text-sm text-muted">
          Search ingredients
          <input
            className="mt-2 w-full rounded-full border border-border bg-elevated px-4 py-2 text-text outline-none focus:border-accent/60"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Type an ingredient name"
            value={query}
          />
        </label>
        {status ? <p className="text-sm text-success">{status}</p> : null}
        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </WorkspaceToolbar>

      <WorkspaceGrid>
        <ContextPanel className="min-h-0">
          {filtered.length === 0 ? (
            <EmptyWorkspaceState message="Add ingredients or clear the search filter." title="No ingredients found" />
          ) : (
            <WorkspaceList className="max-h-[32rem]">
              {filtered.map((ingredient) => (
                <button
                  className={`w-full rounded-[1.35rem] border p-4 text-left transition hover:border-accent/50 ${
                    selected?.id === ingredient.id ? "border-accent/60 bg-accent/10" : "border-border bg-elevated"
                  }`}
                  key={ingredient.id}
                  onClick={() => setSelectedId(ingredient.id)}
                  type="button"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-semibold text-text">{ingredient.name}</p>
                    <p className="text-sm text-muted">
                      {formatEuro(ingredient.costPerUnitCents)} / {ingredient.unit}
                    </p>
                  </div>
                </button>
              ))}
            </WorkspaceList>
          )}
        </ContextPanel>

        <WorkspaceDetailPanel>
          {selected ? (
            <IngredientForm ingredient={selected} onSubmit={saveIngredient} />
          ) : (
            <EmptyWorkspaceState message="Select an ingredient to edit its cost and unit." title="No ingredient selected" />
          )}
          <div className="mt-5 rounded-[1.5rem] border border-border bg-elevated p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Add ingredient</p>
            <IngredientForm onSubmit={saveIngredient} />
          </div>
        </WorkspaceDetailPanel>
      </WorkspaceGrid>
    </WorkspacePage>
  );
}

function IngredientForm({
  ingredient,
  onSubmit
}: {
  ingredient?: Ingredient;
  onSubmit: (event: FormEvent<HTMLFormElement>, ingredient?: Ingredient) => Promise<void> | void;
}) {
  return (
    <form className="grid gap-3" onSubmit={(event) => void onSubmit(event, ingredient)}>
      {ingredient ? <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">Quick edit</p> : null}
      <label className="text-sm text-muted">
        Name
        <input className="mt-2 w-full rounded-2xl border border-border bg-bg px-4 py-3 text-text outline-none focus:border-accent/60" defaultValue={ingredient?.name ?? ""} name="name" required />
      </label>
      <label className="text-sm text-muted">
        Cost cents per unit
        <input className="mt-2 w-full rounded-2xl border border-border bg-bg px-4 py-3 text-text outline-none focus:border-accent/60" defaultValue={ingredient?.costPerUnitCents ?? 0} min={0} name="costPerUnitCents" type="number" />
      </label>
      <label className="text-sm text-muted">
        Unit
        <select className="mt-2 w-full rounded-2xl border border-border bg-bg px-4 py-3 text-text outline-none focus:border-accent/60" defaultValue={ingredient?.unit ?? "g"} name="unit">
          {units.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </select>
      </label>
      <ActionButton type="submit" variant="primary">{ingredient ? "Save ingredient" : "Add ingredient"}</ActionButton>
    </form>
  );
}

function averageCost(ingredients: Ingredient[]) {
  if (ingredients.length === 0) {
    return 0;
  }
  return Math.round(ingredients.reduce((total, ingredient) => total + ingredient.costPerUnitCents, 0) / ingredients.length);
}
