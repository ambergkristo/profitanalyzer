import { useCallback, useEffect, useState, type FormEvent } from "react";
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
  WorkspacePage
} from "../components/Workspace.js";
import { useAsyncData } from "../hooks.js";
import type { Ingredient, Recipe, RecipeCreateRequest, RecipeInputUnit } from "../types.js";
import { formatEuro } from "../utils/format.js";

const recipeUnits: RecipeInputUnit[] = ["g", "kg", "ml", "l", "piece", "pcs", "pack"];

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

export function RecipesPage() {
  const [searchParams] = useSearchParams();
  const datasetId = searchParams.get("dataset") ?? undefined;
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [draft, setDraft] = useState<RecipeDraft>(blankRecipe);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    void reloadKey;
    const [recipes, ingredients] = await Promise.all([
      apiClient.getRecipes(datasetId),
      apiClient.getIngredients(datasetId)
    ]);
    return { recipes, ingredients };
  }, [datasetId, reloadKey]);
  const page = useAsyncData(loadData);
  const selectedRecipe = page.data?.recipes.find((recipe) => recipe.id === selectedRecipeId) ?? page.data?.recipes[0];

  useEffect(() => {
    if (selectedRecipe) {
      setDraft(recipeToDraft(selectedRecipe));
    } else {
      setDraft(blankRecipe);
    }
  }, [selectedRecipe]);

  async function saveRecipe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!page.data) {
      return;
    }
    const validation = validateRecipe(draft);
    if (validation) {
      setError(validation);
      setStatus(null);
      return;
    }

    try {
      const payload = buildRecipePayload(draft);
      if (draft.id) {
        await apiClient.updateRecipe(draft.id, payload, datasetId);
        setStatus("Recipe updated.");
      } else {
        const created = await apiClient.createRecipe(payload, datasetId);
        setSelectedRecipeId(created.id);
        setStatus("Recipe created.");
      }
      setError(null);
      setReloadKey((current) => current + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Recipe save failed.");
      setStatus(null);
    }
  }

  if (page.loading) {
    return <StatePanel message="Loading recipes and ingredient lines..." title="Loading recipes" tone="loading" />;
  }

  if (page.error || !page.data) {
    return <StatePanel message="Backend is not reachable. Start the API with npm run dev." title="Recipes unavailable" tone="error" />;
  }

  const estimatedCost = estimateRecipeCost(draft, page.data.ingredients);
  const ingredients = page.data.ingredients;

  return (
    <WorkspacePage>
      <WorkspaceHeader
        actions={<ActionButton onClick={() => setDraft(blankRecipe)} variant="primary">New recipe</ActionButton>}
        description="Build recipes from ingredient lines so dish cost and margin calculations stay operational."
        eyebrow="Recipe workspace"
        title="Recipe builder"
      />

      <div className="grid gap-3 md:grid-cols-3">
        <CompactMetric label="Recipes" value={page.data.recipes.length} />
        <CompactMetric label="Ingredients available" value={page.data.ingredients.length} />
        <CompactMetric label="Selected recipe cost" tone="accent" value={formatEuro(estimatedCost)} />
      </div>

      <WorkspaceGrid>
        <ContextPanel className="min-h-0">
          {page.data.recipes.length === 0 ? (
            <EmptyWorkspaceState message="Create a recipe to start linking dish prices to ingredient costs." title="No recipes yet" />
          ) : (
            <WorkspaceList className="max-h-[32rem]">
              {page.data.recipes.map((recipe) => (
                <button
                  className={`w-full rounded-[1.35rem] border p-4 text-left transition hover:border-accent/50 ${
                    selectedRecipe?.id === recipe.id ? "border-accent/60 bg-accent/10" : "border-border bg-elevated"
                  }`}
                  key={recipe.id}
                  onClick={() => setSelectedRecipeId(recipe.id)}
                  type="button"
                >
                  <p className="font-semibold text-text">{recipe.name}</p>
                  <p className="mt-1 text-sm text-muted">
                    Yield {recipe.yield} · {recipe.ingredients.length} ingredient lines
                  </p>
                </button>
              ))}
            </WorkspaceList>
          )}
        </ContextPanel>

        <WorkspaceDetailPanel className="min-h-0">
          <form className="grid gap-4" onSubmit={(event) => void saveRecipe(event)}>
            <div className="grid gap-3 md:grid-cols-[1fr_8rem]">
              <label className="text-sm text-muted">
                Recipe name
                <input className="mt-2 w-full rounded-2xl border border-border bg-bg px-4 py-3 text-text outline-none focus:border-accent/60" onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} value={draft.name} />
              </label>
              <label className="text-sm text-muted">
                Yield
                <input className="mt-2 w-full rounded-2xl border border-border bg-bg px-4 py-3 text-text outline-none focus:border-accent/60" min={0.01} onChange={(event) => setDraft((current) => ({ ...current, yield: event.target.value }))} type="number" value={draft.yield} />
              </label>
            </div>

            <div className="work-scroll max-h-[24rem] space-y-3 overflow-y-auto pr-1">
              {draft.ingredients.map((line, index) => (
                <div className="rounded-[1.35rem] border border-border bg-elevated p-4" key={`${line.ingredientId}-${index}`}>
                  <div className="grid gap-3 md:grid-cols-[1fr_7rem_7rem_auto] md:items-end">
                    <label className="text-sm text-muted">
                      Ingredient
                      <select className="mt-2 w-full rounded-2xl border border-border bg-bg px-4 py-3 text-text outline-none focus:border-accent/60" onChange={(event) => updateLine(index, { ingredientId: event.target.value })} value={line.ingredientId}>
                        <option value="">Choose ingredient</option>
                        {ingredients.map((ingredient) => (
                          <option key={ingredient.id} value={ingredient.id}>
                            {ingredient.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm text-muted">
                      Quantity
                      <input className="mt-2 w-full rounded-2xl border border-border bg-bg px-4 py-3 text-text outline-none focus:border-accent/60" min={0.01} onChange={(event) => updateLine(index, { quantity: event.target.value })} type="number" value={line.quantity} />
                    </label>
                    <label className="text-sm text-muted">
                      Unit
                      <select className="mt-2 w-full rounded-2xl border border-border bg-bg px-4 py-3 text-text outline-none focus:border-accent/60" onChange={(event) => updateLine(index, { unit: event.target.value as RecipeInputUnit })} value={line.unit}>
                        {recipeUnits.map((unit) => (
                          <option key={unit} value={unit}>
                            {unit}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button className="rounded-full border border-border px-4 py-3 text-sm text-muted hover:text-text" onClick={() => removeLine(index)} type="button">
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button className="rounded-full border border-border px-4 py-2 text-sm text-muted hover:text-text" onClick={addLine} type="button">
                Add ingredient line
              </button>
              <ActionButton type="submit" variant="primary">Save recipe</ActionButton>
            </div>
            {status ? <p className="text-sm text-success">{status}</p> : null}
            {error ? <p className="text-sm text-danger">{error}</p> : null}
          </form>
        </WorkspaceDetailPanel>
      </WorkspaceGrid>
    </WorkspacePage>
  );

  function updateLine(index: number, patch: Partial<RecipeLineDraft>) {
    setDraft((current) => ({
      ...current,
      ingredients: current.ingredients.map((line, candidateIndex) => (candidateIndex === index ? { ...line, ...patch } : line))
    }));
  }

  function addLine() {
    setDraft((current) => ({
      ...current,
      ingredients: [...current.ingredients, { ingredientId: "", quantity: "1", unit: "g" }]
    }));
  }

  function removeLine(index: number) {
    setDraft((current) => ({
      ...current,
      ingredients: current.ingredients.filter((_, candidateIndex) => candidateIndex !== index)
    }));
  }
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

function validateRecipe(recipe: RecipeDraft) {
  if (!recipe.name.trim()) {
    return "Recipe name is required.";
  }
  if (!Number.isFinite(Number(recipe.yield)) || Number(recipe.yield) <= 0) {
    return "Recipe yield must be greater than zero.";
  }
  if (recipe.ingredients.some((line) => !line.ingredientId || Number(line.quantity) <= 0)) {
    return "Each line needs an ingredient and positive quantity.";
  }
  const ingredientIds = recipe.ingredients.map((line) => line.ingredientId);
  if (new Set(ingredientIds).size !== ingredientIds.length) {
    return "Duplicate ingredient lines must be merged before saving.";
  }
  return null;
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
