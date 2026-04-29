import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent
} from "react";
import { useSearchParams } from "react-router-dom";

import { apiClient } from "../api/client.js";
import { PageHeader } from "../components/PageHeader.js";
import { Panel } from "../components/Panel.js";
import { StatePanel } from "../components/StatePanel.js";
import { useAsyncData } from "../hooks.js";
import type {
  DatasetExportPayload,
  Dish,
  ImportValidationReport,
  Ingredient,
  Recipe,
  RecipeCreateRequest,
  RecipeInputUnit
} from "../types.js";
import { getScenarioMeta } from "../utils/scenario.js";

const ingredientUnits: Array<Ingredient["unit"]> = ["g", "ml", "piece"];
const recipeInputUnits: RecipeInputUnit[] = ["g", "kg", "ml", "l", "piece", "pcs", "pack"];

interface RecipeDraftLine {
  ingredientId: string;
  quantity: string;
  unit: RecipeInputUnit;
}

interface RecipeDraft {
  id?: string;
  name: string;
  yield: string;
  ingredients: RecipeDraftLine[];
}

interface PilotBootstrapData {
  config: Awaited<ReturnType<typeof apiClient.getAppConfig>>;
  datasets: Awaited<ReturnType<typeof apiClient.getDemoDatasets>>;
  deepHealth: Awaited<ReturnType<typeof apiClient.getDeepHealth>>;
  ingredients: Ingredient[];
  dishes: Dish[];
  recipes: Recipe[];
}

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

function emptyRecipeDraft(): RecipeDraft {
  return {
    name: "",
    yield: "1",
    ingredients: [
      {
        ingredientId: "",
        quantity: "1",
        unit: "g"
      }
    ]
  };
}

function recipeToDraft(recipe: Recipe): RecipeDraft {
  return {
    id: recipe.id,
    name: recipe.name,
    yield: String(recipe.yield),
    ingredients: recipe.ingredients.map((ingredient) => ({
      ingredientId: ingredient.ingredientId,
      quantity: String(ingredient.quantity),
      unit: ingredient.unit
    }))
  };
}

function buildRecipePayload(recipe: RecipeDraft): RecipeCreateRequest {
  return {
    name: recipe.name.trim(),
    yield: Number(recipe.yield),
    ingredients: recipe.ingredients.map((ingredient) => ({
      ingredientId: ingredient.ingredientId,
      quantity: Number(ingredient.quantity),
      unit: ingredient.unit
    }))
  };
}

function recipeDraftHasBasics(recipe: RecipeDraft) {
  return (
    recipe.name.trim().length > 0 &&
    Number(recipe.yield) > 0 &&
    recipe.ingredients.length > 0 &&
    recipe.ingredients.every(
      (ingredient) =>
        ingredient.ingredientId.trim().length > 0 && Number(ingredient.quantity) > 0
    )
  );
}

