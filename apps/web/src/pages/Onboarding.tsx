import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { apiClient } from "../api/client.js";
import { PageHeader } from "../components/PageHeader.js";
import { Panel } from "../components/Panel.js";
import { StatePanel } from "../components/StatePanel.js";
import { useAsyncData } from "../hooks.js";
import type {
  AppConfigResponse,
  DemoDatasetSummary,
  Dish,
  Ingredient,
  OnboardingChecklist,
  OnboardingState,
  OnboardingStepId,
  Recipe,
  RecipeCreateRequest,
  RecipeInputUnit,
  RestaurantProfile,
  Supplier
} from "../types.js";
import { buildDatasetSearch, getScenarioMeta } from "../utils/scenario.js";

const onboardingSteps: Array<{ id: OnboardingStepId; title: string; shortTitle: string }> = [
  { id: "restaurant_profile", title: "Restaurant Profile", shortTitle: "Profile" },
  { id: "ingredients", title: "Ingredients", shortTitle: "Ingredients" },
  { id: "recipes", title: "Recipes", shortTitle: "Recipes" },
  { id: "dishes", title: "Dishes", shortTitle: "Dishes" },
  { id: "suppliers", title: "Suppliers", shortTitle: "Suppliers" },
  { id: "first_invoice", title: "First Invoice", shortTitle: "Invoice" },
  { id: "dashboard_review", title: "Dashboard Review", shortTitle: "Review" }
];

const ingredientUnits: Array<Ingredient["unit"]> = ["g", "ml", "piece"];
const recipeInputUnits: RecipeInputUnit[] = ["g", "kg", "ml", "l", "piece", "pcs", "pack"];

interface OnboardingBootstrap {
  config: AppConfigResponse;
  datasets: DemoDatasetSummary[];
  profile: RestaurantProfile;
  status: OnboardingState;
  checklist: OnboardingChecklist;
  ingredients: Ingredient[];
  recipes: Recipe[];
  dishes: Dish[];
  suppliers: Supplier[];
}

interface RecipeLineDraft {
  ingredientId: string;
  quantity: string;
  unit: RecipeInputUnit;
}

interface RecipeDraft {
  id?: string;
  name: string;
  yield: string;
  ingredients: RecipeLineDraft[];
}

const blankRecipe: RecipeDraft = {
  name: "",
  yield: "1",
  ingredients: [{ ingredientId: "", quantity: "1", unit: "g" }]
};

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR"
  }).format(cents / 100);
}

function readFormString(formData: FormData, key: string, fallback = "") {
  const value = formData.get(key);
  return typeof value === "string" ? value : fallback;
}

function recipeToDraft(recipe: Recipe): RecipeDraft {
  return {
    id: recipe.id,
    name: recipe.name,
    yield: String(recipe.yield),
    ingredients: recipe.ingredients.map((line) => ({
      ingredientId: line.ingredientId,
      quantity: String(line.quantity),
      unit: line.unit
    }))
  };
}

function buildRecipePayload(recipe: RecipeDraft): RecipeCreateRequest {
  return {
    name: recipe.name.trim(),
    yield: Number(recipe.yield),
    ingredients: recipe.ingredients.map((line) => ({
      ingredientId: line.ingredientId,
      quantity: Number(line.quantity),
      unit: line.unit
    }))
  };
}

function estimateRecipeCost(recipe: RecipeDraft, ingredients: Ingredient[]) {
  return recipe.ingredients.reduce((total, line) => {
    const ingredient = ingredients.find((candidate) => candidate.id === line.ingredientId);
    const quantity = Number(line.quantity);
    if (!ingredient || !Number.isFinite(quantity)) {
      return total;
    }

    return total + ingredient.costPerUnitCents * quantity;
  }, 0);
}

