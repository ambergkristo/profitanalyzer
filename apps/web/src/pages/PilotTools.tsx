import { useCallback, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";

import { apiClient } from "../api/client.js";
import { PageHeader } from "../components/PageHeader.js";
import { Panel } from "../components/Panel.js";
import { StatePanel } from "../components/StatePanel.js";
import { useAsyncData } from "../hooks.js";
import type {
  DatasetExportPayload,
  Dish,
  Ingredient,
  Recipe
} from "../types.js";
import { getScenarioMeta } from "../utils/scenario.js";

const ingredientUnits: Array<Ingredient["unit"]> = ["g", "ml", "piece"];

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR"
  }).format(cents / 100);
}

function readFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function readFormNumber(formData: FormData, key: string) {
  return Number(readFormString(formData, key));
}

interface PilotBootstrapData {
  config: Awaited<ReturnType<typeof apiClient.getAppConfig>>;
  datasets: Awaited<ReturnType<typeof apiClient.getDemoDatasets>>;
  deepHealth: Awaited<ReturnType<typeof apiClient.getDeepHealth>>;
  ingredients: Ingredient[];
  dishes: Dish[];
  recipes: Recipe[];
}

export function PilotToolsPage() {
  const [searchParams] = useSearchParams();
  const datasetId = searchParams.get("dataset") ?? undefined;
  const [reloadKey, setReloadKey] = useState(0);
  const [exportJson, setExportJson] = useState("");
  const [importJson, setImportJson] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<
    "export" | "reset" | "import" | "save-ingredient" | "save-dish" | "add-ingredient" | "add-dish" | null
  >(null);
  const [newIngredient, setNewIngredient] = useState({
    name: "",
    costPerUnitCents: "0",
    unit: "g" as Ingredient["unit"]
  });
  const [newDish, setNewDish] = useState({
    name: "",
    recipeId: "",
    priceCents: "0",
    salesVolume: "0"
  });

  const loadBootstrap = useCallback(async (): Promise<PilotBootstrapData> => {
    void reloadKey;
    const [config, datasets, deepHealth, ingredients, dishes, recipes] = await Promise.all([
      apiClient.getAppConfig(),
      apiClient.getDemoDatasets(),
      apiClient.getDeepHealth(),
      apiClient.getIngredients(datasetId),
      apiClient.getMenuDishes(datasetId),
      apiClient.getRecipes(datasetId)
    ]);

    return { config, datasets, deepHealth, ingredients, dishes, recipes };
  }, [datasetId, reloadKey]);

  const bootstrap = useAsyncData(loadBootstrap);

  const selectedDataset = useMemo(
    () =>
      bootstrap.data
        ? getScenarioMeta(bootstrap.data.datasets, datasetId) ?? bootstrap.data.datasets[0]
        : undefined,
    [bootstrap.data, datasetId]
  );

  function refreshAfterMutation(message: string) {
    setStatusMessage(message);
    setErrorMessage(null);
    setReloadKey((current) => current + 1);
  }

  if (bootstrap.loading) {
    return (
      <StatePanel
        title="Loading pilot tools"
        message="Checking storage mode, workspace controls, and pilot data setup."
        tone="loading"
      />
    );
  }

  if (bootstrap.error || !bootstrap.data) {
    return (
      <StatePanel
        title="Pilot tools unavailable"
        message="Backend is not reachable. Start the API with npm run dev."
        tone="error"
      />
    );
  }

  const bootstrapData = bootstrap.data;

  async function handleExport() {
    if (!selectedDataset?.id) {
      return;
    }

    setBusyAction("export");
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const payload = await apiClient.exportDataset(selectedDataset.id);
      setExportJson(`${JSON.stringify(payload, null, 2)}\n`);
      setStatusMessage(`Exported ${selectedDataset.name} into JSON snapshot format.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Export failed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleReset() {
    if (!selectedDataset?.id) {
      return;
    }

    setBusyAction("reset");
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const result = await apiClient.resetDataset(selectedDataset.id);
      setExportJson("");
      setImportJson("");
      refreshAfterMutation(
        `Reset ${result.datasetId}. Cleared ${result.clearedInvoices} invoices, ${result.clearedAlerts} alerts, and restored ${result.restoredDishCount} dishes.`
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Reset failed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleImport() {
    const seededDatasetIds = new Set(bootstrapData.datasets.map((dataset) => dataset.id));
    const targetDatasetId =
      datasetId && !seededDatasetIds.has(datasetId) ? datasetId : "pilot-workspace";

    setBusyAction("import");
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const payload = JSON.parse(importJson) as DatasetExportPayload;
      const result = await apiClient.importDataset(payload, targetDatasetId);
      refreshAfterMutation(
        `Imported ${result.datasetId} with ${result.dishCount} dishes, ${result.ingredientCount} ingredients, and ${result.supplierCount} suppliers.`
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleIngredientCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyAction("add-ingredient");
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      await apiClient.createIngredient(
        {
          name: newIngredient.name,
          costPerUnitCents: Number(newIngredient.costPerUnitCents),
          unit: newIngredient.unit
        },
        selectedDataset?.id
      );
      setNewIngredient({ name: "", costPerUnitCents: "0", unit: "g" });
      refreshAfterMutation("Added a new ingredient to the current workspace.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Ingredient creation failed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleIngredientUpdate(
    event: FormEvent<HTMLFormElement>,
    ingredientId: string
  ) {
    event.preventDefault();
    setBusyAction("save-ingredient");
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const formData = new FormData(event.currentTarget);
      await apiClient.updateIngredient(
        ingredientId,
        {
          name: readFormString(formData, "name"),
          costPerUnitCents: readFormNumber(formData, "costPerUnitCents"),
          unit: readFormString(formData, "unit") as Ingredient["unit"]
        },
        selectedDataset?.id
      );
      refreshAfterMutation("Saved ingredient changes.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Ingredient update failed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDishCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyAction("add-dish");
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      await apiClient.createDish(
        {
          name: newDish.name,
          recipeId: newDish.recipeId,
          priceCents: Number(newDish.priceCents),
          salesVolume: Number(newDish.salesVolume)
        },
        selectedDataset?.id
      );
      setNewDish({ name: "", recipeId: "", priceCents: "0", salesVolume: "0" });
      refreshAfterMutation("Added a new dish linked to the selected recipe.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Dish creation failed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDishUpdate(event: FormEvent<HTMLFormElement>, dishId: string) {
    event.preventDefault();
    setBusyAction("save-dish");
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const formData = new FormData(event.currentTarget);
      await apiClient.updateDish(
        dishId,
        {
          name: readFormString(formData, "name"),
          recipeId: readFormString(formData, "recipeId"),
          priceCents: readFormNumber(formData, "priceCents"),
          salesVolume: readFormNumber(formData, "salesVolume")
        },
        selectedDataset?.id
      );
      refreshAfterMutation("Saved dish pricing and volume changes.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Dish update failed.");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="space-y-6">
      <Panel className="p-7">
        <PageHeader
          eyebrow="Pilot tools"
          title="Set up the pilot workspace safely"
          description="Use these controls to persist pilot data, tune baseline menu costs, and recover the workspace without touching the invoice review-confirm boundary."
          badges={
            <>
              <span className="rounded-full border border-white/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-text">
                {bootstrapData.config.appMode === "demo" ? "Demo mode" : "Pilot mode"}
              </span>
              <span className="rounded-full border border-warning/20 bg-warning/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-warning">
                Storage {bootstrapData.config.storage.driver}
              </span>
            </>
          }
          actions={
            <Panel className="rounded-tile p-4" tone="subtle">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Current workspace</p>
              <p className="mt-3 text-sm leading-6 text-text">
                {selectedDataset?.name ?? "No dataset selected"}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">
                {selectedDataset?.description ??
                  "Choose a workspace through the dataset query param or the scenario selector."}
              </p>
              <p className="mt-4 text-sm leading-6 text-muted">
                {bootstrapData.config.storage.driver === "file"
                  ? `Changes are saved to local pilot data files${bootstrapData.config.storage.dataDir ? ` in ${bootstrapData.config.storage.dataDir}` : ""}.`
                  : "Changes reset when the API restarts."}
              </p>
            </Panel>
          }
        />
      </Panel>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Environment gate</p>
          <div className="mt-4 space-y-3">
            {bootstrapData.deepHealth.checks.map((check) => (
              <div key={check.key} className="rounded-tile border border-border bg-white/[0.02] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium capitalize text-text">{check.key.replaceAll("_", " ")}</p>
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.16em] ${
                      check.status === "pass"
                        ? "border border-profit/20 bg-profit/10 text-profit"
                        : check.status === "fail"
                          ? "border border-danger/20 bg-danger/10 text-danger"
                          : "border border-warning/20 bg-warning/10 text-warning"
                    }`}
                  >
                    {check.status}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted">{check.message}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel tone={bootstrapData.config.storage.driver === "file" ? "subtle" : "warning"}>
          <p className="text-[11px] uppercase tracking-[0.18em] text-warning">Storage status</p>
          <h2 className="mt-4 font-display text-3xl text-text">Controlled pilot persistence</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            {bootstrapData.config.storage.persistenceWarning ??
              "Persistent storage is active for the current pilot workspace."}
          </p>
          {statusMessage ? (
            <p className="mt-4 rounded-tile border border-profit/20 bg-profit/10 p-4 text-sm leading-6 text-profit">
              {statusMessage}
            </p>
          ) : null}
          {errorMessage ? (
            <p className="mt-4 rounded-tile border border-danger/20 bg-danger/10 p-4 text-sm leading-6 text-danger">
              {errorMessage}
            </p>
          ) : null}
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Panel>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Export and reset</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              className="rounded-full border border-accent/30 bg-accent/10 px-4 py-2 text-sm text-accent transition hover:border-accent/60 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!selectedDataset?.id || busyAction !== null}
              onClick={() => {
                void handleExport();
              }}
              type="button"
            >
              {busyAction === "export" ? "Exporting..." : "Export dataset"}
            </button>
            <button
              className="rounded-full border border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger transition hover:border-danger/60 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!selectedDataset?.id || busyAction !== null}
              onClick={() => {
                void handleReset();
              }}
              type="button"
            >
              {busyAction === "reset" ? "Resetting..." : "Reset current dataset"}
            </button>
          </div>
          <p className="mt-4 text-sm leading-6 text-muted">
            Reset warning: invoices, cost history, alerts, and OCR jobs for this dataset are cleared back to baseline.
          </p>
          <label className="mt-4 block text-sm font-medium text-text" htmlFor="export-json">
            Export JSON
          </label>
          <textarea
            className="mt-3 min-h-[18rem] w-full rounded-tile border border-border bg-black/20 p-4 font-mono text-xs leading-6 text-text outline-none transition focus:border-accent/40"
            id="export-json"
            readOnly
            value={exportJson}
          />
        </Panel>

        <Panel>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Import pilot workspace JSON</p>
          <p className="mt-3 text-sm leading-6 text-muted">
            Import is intentionally limited. Use it for a pilot workspace id such as <span className="text-text">pilot-workspace</span>, not the seeded demo scenarios.
          </p>
          <label className="mt-4 block text-sm font-medium text-text" htmlFor="import-json">
            Dataset JSON
          </label>
          <textarea
            className="mt-3 min-h-[18rem] w-full rounded-tile border border-border bg-black/20 p-4 font-mono text-xs leading-6 text-text outline-none transition focus:border-accent/40"
            id="import-json"
            onChange={(event) => setImportJson(event.target.value)}
            placeholder="Paste a dataset export payload here for a pilot workspace import."
            value={importJson}
          />
          <button
            className="mt-4 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-text transition hover:border-accent/30 hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
            disabled={importJson.trim().length === 0 || busyAction !== null}
            onClick={() => {
              void handleImport();
            }}
            type="button"
          >
            {busyAction === "import" ? "Importing..." : "Import pilot dataset"}
          </button>
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Panel>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Pilot data setup</p>
          <h2 className="mt-4 font-display text-3xl text-text">Ingredients</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Update current ingredient names, units, and baseline costs before the first pilot invoice lands.
          </p>

          <form className="mt-5 grid gap-3 md:grid-cols-3" onSubmit={(event) => void handleIngredientCreate(event)}>
            <input
              className="rounded-tile border border-border bg-black/20 px-4 py-3 text-sm text-text outline-none transition focus:border-accent/40"
              onChange={(event) => setNewIngredient((current) => ({ ...current, name: event.target.value }))}
              placeholder="New ingredient name"
              value={newIngredient.name}
            />
            <input
              className="rounded-tile border border-border bg-black/20 px-4 py-3 text-sm text-text outline-none transition focus:border-accent/40"
              min="0"
              onChange={(event) =>
                setNewIngredient((current) => ({ ...current, costPerUnitCents: event.target.value }))
              }
              placeholder="Cost in cents"
              type="number"
              value={newIngredient.costPerUnitCents}
            />
            <select
              className="rounded-tile border border-border bg-black/20 px-4 py-3 text-sm text-text outline-none transition focus:border-accent/40"
              onChange={(event) =>
                setNewIngredient((current) => ({
                  ...current,
                  unit: event.target.value as Ingredient["unit"]
                }))
              }
              value={newIngredient.unit}
            >
              {ingredientUnits.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
            <button
              className="rounded-full border border-accent/30 bg-accent/10 px-4 py-2 text-sm text-accent transition hover:border-accent/60 disabled:cursor-not-allowed disabled:opacity-60 md:col-span-3 md:justify-self-start"
              disabled={busyAction !== null || newIngredient.name.trim().length === 0}
              type="submit"
            >
              {busyAction === "add-ingredient" ? "Adding..." : "Add ingredient"}
            </button>
          </form>

          <div className="mt-6 space-y-3">
            {bootstrapData.ingredients.map((ingredient) => (
              <form
                key={ingredient.id}
                className="grid gap-3 rounded-tile border border-border bg-white/[0.02] p-4 md:grid-cols-[1.4fr_0.8fr_0.8fr_auto]"
                onSubmit={(event) => void handleIngredientUpdate(event, ingredient.id)}
              >
                <input
                  className="rounded-tile border border-border bg-black/20 px-3 py-2 text-sm text-text outline-none transition focus:border-accent/40"
                  defaultValue={ingredient.name}
                  name="name"
                />
                <input
                  className="rounded-tile border border-border bg-black/20 px-3 py-2 text-sm text-text outline-none transition focus:border-accent/40"
                  defaultValue={ingredient.costPerUnitCents}
                  min="0"
                  name="costPerUnitCents"
                  type="number"
                />
                <select
                  className="rounded-tile border border-border bg-black/20 px-3 py-2 text-sm text-text outline-none transition focus:border-accent/40"
                  defaultValue={ingredient.unit}
                  name="unit"
                >
                  {ingredientUnits.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
                <button
                  className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-text transition hover:border-accent/30 hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={busyAction !== null}
                  type="submit"
                >
                  Save
                </button>
                <p className="text-xs leading-6 text-muted md:col-span-4">
                  Current cost: <span className="text-text">{formatCurrency(ingredient.costPerUnitCents)}</span> per {ingredient.unit}
                </p>
              </form>
            ))}
          </div>
        </Panel>

        <Panel>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Pilot data setup</p>
          <h2 className="mt-4 font-display text-3xl text-text">Dishes and menu pricing</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Tune dish names, prices, sales volume, and simple recipe links. Recipe ingredient editing remains limited in this sprint.
          </p>

          <form className="mt-5 grid gap-3 md:grid-cols-2" onSubmit={(event) => void handleDishCreate(event)}>
            <input
              className="rounded-tile border border-border bg-black/20 px-4 py-3 text-sm text-text outline-none transition focus:border-accent/40"
              onChange={(event) => setNewDish((current) => ({ ...current, name: event.target.value }))}
              placeholder="New dish name"
              value={newDish.name}
            />
            <select
              className="rounded-tile border border-border bg-black/20 px-4 py-3 text-sm text-text outline-none transition focus:border-accent/40"
              onChange={(event) => setNewDish((current) => ({ ...current, recipeId: event.target.value }))}
              value={newDish.recipeId}
            >
              <option value="">Select recipe</option>
              {bootstrapData.recipes.map((recipe) => (
                <option key={recipe.id} value={recipe.id}>
                  {recipe.name}
                </option>
              ))}
            </select>
            <input
              className="rounded-tile border border-border bg-black/20 px-4 py-3 text-sm text-text outline-none transition focus:border-accent/40"
              min="1"
              onChange={(event) => setNewDish((current) => ({ ...current, priceCents: event.target.value }))}
              placeholder="Price in cents"
              type="number"
              value={newDish.priceCents}
            />
            <input
              className="rounded-tile border border-border bg-black/20 px-4 py-3 text-sm text-text outline-none transition focus:border-accent/40"
              min="0"
              onChange={(event) => setNewDish((current) => ({ ...current, salesVolume: event.target.value }))}
              placeholder="Sales volume"
              type="number"
              value={newDish.salesVolume}
            />
            <button
              className="rounded-full border border-accent/30 bg-accent/10 px-4 py-2 text-sm text-accent transition hover:border-accent/60 disabled:cursor-not-allowed disabled:opacity-60 md:col-span-2 md:justify-self-start"
              disabled={
                busyAction !== null ||
                newDish.name.trim().length === 0 ||
                newDish.recipeId.trim().length === 0
              }
              type="submit"
            >
              {busyAction === "add-dish" ? "Adding..." : "Add dish"}
            </button>
          </form>

          <div className="mt-6 space-y-3">
            {bootstrapData.dishes.map((dish) => (
              <form
                key={dish.id}
                className="grid gap-3 rounded-tile border border-border bg-white/[0.02] p-4 md:grid-cols-[1.2fr_1fr_0.9fr_0.8fr_auto]"
                onSubmit={(event) => void handleDishUpdate(event, dish.id)}
              >
                <input
                  className="rounded-tile border border-border bg-black/20 px-3 py-2 text-sm text-text outline-none transition focus:border-accent/40"
                  defaultValue={dish.name}
                  name="name"
                />
                <select
                  className="rounded-tile border border-border bg-black/20 px-3 py-2 text-sm text-text outline-none transition focus:border-accent/40"
                  defaultValue={dish.recipeId}
                  name="recipeId"
                >
                  {bootstrapData.recipes.map((recipe) => (
                    <option key={recipe.id} value={recipe.id}>
                      {recipe.name}
                    </option>
                  ))}
                </select>
                <input
                  className="rounded-tile border border-border bg-black/20 px-3 py-2 text-sm text-text outline-none transition focus:border-accent/40"
                  defaultValue={dish.priceCents}
                  min="1"
                  name="priceCents"
                  type="number"
                />
                <input
                  className="rounded-tile border border-border bg-black/20 px-3 py-2 text-sm text-text outline-none transition focus:border-accent/40"
                  defaultValue={dish.salesVolume}
                  min="0"
                  name="salesVolume"
                  type="number"
                />
                <button
                  className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-text transition hover:border-accent/30 hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={busyAction !== null}
                  type="submit"
                >
                  Save
                </button>
                <p className="text-xs leading-6 text-muted md:col-span-5">
                  Live price: <span className="text-text">{formatCurrency(dish.priceCents)}</span>. Sales volume:{" "}
                  <span className="text-text">{dish.salesVolume}</span> per period.
                </p>
              </form>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  );
}