export function PilotToolsPage() {
  const [searchParams] = useSearchParams();
  const datasetId = searchParams.get("dataset") ?? undefined;
  const [reloadKey, setReloadKey] = useState(0);
  const [exportJson, setExportJson] = useState("");
  const [importJson, setImportJson] = useState("");
  const [importValidation, setImportValidation] = useState<ImportValidationReport | null>(null);
  const [validatedImportText, setValidatedImportText] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<
    | "export"
    | "export-download"
    | "reset"
    | "import-validate"
    | "import"
    | "save-ingredient"
    | "save-dish"
    | "save-recipe"
    | "add-ingredient"
    | "add-dish"
    | "add-recipe"
    | null
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
  const [recipeDrafts, setRecipeDrafts] = useState<RecipeDraft[]>([]);
  const [newRecipe, setNewRecipe] = useState<RecipeDraft>(emptyRecipeDraft());

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

  const selectedDataset = useMemo(() => {
    if (!bootstrap.data) {
      return undefined;
    }

    if (datasetId) {
      return getScenarioMeta(bootstrap.data.datasets, datasetId) ?? bootstrap.data.datasets[0];
    }

    if (bootstrap.data.config.appMode === "pilot") {
      return (
        bootstrap.data.datasets.find((dataset) => dataset.id === "pilot-workspace") ??
        bootstrap.data.datasets[0]
      );
    }

    return bootstrap.data.datasets[0];
  }, [bootstrap.data, datasetId]);

  useEffect(() => {
    if (!bootstrap.data) {
      return;
    }

    setRecipeDrafts(bootstrap.data.recipes.map(recipeToDraft));
  }, [bootstrap.data]);

  function refreshAfterMutation(message: string) {
    setStatusMessage(message);
    setErrorMessage(null);
    setReloadKey((current) => current + 1);
  }

  function clearMessages() {
    setErrorMessage(null);
    setStatusMessage(null);
  }

  function updateRecipeDraft(recipeId: string, updater: (draft: RecipeDraft) => RecipeDraft) {
    setRecipeDrafts((current) =>
      current.map((draft) => (draft.id === recipeId ? updater(draft) : draft))
    );
  }

  function addRecipeLine(target?: string) {
    const nextLine: RecipeDraftLine = {
      ingredientId: "",
      quantity: "1",
      unit: "g"
    };

    if (!target) {
      setNewRecipe((current) => ({
        ...current,
        ingredients: [...current.ingredients, nextLine]
      }));
      return;
    }

    updateRecipeDraft(target, (draft) => ({
      ...draft,
      ingredients: [...draft.ingredients, nextLine]
    }));
  }

  function removeRecipeLine(target: string | undefined, index: number) {
    if (!target) {
      setNewRecipe((current) => ({
        ...current,
        ingredients: current.ingredients.filter((_, lineIndex) => lineIndex !== index)
      }));
      return;
    }

    updateRecipeDraft(target, (draft) => ({
      ...draft,
      ingredients: draft.ingredients.filter((_, lineIndex) => lineIndex !== index)
    }));
  }

  function updateRecipeLine(
    target: string | undefined,
    index: number,
    key: keyof RecipeDraftLine,
    value: string
  ) {
    const applyUpdate = (draft: RecipeDraft): RecipeDraft => ({
      ...draft,
      ingredients: draft.ingredients.map((ingredient, lineIndex) =>
        lineIndex === index ? { ...ingredient, [key]: value } : ingredient
      )
    });

    if (!target) {
      setNewRecipe((current) => applyUpdate(current));
      return;
    }

    updateRecipeDraft(target, applyUpdate);
  }

  async function handleExport() {
    if (!selectedDataset?.id) {
      return;
    }

    setBusyAction("export");
    clearMessages();

    try {
      const payload = await apiClient.exportDataset(selectedDataset.id);
      setExportJson(`${JSON.stringify(payload, null, 2)}\n`);
      setStatusMessage(
        `Exported ${selectedDataset.name} with schemaVersion ${payload.schemaVersion}.`
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Export failed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDownloadExport() {
    if (!selectedDataset?.id) {
      return;
    }

    setBusyAction("export-download");
    clearMessages();

    try {
      const blob = await apiClient.exportDatasetBlob(selectedDataset.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `profit-analyzer-${selectedDataset.id}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setStatusMessage(`Downloaded profit-analyzer-${selectedDataset.id}.json.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Export download failed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleReset() {
    if (!selectedDataset?.id) {
      return;
    }

    setBusyAction("reset");
    clearMessages();

    try {
      const result = await apiClient.resetDataset(selectedDataset.id);
      setExportJson("");
      setImportJson("");
      setImportValidation(null);
      setValidatedImportText("");
      refreshAfterMutation(
        `Reset ${result.datasetId}. Cleared ${result.clearedInvoices} invoices, ${result.clearedAlerts} alerts, and restored ${result.restoredDishCount} dishes.`
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Reset failed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleImportValidate() {
    const seededDatasetIds = new Set(bootstrap.data?.datasets.map((dataset) => dataset.id) ?? []);
    const targetDatasetId =
      datasetId && !seededDatasetIds.has(datasetId) ? datasetId : "pilot-workspace";

    setBusyAction("import-validate");
    clearMessages();

    try {
      const payload = JSON.parse(importJson) as DatasetExportPayload;
      const validation = await apiClient.validateImportDataset(payload, targetDatasetId);
      setImportValidation(validation);
      setValidatedImportText(importJson);
      setStatusMessage(
        validation.valid
          ? `Import payload validated for ${targetDatasetId}.`
          : "Import payload has validation errors."
      );
    } catch (error) {
      setImportValidation(null);
      setValidatedImportText("");
      setErrorMessage(error instanceof Error ? error.message : "Import validation failed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleImport() {
    const seededDatasetIds = new Set(bootstrap.data?.datasets.map((dataset) => dataset.id) ?? []);
    const targetDatasetId =
      datasetId && !seededDatasetIds.has(datasetId) ? datasetId : "pilot-workspace";

    setBusyAction("import");
    clearMessages();

    try {
      const payload = JSON.parse(importJson) as DatasetExportPayload;
      const result = await apiClient.importDataset(payload, targetDatasetId);
      setImportValidation(null);
      setValidatedImportText("");
      refreshAfterMutation(
        `Imported ${result.datasetId} with ${result.dishCount} dishes, ${result.ingredientCount} ingredients, and ${result.supplierCount} suppliers.`
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleImportFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const text = await file.text();
    setImportJson(text);
    setImportValidation(null);
    setValidatedImportText("");
    event.target.value = "";
  }

  async function handleIngredientCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyAction("add-ingredient");
    clearMessages();

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
    clearMessages();

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

  async function handleRecipeCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyAction("add-recipe");
    clearMessages();

    try {
      await apiClient.createRecipe(buildRecipePayload(newRecipe), selectedDataset?.id);
      setNewRecipe(emptyRecipeDraft());
      refreshAfterMutation("Added a new recipe to the current workspace.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Recipe creation failed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleRecipeUpdate(event: FormEvent<HTMLFormElement>, recipeId: string) {
    event.preventDefault();
    setBusyAction("save-recipe");
    clearMessages();

    const draft = recipeDrafts.find((recipe) => recipe.id === recipeId);
    if (!draft) {
      setBusyAction(null);
      return;
    }

    try {
      await apiClient.updateRecipe(recipeId, buildRecipePayload(draft), selectedDataset?.id);
      refreshAfterMutation("Saved recipe setup changes.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Recipe update failed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDishCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyAction("add-dish");
    clearMessages();

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
    clearMessages();

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
      refreshAfterMutation("Saved dish pricing, volume, and recipe linkage changes.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Dish update failed.");
    } finally {
      setBusyAction(null);
    }
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
  const storageMessage =
    bootstrapData.config.storage.driver === "file"
      ? `Changes are saved to local pilot data files${bootstrapData.config.storage.dataDir ? ` in ${bootstrapData.config.storage.dataDir}` : ""}.`
      : "Changes reset when the API restarts.";

  const importCanProceed =
    importValidation?.valid === true &&
    validatedImportText === importJson &&
    importJson.trim().length > 0;

  return (
    <div className="space-y-6">
      <Panel className="p-7">
        <PageHeader
          eyebrow="Pilot tools"
          title="Set up the pilot workspace safely"
          description="Use these controls to persist pilot data, tune menu costs and recipes, and recover the workspace without touching the invoice review-confirm boundary."
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
              <p className="mt-4 text-sm leading-6 text-muted">{storageMessage}</p>
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
              className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-text transition hover:border-accent/30 hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!selectedDataset?.id || busyAction !== null}
              onClick={() => {
                void handleDownloadExport();
              }}
              type="button"
            >
              {busyAction === "export-download" ? "Downloading..." : "Download JSON"}
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
            Export includes dataset metadata, ingredients, recipes, dishes, suppliers, invoices,
            cost history, alerts, and OCR job metadata. Reset warning: invoice-driven state for
            this dataset is cleared back to baseline.
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
            Validate first, then import. The payload must keep recipe ingredient references and
            dish recipe links intact before it can replace a pilot workspace.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <label className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-text transition hover:border-accent/30 hover:text-accent">
              Load JSON file
              <input
                accept=".json,application/json"
                className="hidden"
                onChange={(event) => {
                  void handleImportFileChange(event);
                }}
                type="file"
              />
            </label>
            <button
              className="rounded-full border border-warning/20 bg-warning/10 px-4 py-2 text-sm text-warning transition hover:border-warning/60 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={importJson.trim().length === 0 || busyAction !== null}
              onClick={() => {
                void handleImportValidate();
              }}
              type="button"
            >
              {busyAction === "import-validate" ? "Validating..." : "Validate import"}
            </button>
            <button
              className="rounded-full border border-accent/30 bg-accent/10 px-4 py-2 text-sm text-accent transition hover:border-accent/60 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!importCanProceed || busyAction !== null}
              onClick={() => {
                void handleImport();
              }}
              type="button"
            >
              {busyAction === "import" ? "Importing..." : "Import pilot dataset"}
            </button>
          </div>
          <label className="mt-4 block text-sm font-medium text-text" htmlFor="import-json">
            Dataset JSON
          </label>
          <textarea
            className="mt-3 min-h-[18rem] w-full rounded-tile border border-border bg-black/20 p-4 font-mono text-xs leading-6 text-text outline-none transition focus:border-accent/40"
            id="import-json"
            onChange={(event) => {
              setImportJson(event.target.value);
              setImportValidation(null);
              setValidatedImportText("");
            }}
            placeholder="Paste a dataset export payload here for a pilot workspace import."
            value={importJson}
          />
          <p className="mt-4 text-sm leading-6 text-muted">
            Import warning: only a validated payload can replace a pilot workspace dataset.
          </p>
          {importValidation ? (
            <div className="mt-4 rounded-tile border border-border bg-white/[0.02] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-text">Import validation summary</p>
                <span
                  className={`rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.16em] ${
                    importValidation.valid
                      ? "border border-profit/20 bg-profit/10 text-profit"
                      : "border border-danger/20 bg-danger/10 text-danger"
                  }`}
                >
                  {importValidation.valid ? "Valid" : "Invalid"}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted">
                Ingredients {importValidation.summary.ingredients}, recipes {importValidation.summary.recipes}, dishes {importValidation.summary.dishes}, suppliers {importValidation.summary.suppliers}, invoices {importValidation.summary.invoices}.
              </p>
              {importValidation.warnings.length > 0 ? (
                <div className="mt-4">
                  <p className="text-sm font-medium text-warning">Warnings</p>
                  <ul className="mt-2 space-y-2 text-sm leading-6 text-warning">
                    {importValidation.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {importValidation.errors.length > 0 ? (
                <div className="mt-4">
                  <p className="text-sm font-medium text-danger">Errors</p>
                  <ul className="mt-2 space-y-2 text-sm leading-6 text-danger">
                    {importValidation.errors.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Panel>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Pilot data setup</p>
          <h2 className="mt-4 font-display text-3xl text-text">Ingredients</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Update current ingredient names, units, and baseline costs before the first pilot
            invoice lands.
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
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Recipe setup</p>
          <h2 className="mt-4 font-display text-3xl text-text">Recipes</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Recipe setup drives dish cost and margin calculations. Save recipe names, yield, and
            ingredient lines before linking dishes to them.
          </p>

          <form className="mt-5 rounded-tile border border-border bg-white/[0.02] p-4" onSubmit={(event) => void handleRecipeCreate(event)}>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                className="rounded-tile border border-border bg-black/20 px-4 py-3 text-sm text-text outline-none transition focus:border-accent/40"
                onChange={(event) => setNewRecipe((current) => ({ ...current, name: event.target.value }))}
                placeholder="New recipe name"
                value={newRecipe.name}
              />
              <input
                className="rounded-tile border border-border bg-black/20 px-4 py-3 text-sm text-text outline-none transition focus:border-accent/40"
                min="0.01"
                onChange={(event) => setNewRecipe((current) => ({ ...current, yield: event.target.value }))}
                placeholder="Yield"
                step="0.01"
                type="number"
                value={newRecipe.yield}
              />
            </div>
            <div className="mt-4 space-y-3">
              {newRecipe.ingredients.map((ingredient, index) => (
                <div
                  key={`new-${index}`}
                  className="grid gap-3 rounded-tile border border-border bg-black/20 p-3 md:grid-cols-[1.3fr_0.8fr_0.8fr_auto]"
                >
                  <select
                    aria-label={`New recipe ingredient ${index + 1}`}
                    className="rounded-tile border border-border bg-black/20 px-3 py-2 text-sm text-text outline-none transition focus:border-accent/40"
                    onChange={(event) => updateRecipeLine(undefined, index, "ingredientId", event.target.value)}
                    value={ingredient.ingredientId}
                  >
                    <option value="">Select ingredient</option>
                    {bootstrapData.ingredients.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                  <input
                    className="rounded-tile border border-border bg-black/20 px-3 py-2 text-sm text-text outline-none transition focus:border-accent/40"
                    min="0.01"
                    onChange={(event) => updateRecipeLine(undefined, index, "quantity", event.target.value)}
                    placeholder="Quantity"
                    step="0.01"
                    type="number"
                    value={ingredient.quantity}
                  />
                  <select
                    className="rounded-tile border border-border bg-black/20 px-3 py-2 text-sm text-text outline-none transition focus:border-accent/40"
                    onChange={(event) => updateRecipeLine(undefined, index, "unit", event.target.value)}
                    value={ingredient.unit}
                  >
                    {recipeInputUnits.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                  <button
                    className="rounded-full border border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger transition hover:border-danger/60 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={newRecipe.ingredients.length === 1}
                    onClick={() => removeRecipeLine(undefined, index)}
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-text transition hover:border-accent/30 hover:text-accent"
                onClick={() => addRecipeLine(undefined)}
                type="button"
              >
                Add ingredient line
              </button>
              <button
                className="rounded-full border border-accent/30 bg-accent/10 px-4 py-2 text-sm text-accent transition hover:border-accent/60 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={busyAction !== null || !recipeDraftHasBasics(newRecipe)}
                type="submit"
              >
                {busyAction === "add-recipe" ? "Saving..." : "Create recipe"}
              </button>
            </div>
          </form>

          <div className="mt-6 space-y-4">
            {recipeDrafts.map((recipe) => (
              <form
                key={recipe.id}
                className="rounded-tile border border-border bg-white/[0.02] p-4"
                onSubmit={(event) => void handleRecipeUpdate(event, recipe.id ?? "")}
              >
                <div className="grid gap-3 md:grid-cols-[1.4fr_0.8fr_auto]">
                  <input
                    className="rounded-tile border border-border bg-black/20 px-3 py-2 text-sm text-text outline-none transition focus:border-accent/40"
                    onChange={(event) =>
                      updateRecipeDraft(recipe.id ?? "", (current) => ({
                        ...current,
                        name: event.target.value
                      }))
                    }
                    value={recipe.name}
                  />
                  <input
                    className="rounded-tile border border-border bg-black/20 px-3 py-2 text-sm text-text outline-none transition focus:border-accent/40"
                    min="0.01"
                    onChange={(event) =>
                      updateRecipeDraft(recipe.id ?? "", (current) => ({
                        ...current,
                        yield: event.target.value
                      }))
                    }
                    step="0.01"
                    type="number"
                    value={recipe.yield}
                  />
                  <button
                    className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-text transition hover:border-accent/30 hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={busyAction !== null || !recipeDraftHasBasics(recipe)}
                    type="submit"
                  >
                    Save recipe
                  </button>
                </div>
                <p className="mt-3 text-xs leading-6 text-muted">
                  Yield {recipe.yield}. Ingredient lines {recipe.ingredients.length}.
                </p>
                <div className="mt-4 space-y-3">
                  {recipe.ingredients.map((ingredient, index) => (
                    <div
                      key={`${recipe.id}-${index}`}
                      className="grid gap-3 rounded-tile border border-border bg-black/20 p-3 md:grid-cols-[1.3fr_0.8fr_0.8fr_auto]"
                    >
                      <select
                        aria-label={`${recipe.name} ingredient ${index + 1}`}
                        className="rounded-tile border border-border bg-black/20 px-3 py-2 text-sm text-text outline-none transition focus:border-accent/40"
                        onChange={(event) =>
                          updateRecipeLine(recipe.id ?? "", index, "ingredientId", event.target.value)
                        }
                        value={ingredient.ingredientId}
                      >
                        <option value="">Select ingredient</option>
                        {bootstrapData.ingredients.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                      <input
                        className="rounded-tile border border-border bg-black/20 px-3 py-2 text-sm text-text outline-none transition focus:border-accent/40"
                        min="0.01"
                        onChange={(event) =>
                          updateRecipeLine(recipe.id ?? "", index, "quantity", event.target.value)
                        }
                        step="0.01"
                        type="number"
                        value={ingredient.quantity}
                      />
                      <select
                        className="rounded-tile border border-border bg-black/20 px-3 py-2 text-sm text-text outline-none transition focus:border-accent/40"
                        onChange={(event) =>
                          updateRecipeLine(recipe.id ?? "", index, "unit", event.target.value)
                        }
                        value={ingredient.unit}
                      >
                        {recipeInputUnits.map((unit) => (
                          <option key={unit} value={unit}>
                            {unit}
                          </option>
                        ))}
                      </select>
                      <button
                        className="rounded-full border border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger transition hover:border-danger/60 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={recipe.ingredients.length === 1}
                        onClick={() => removeRecipeLine(recipe.id ?? "", index)}
                        type="button"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  className="mt-4 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-text transition hover:border-accent/30 hover:text-accent"
                  onClick={() => addRecipeLine(recipe.id ?? "")}
                  type="button"
                >
                  Add ingredient line
                </button>
              </form>
            ))}
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-1">
        <Panel>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Pilot data setup</p>
          <h2 className="mt-4 font-display text-3xl text-text">Dishes and menu pricing</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Link each dish to a recipe, then tune price and sales volume. Dish-to-recipe setup
            drives live cost, margin, and dashboard analytics immediately.
          </p>

          <form className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4" onSubmit={(event) => void handleDishCreate(event)}>
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
              min="0"
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
              className="rounded-full border border-accent/30 bg-accent/10 px-4 py-2 text-sm text-accent transition hover:border-accent/60 disabled:cursor-not-allowed disabled:opacity-60 xl:col-span-4 xl:justify-self-start"
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
                className="grid gap-3 rounded-tile border border-border bg-white/[0.02] p-4 xl:grid-cols-[1.2fr_1fr_0.9fr_0.8fr_auto]"
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
                  min="0"
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
                <p className="text-xs leading-6 text-muted xl:col-span-5">
                  Linked recipe <span className="text-text">{dish.recipeId}</span>. Live price{" "}
                  <span className="text-text">{formatCurrency(dish.priceCents)}</span>. Sales volume{" "}
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