function validateRecipe(recipe: RecipeDraft) {
  if (!recipe.name.trim()) {
    return "Recipe name is required.";
  }
  if (!Number.isFinite(Number(recipe.yield)) || Number(recipe.yield) <= 0) {
    return "Recipe yield must be greater than zero.";
  }
  if (recipe.ingredients.length === 0) {
    return "Add at least one ingredient line.";
  }
  if (recipe.ingredients.some((line) => !line.ingredientId || Number(line.quantity) <= 0)) {
    return "Each recipe line needs an ingredient and a positive quantity.";
  }
  const ingredientIds = recipe.ingredients.map((line) => line.ingredientId);
  if (new Set(ingredientIds).size !== ingredientIds.length) {
    return "Duplicate ingredient lines must be merged before saving.";
  }
  return null;
}

function statusTone(complete: boolean) {
  return complete ? "border-success/30 bg-success/10 text-success" : "border-warning/30 bg-warning/10 text-warning";
}

export function OnboardingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const datasetId = searchParams.get("dataset") ?? undefined;
  const stepParam = searchParams.get("step") as OnboardingStepId | null;
  const [reloadKey, setReloadKey] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recipeDraft, setRecipeDraft] = useState<RecipeDraft>(blankRecipe);

  const loadBootstrap = useCallback(async (): Promise<OnboardingBootstrap> => {
    void reloadKey;
    const [config, datasets, profile, status, checklist, ingredients, recipes, dishes, suppliers] =
      await Promise.all([
        apiClient.getAppConfig(),
        apiClient.getDemoDatasets(),
        apiClient.getRestaurantProfile(datasetId),
        apiClient.getOnboardingStatus(datasetId),
        apiClient.getOnboardingChecklist(datasetId),
        apiClient.getIngredients(datasetId),
        apiClient.getRecipes(datasetId),
        apiClient.getMenuDishes(datasetId),
        apiClient.getSuppliers(datasetId)
      ]);

    return { config, datasets, profile, status, checklist, ingredients, recipes, dishes, suppliers };
  }, [datasetId, reloadKey]);

  const bootstrap = useAsyncData(loadBootstrap);

  const selectedDataset = useMemo(() => {
    if (!bootstrap.data) {
      return undefined;
    }
    if (datasetId) {
      return getScenarioMeta(bootstrap.data.datasets, datasetId) ?? bootstrap.data.datasets[0];
    }
    if (bootstrap.data.config.appMode === "pilot" || bootstrap.data.config.appMode === "production") {
      return bootstrap.data.datasets.find((dataset) => dataset.id === "pilot-workspace") ?? bootstrap.data.datasets[0];
    }
    return bootstrap.data.datasets[0];
  }, [bootstrap.data, datasetId]);

  const activeStep = useMemo<OnboardingStepId>(() => {
    if (stepParam && onboardingSteps.some((step) => step.id === stepParam)) {
      return stepParam;
    }
    return bootstrap.data?.status.currentStep ?? "restaurant_profile";
  }, [bootstrap.data?.status.currentStep, stepParam]);

  useEffect(() => {
    if (!bootstrap.data) {
      return;
    }
    const firstRecipe = bootstrap.data.recipes[0];
    setRecipeDraft(firstRecipe ? recipeToDraft(firstRecipe) : blankRecipe);
  }, [bootstrap.data]);

  function refresh(message: string) {
    setStatusMessage(message);
    setErrorMessage(null);
    setReloadKey((current) => current + 1);
  }

  function fail(error: unknown) {
    setErrorMessage(error instanceof Error ? error.message : "Setup action failed.");
    setStatusMessage(null);
  }

  function switchStep(step: OnboardingStepId) {
    setSearchParams({
      ...(datasetId ? { dataset: datasetId } : {}),
      step
    });
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    try {
      await apiClient.updateRestaurantProfile(
        {
          name: readFormString(formData, "name"),
          currency: readFormString(formData, "currency", "EUR"),
          country: readFormString(formData, "country"),
          concept: readFormString(formData, "concept"),
          averageMonthlyDishSalesEstimate: Number(formData.get("averageMonthlyDishSalesEstimate") ?? 0)
        },
        selectedDataset?.id
      );
      refresh("Restaurant profile saved.");
      switchStep("ingredients");
    } catch (error) {
      fail(error);
    }
  }

  async function addIngredient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(event.currentTarget);
    try {
      await apiClient.createIngredient(
        {
          name: readFormString(formData, "name"),
          costPerUnitCents: Number(formData.get("costPerUnitCents") ?? 0),
          unit: readFormString(formData, "unit", "g") as Ingredient["unit"]
        },
        selectedDataset?.id
      );
      form.reset();
      refresh("Ingredient added.");
    } catch (error) {
      fail(error);
    }
  }

  async function saveRecipe() {
    const validationError = validateRecipe(recipeDraft);
    if (validationError) {
      setErrorMessage(validationError);
      setStatusMessage(null);
      return;
    }

    try {
      const payload = buildRecipePayload(recipeDraft);
      if (recipeDraft.id) {
        await apiClient.updateRecipe(recipeDraft.id, payload, selectedDataset?.id);
      } else {
        await apiClient.createRecipe(payload, selectedDataset?.id);
      }
      refresh(recipeDraft.id ? "Recipe saved." : "Recipe created.");
    } catch (error) {
      fail(error);
    }
  }

  async function addDish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(event.currentTarget);
    try {
      await apiClient.createDish(
        {
          name: readFormString(formData, "name"),
          recipeId: readFormString(formData, "recipeId"),
          priceCents: Number(formData.get("priceCents") ?? 0),
          salesVolume: Number(formData.get("salesVolume") ?? 0)
        },
        selectedDataset?.id
      );
      form.reset();
      refresh("Dish added.");
    } catch (error) {
      fail(error);
    }
  }

  async function addSupplier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(event.currentTarget);
    try {
      await apiClient.createSupplier(
        {
          name: readFormString(formData, "name"),
          contactLabel: readFormString(formData, "contactLabel")
        },
        selectedDataset?.id
      );
      form.reset();
      refresh("Supplier added.");
    } catch (error) {
      fail(error);
    }
  }

  async function completeStep(step: OnboardingStepId, message: string) {
    try {
      await apiClient.completeOnboardingStep(step, selectedDataset?.id);
      refresh(message);
    } catch (error) {
      fail(error);
    }
  }

  if (bootstrap.loading) {
    return <StatePanel title="Loading onboarding" message="Checking restaurant setup progress." tone="loading" />;
  }

  if (bootstrap.error || !bootstrap.data) {
    return (
      <StatePanel
        title="Onboarding unavailable"
        message={bootstrap.error ?? "Backend is not reachable. Start the API with npm run dev."}
        tone="error"
      />
    );
  }

  const { config, profile, status, checklist, ingredients, recipes, dishes, suppliers } = bootstrap.data;
  const storageMessage =
    config.storage.driver === "file"
      ? "Changes are saved to local pilot data files."
      : config.storage.driver === "database"
        ? "Changes use the configured database store."
        : "Changes reset when the API restarts because memory storage is active.";
  const activeChecklistItem = checklist.items.find((item) => item.step === activeStep);
  const recipeCost = estimateRecipeCost(recipeDraft, ingredients);

  return (
    <div className="space-y-5">
      <Panel className="p-5 sm:p-7">
        <PageHeader
          eyebrow="Mobile-first onboarding"
          title="Set up the restaurant workspace"
          description="Add the minimum profile, menu, supplier, and invoice data needed for useful dish margins and supplier-price actions."
          badges={
            <>
              <span className="rounded-full border border-white/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-text">
                {config.appMode === "demo" ? "Demo mode" : `${config.appMode} mode`}
              </span>
              <span className="rounded-full border border-warning/20 bg-warning/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-warning">
                {config.storage.driver} storage
              </span>
            </>
          }
        />
        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-sm text-muted">{storageMessage}</p>
            <p className="mt-1 text-sm text-muted">
              Invoice upload remains draft-only. Ingredient costs change only after review-confirm.
            </p>
          </div>
          <div className="rounded-tile border border-border bg-white/[0.03] p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Progress</p>
            <p className="mt-1 font-display text-3xl text-text">{status.progressPercent}%</p>
          </div>
        </div>
      </Panel>

      {(statusMessage || errorMessage) && (
        <Panel className={errorMessage ? "border-danger/30 bg-danger/10" : "border-success/30 bg-success/10"}>
          <p className={errorMessage ? "text-sm text-danger" : "text-sm text-success"}>
            {errorMessage ?? statusMessage}
          </p>
        </Panel>
      )}

      <div className="grid gap-5 xl:grid-cols-[280px_1fr_320px]">
        <Panel className="p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Setup steps</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            {onboardingSteps.map((step, index) => {
              const item = checklist.items.find((candidate) => candidate.step === step.id);
              const isActive = activeStep === step.id;
              return (
                <button
                  className={`rounded-tile border p-4 text-left transition ${
                    isActive ? "border-accent/50 bg-accent/10" : "border-border bg-white/[0.02] hover:border-accent/30"
                  }`}
                  key={step.id}
                  onClick={() => switchStep(step.id)}
                  type="button"
                >
                  <span className="text-[11px] uppercase tracking-[0.18em] text-muted">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="mt-2 block font-medium text-text">{step.shortTitle}</span>
                  <span className={`mt-3 inline-flex rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.14em] ${statusTone(Boolean(item?.complete))}`}>
                    {item?.status ?? "not_started"}
                  </span>
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel className="p-5 sm:p-6">
          <div className="mb-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-accent">
              {activeChecklistItem?.label ?? "Setup step"}
            </p>
            <h2 className="mt-2 font-display text-3xl text-text">
              {onboardingSteps.find((step) => step.id === activeStep)?.title}
            </h2>
            {activeChecklistItem && <p className="mt-2 text-sm leading-6 text-muted">{activeChecklistItem.message}</p>}
          </div>

          {activeStep === "restaurant_profile" && (
            <form className="grid gap-4" onSubmit={(event) => void saveProfile(event)}>
              <label className="grid gap-2 text-sm text-muted">
                Restaurant name
                <input className="rounded-tile border border-border bg-white/[0.04] px-4 py-3 text-text" defaultValue={profile.name} name="name" required />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm text-muted">
                  Currency
                  <input className="rounded-tile border border-border bg-white/[0.04] px-4 py-3 text-text" defaultValue={profile.currency} name="currency" required />
                </label>
                <label className="grid gap-2 text-sm text-muted">
                  Country
                  <input className="rounded-tile border border-border bg-white/[0.04] px-4 py-3 text-text" defaultValue={profile.country ?? ""} name="country" />
                </label>
              </div>
              <label className="grid gap-2 text-sm text-muted">
                Concept
                <input className="rounded-tile border border-border bg-white/[0.04] px-4 py-3 text-text" defaultValue={profile.concept ?? ""} name="concept" placeholder="Bistro, cafe, casual dining" />
              </label>
              <label className="grid gap-2 text-sm text-muted">
                Monthly dish sales estimate
                <input className="rounded-tile border border-border bg-white/[0.04] px-4 py-3 text-text" defaultValue={profile.averageMonthlyDishSalesEstimate ?? 0} min="0" name="averageMonthlyDishSalesEstimate" type="number" />
              </label>
              <button className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-background" type="submit">
                Save profile and continue
              </button>
            </form>
          )}

          {activeStep === "ingredients" && (
            <div className="space-y-5">
              <form className="grid gap-3 sm:grid-cols-[1fr_150px_120px_auto] sm:items-end" onSubmit={(event) => void addIngredient(event)}>
                <label className="grid gap-2 text-sm text-muted">
                  Ingredient
                  <input className="rounded-tile border border-border bg-white/[0.04] px-4 py-3 text-text" name="name" placeholder="Tomatoes" required />
                </label>
                <label className="grid gap-2 text-sm text-muted">
                  Cost cents
                  <input className="rounded-tile border border-border bg-white/[0.04] px-4 py-3 text-text" min="0" name="costPerUnitCents" required type="number" />
                </label>
                <label className="grid gap-2 text-sm text-muted">
                  Unit
                  <select className="rounded-tile border border-border bg-white/[0.04] px-4 py-3 text-text" name="unit">
                    {ingredientUnits.map((unit) => <option key={unit}>{unit}</option>)}
                  </select>
                </label>
                <button className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-background" type="submit">Add</button>
              </form>
              <div className="grid gap-3 sm:grid-cols-2">
                {ingredients.slice(0, 10).map((ingredient) => (
                  <div className="rounded-tile border border-border bg-white/[0.02] p-4" key={ingredient.id}>
                    <p className="font-medium text-text">{ingredient.name}</p>
                    <p className="mt-1 text-sm text-muted">{formatCurrency(ingredient.costPerUnitCents)} / {ingredient.unit}</p>
                  </div>
                ))}
              </div>
              <button className="rounded-full border border-white/10 px-5 py-3 text-sm text-text" onClick={() => switchStep("recipes")} type="button">Continue to recipes</button>
            </div>
          )}

          {activeStep === "recipes" && (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
                <label className="grid gap-2 text-sm text-muted">
                  Recipe name
                  <input className="rounded-tile border border-border bg-white/[0.04] px-4 py-3 text-text" onChange={(event) => setRecipeDraft((current) => ({ ...current, name: event.target.value }))} value={recipeDraft.name} />
                </label>
                <label className="grid gap-2 text-sm text-muted">
                  Yield
                  <input className="rounded-tile border border-border bg-white/[0.04] px-4 py-3 text-text" min="0.01" onChange={(event) => setRecipeDraft((current) => ({ ...current, yield: event.target.value }))} type="number" value={recipeDraft.yield} />
                </label>
              </div>
              <div className="space-y-3">
                {recipeDraft.ingredients.map((line, index) => (
                  <div className="grid gap-3 rounded-tile border border-border bg-white/[0.02] p-3 sm:grid-cols-[1fr_120px_120px_auto]" key={`${line.ingredientId}-${index}`}>
                    <select className="rounded-tile border border-border bg-white/[0.04] px-4 py-3 text-text" onChange={(event) => setRecipeDraft((current) => ({ ...current, ingredients: current.ingredients.map((candidate, lineIndex) => lineIndex === index ? { ...candidate, ingredientId: event.target.value } : candidate) }))} value={line.ingredientId}>
                      <option value="">Choose ingredient</option>
                      {ingredients.map((ingredient) => <option key={ingredient.id} value={ingredient.id}>{ingredient.name}</option>)}
                    </select>
                    <input className="rounded-tile border border-border bg-white/[0.04] px-4 py-3 text-text" min="0.01" onChange={(event) => setRecipeDraft((current) => ({ ...current, ingredients: current.ingredients.map((candidate, lineIndex) => lineIndex === index ? { ...candidate, quantity: event.target.value } : candidate) }))} type="number" value={line.quantity} />
                    <select className="rounded-tile border border-border bg-white/[0.04] px-4 py-3 text-text" onChange={(event) => setRecipeDraft((current) => ({ ...current, ingredients: current.ingredients.map((candidate, lineIndex) => lineIndex === index ? { ...candidate, unit: event.target.value as RecipeInputUnit } : candidate) }))} value={line.unit}>
                      {recipeInputUnits.map((unit) => <option key={unit}>{unit}</option>)}
                    </select>
                    <button className="rounded-full border border-danger/30 px-4 py-2 text-sm text-danger" onClick={() => setRecipeDraft((current) => ({ ...current, ingredients: current.ingredients.filter((_, lineIndex) => lineIndex !== index) }))} type="button">Remove</button>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button className="rounded-full border border-white/10 px-5 py-3 text-sm text-text" onClick={() => setRecipeDraft((current) => ({ ...current, ingredients: [...current.ingredients, { ingredientId: "", quantity: "1", unit: "g" }] }))} type="button">Add ingredient line</button>
                <button className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-background" onClick={() => void saveRecipe()} type="button">Save recipe</button>
                <span className="text-sm text-muted">Cost preview: {formatCurrency(recipeCost)}</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {recipes.map((recipe) => (
                  <button className="rounded-tile border border-border bg-white/[0.02] p-4 text-left transition hover:border-accent/30" key={recipe.id} onClick={() => setRecipeDraft(recipeToDraft(recipe))} type="button">
                    <p className="font-medium text-text">{recipe.name}</p>
                    <p className="mt-1 text-sm text-muted">{recipe.ingredients.length} ingredient lines · yield {recipe.yield}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeStep === "dishes" && (
            <div className="space-y-5">
              <form className="grid gap-3 sm:grid-cols-[1fr_1fr_120px_120px_auto] sm:items-end" onSubmit={(event) => void addDish(event)}>
                <label className="grid gap-2 text-sm text-muted">
                  Dish
                  <input className="rounded-tile border border-border bg-white/[0.04] px-4 py-3 text-text" name="name" required />
                </label>
                <label className="grid gap-2 text-sm text-muted">
                  Recipe
                  <select className="rounded-tile border border-border bg-white/[0.04] px-4 py-3 text-text" name="recipeId" required>
                    <option value="">Choose recipe</option>
                    {recipes.map((recipe) => <option key={recipe.id} value={recipe.id}>{recipe.name}</option>)}
                  </select>
                </label>
                <label className="grid gap-2 text-sm text-muted">
                  Price cents
                  <input className="rounded-tile border border-border bg-white/[0.04] px-4 py-3 text-text" min="0" name="priceCents" required type="number" />
                </label>
                <label className="grid gap-2 text-sm text-muted">
                  Sales
                  <input className="rounded-tile border border-border bg-white/[0.04] px-4 py-3 text-text" min="0" name="salesVolume" required type="number" />
                </label>
                <button className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-background" type="submit">Add</button>
              </form>
              <div className="grid gap-3 sm:grid-cols-2">
                {dishes.map((dish) => {
                  const recipe = recipes.find((candidate) => candidate.id === dish.recipeId);
                  return (
                    <div className="rounded-tile border border-border bg-white/[0.02] p-4" key={dish.id}>
                      <p className="font-medium text-text">{dish.name}</p>
                      <p className="mt-1 text-sm text-muted">{recipe?.name ?? "Missing recipe"} · {formatCurrency(dish.priceCents)} · {dish.salesVolume} sales</p>
                    </div>
                  );
                })}
              </div>
              <button className="rounded-full border border-white/10 px-5 py-3 text-sm text-text" onClick={() => switchStep("suppliers")} type="button">Continue to suppliers</button>
            </div>
          )}

          {activeStep === "suppliers" && (
            <div className="space-y-5">
              <p className="text-sm leading-6 text-muted">Suppliers are used for invoice cost updates and price-change alerts.</p>
              <form className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end" onSubmit={(event) => void addSupplier(event)}>
                <label className="grid gap-2 text-sm text-muted">
                  Supplier
                  <input className="rounded-tile border border-border bg-white/[0.04] px-4 py-3 text-text" name="name" required />
                </label>
                <label className="grid gap-2 text-sm text-muted">
                  Contact label
                  <input className="rounded-tile border border-border bg-white/[0.04] px-4 py-3 text-text" name="contactLabel" placeholder="Rep, email, route" />
                </label>
                <button className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-background" type="submit">Add</button>
              </form>
              <div className="grid gap-3 sm:grid-cols-2">
                {suppliers.map((supplier) => (
                  <div className="rounded-tile border border-border bg-white/[0.02] p-4" key={supplier.id}>
                    <p className="font-medium text-text">{supplier.name}</p>
                    <p className="mt-1 text-sm text-muted">{supplier.contactLabel ?? "No contact label"}</p>
                  </div>
                ))}
              </div>
              <button className="rounded-full border border-white/10 px-5 py-3 text-sm text-text" onClick={() => switchStep("first_invoice")} type="button">Continue to first invoice</button>
            </div>
          )}

          {activeStep === "first_invoice" && (
            <div className="space-y-4">
              <Panel className="border-accent/20 bg-accent/10" tone="subtle">
                <p className="font-medium text-text">Safe invoice workflow</p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Upload or enter invoice lines, review the draft, resolve low-confidence rows, then confirm. No ingredient cost changes before confirmation.
                </p>
              </Panel>
              <div className="grid gap-3 sm:grid-cols-3">
                <Link className="rounded-tile border border-border bg-white/[0.02] p-4 transition hover:border-accent/30" to={{ pathname: "/invoices", search: buildDatasetSearch(selectedDataset?.id) }}>
                  <p className="font-medium text-text">Open invoice intake</p>
                  <p className="mt-2 text-sm text-muted">Use sample, manual, or Photo/OCR Upload draft mode.</p>
                </Link>
                <button className="rounded-tile border border-border bg-white/[0.02] p-4 text-left transition hover:border-accent/30" onClick={() => void completeStep("first_invoice", "First invoice step marked complete.")} type="button">
                  <p className="font-medium text-text">Mark complete</p>
                  <p className="mt-2 text-sm text-muted">Use after a draft has been confirmed through review-confirm.</p>
                </button>
                <button className="rounded-tile border border-border bg-white/[0.02] p-4 text-left transition hover:border-accent/30" onClick={() => void apiClient.skipOnboardingStep("first_invoice", selectedDataset?.id).then(() => refresh("First invoice step skipped for now.")).catch(fail)} type="button">
                  <p className="font-medium text-text">Skip for setup</p>
                  <p className="mt-2 text-sm text-muted">Dashboard can be reviewed with menu data first.</p>
                </button>
              </div>
            </div>
          )}

          {activeStep === "dashboard_review" && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {checklist.items.map((item) => (
                  <div className="rounded-tile border border-border bg-white/[0.02] p-4" key={item.step}>
                    <p className="font-medium text-text">{item.label}</p>
                    <p className="mt-1 text-sm text-muted">{item.message}</p>
                    <span className={`mt-3 inline-flex rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.14em] ${statusTone(item.complete)}`}>{item.status}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-3">
                <Link className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-background" to={{ pathname: "/", search: buildDatasetSearch(selectedDataset?.id) }}>Open dashboard</Link>
                <button className="rounded-full border border-white/10 px-5 py-3 text-sm text-text" onClick={() => void completeStep("dashboard_review", "Dashboard review marked complete.")} type="button">Mark review complete</button>
              </div>
            </div>
          )}
        </Panel>

        <Panel className="p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Readiness checklist</p>
          <div className="mt-4 space-y-3">
            {checklist.items.map((item) => (
              <button className="w-full rounded-tile border border-border bg-white/[0.02] p-3 text-left transition hover:border-accent/30" key={item.step} onClick={() => switchStep(item.step)} type="button">
                <span className="font-medium text-text">{item.label}</span>
                <span className="mt-1 block text-sm text-muted">
                  {item.count !== undefined && item.minimum !== undefined ? `${item.count}/${item.minimum} minimum · ` : ""}
                  {item.complete ? "Ready" : "Needs setup"}
                </span>
              </button>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
