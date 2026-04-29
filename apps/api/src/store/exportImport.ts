import type {
  DatasetExportPayload,
  ImportValidationReport,
  ImportValidationSummary
} from "./types.js";
import { normalizeRecipeIngredientEntries } from "./validation.js";

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isArrayOfObjects(value: unknown) {
  return Array.isArray(value) && value.every((item) => isObjectRecord(item));
}

function buildSummary(payload: {
  ingredients?: unknown[];
  recipes?: unknown[];
  dishes?: unknown[];
  suppliers?: unknown[];
  invoices?: unknown[];
}): ImportValidationSummary {
  return {
    ingredients: Array.isArray(payload.ingredients) ? payload.ingredients.length : 0,
    recipes: Array.isArray(payload.recipes) ? payload.recipes.length : 0,
    dishes: Array.isArray(payload.dishes) ? payload.dishes.length : 0,
    suppliers: Array.isArray(payload.suppliers) ? payload.suppliers.length : 0,
    invoices: Array.isArray(payload.invoices) ? payload.invoices.length : 0
  };
}

export function hasDatasetImportShape(payload: unknown): payload is DatasetExportPayload {
  return (
    isObjectRecord(payload) &&
    isObjectRecord(payload.dataset) &&
    isObjectRecord(payload.dataset.data) &&
    isArrayOfObjects(payload.ingredients) &&
    isArrayOfObjects(payload.recipes) &&
    isArrayOfObjects(payload.dishes) &&
    isArrayOfObjects(payload.suppliers) &&
    isArrayOfObjects(payload.supplierProductMatches) &&
    isArrayOfObjects(payload.costHistory) &&
    isArrayOfObjects(payload.alerts) &&
    isArrayOfObjects(payload.invoices) &&
    isArrayOfObjects(payload.ocrJobs)
  );
}

export function validateDatasetImportPayload(payload: unknown): ImportValidationReport {
  if (!isObjectRecord(payload)) {
    return {
      valid: false,
      summary: buildSummary({}),
      warnings: [],
      errors: ["Import payload must be an object."]
    };
  }

  const warnings: string[] = [];
  const errors: string[] = [];
  const summary = buildSummary(payload);

  if (!hasDatasetImportShape(payload)) {
    return {
      valid: false,
      summary,
      warnings,
      errors: ["Import payload shape is invalid."]
    };
  }

  const ingredientIds = new Set<string>();
  const recipeIds = new Set<string>();

  for (const ingredient of payload.ingredients) {
    if (
      typeof ingredient.id !== "string" ||
      ingredient.id.trim().length === 0 ||
      typeof ingredient.name !== "string" ||
      ingredient.name.trim().length === 0
    ) {
      errors.push("Ingredients require id and name.");
      continue;
    }

    if (ingredientIds.has(ingredient.id)) {
      errors.push(`Duplicate ingredient id "${ingredient.id}".`);
    }

    if (
      typeof ingredient.costPerUnitCents !== "number" ||
      !Number.isFinite(ingredient.costPerUnitCents) ||
      ingredient.costPerUnitCents < 0
    ) {
      errors.push(`Ingredient "${ingredient.id}" has invalid costPerUnitCents.`);
    }

    if (!["g", "ml", "piece"].includes(String(ingredient.unit))) {
      errors.push(`Ingredient "${ingredient.id}" has invalid unit.`);
    }

    ingredientIds.add(ingredient.id);
  }

  for (const recipe of payload.recipes) {
    if (
      typeof recipe.id !== "string" ||
      recipe.id.trim().length === 0 ||
      typeof recipe.name !== "string" ||
      recipe.name.trim().length === 0
    ) {
      errors.push("Recipes require id and name.");
      continue;
    }

    if (recipeIds.has(recipe.id)) {
      errors.push(`Duplicate recipe id "${recipe.id}".`);
    }

    if (typeof recipe.yield !== "number" || !Number.isFinite(recipe.yield) || recipe.yield <= 0) {
      errors.push(`Recipe "${recipe.id}" has invalid yield.`);
    }

    if (!Array.isArray(recipe.ingredients)) {
      errors.push(`Recipe "${recipe.id}" must include ingredient lines.`);
      continue;
    }

    const normalized = normalizeRecipeIngredientEntries(recipe.ingredients);

    errors.push(...normalized.errors.map((error) => `Recipe "${recipe.id}": ${error}`));

    for (const ingredientLine of normalized.normalized ?? []) {
      if (!ingredientIds.has(ingredientLine.ingredientId)) {
        errors.push(
          `Recipe "${recipe.id}" references unknown ingredient "${ingredientLine.ingredientId}".`
        );
      }
    }

    recipeIds.add(recipe.id);
  }

  for (const dish of payload.dishes) {
    if (
      typeof dish.id !== "string" ||
      dish.id.trim().length === 0 ||
      typeof dish.name !== "string" ||
      dish.name.trim().length === 0
    ) {
      errors.push("Dishes require id and name.");
      continue;
    }

    if (typeof dish.recipeId !== "string" || !recipeIds.has(dish.recipeId)) {
      errors.push(`Dish "${dish.id}" references unknown recipe "${String(dish.recipeId)}".`);
    }

    if (typeof dish.priceCents !== "number" || !Number.isFinite(dish.priceCents) || dish.priceCents < 0) {
      errors.push(`Dish "${dish.id}" has invalid priceCents.`);
    }

    if (
      typeof dish.salesVolume !== "number" ||
      !Number.isFinite(dish.salesVolume) ||
      dish.salesVolume < 0
    ) {
      errors.push(`Dish "${dish.id}" has invalid salesVolume.`);
    }
  }

  for (const supplier of payload.suppliers) {
    if (typeof supplier.id !== "string" || typeof supplier.name !== "string") {
      errors.push("Suppliers require id and name.");
    }
  }

  if (!("schemaVersion" in payload)) {
    warnings.push("Import payload is missing schemaVersion and may come from an older export.");
  }

  if (!("exportedFromAppVersion" in payload)) {
    warnings.push("Import payload is missing exportedFromAppVersion.");
  }

  return {
    valid: errors.length === 0,
    summary,
    warnings,
    errors
  };
}

export function isValidDatasetImportPayload(payload: unknown): payload is DatasetExportPayload {
  return validateDatasetImportPayload(payload).valid;
}

export function sanitizeImportedPayload(payload: DatasetExportPayload, targetDatasetId?: string): DatasetExportPayload {
  return {
    schemaVersion: payload.schemaVersion ?? 1,
    datasetId: targetDatasetId ?? payload.datasetId ?? payload.dataset.id,
    exportedFromAppVersion: payload.exportedFromAppVersion ?? "0.1.0",
    dataset: {
      ...payload.dataset,
      id: targetDatasetId ?? payload.dataset.id,
      data: {
        ingredients: payload.ingredients.map((ingredient) => ({ ...ingredient })),
        recipes: payload.recipes.map((recipe) => ({
          ...recipe,
          ingredients: recipe.ingredients.map((ingredient) => ({ ...ingredient }))
        })),
        dishes: payload.dishes.map((dish) => ({ ...dish }))
      }
    },
    ingredients: payload.ingredients.map((ingredient) => ({ ...ingredient })),
    recipes: payload.recipes.map((recipe) => ({
      ...recipe,
      ingredients: recipe.ingredients.map((ingredient) => ({ ...ingredient }))
    })),
    dishes: payload.dishes.map((dish) => ({ ...dish })),
    suppliers: payload.suppliers.map((supplier) => ({ ...supplier })),
    supplierProductMatches: payload.supplierProductMatches.map((match) => ({ ...match })),
    costHistory: payload.costHistory.map((entry) => ({ ...entry })),
    alerts: payload.alerts.map((alert) => ({ ...alert })),
    invoices: payload.invoices.map((invoice) => ({
      ...invoice,
      invoice: { ...invoice.invoice },
      lines: invoice.lines.map((line) => ({ ...line })),
      supplierSuggestion: { ...invoice.supplierSuggestion },
      summary: { ...invoice.summary },
      confirmationSummary: invoice.confirmationSummary
        ? {
            ...invoice.confirmationSummary,
            topAffectedDishes: invoice.confirmationSummary.topAffectedDishes.map((dish) => ({
              ...dish
            }))
          }
        : undefined,
      affectedDishes: invoice.affectedDishes?.map((dish) => ({ ...dish })),
      alerts: invoice.alerts?.map((alert) => ({ ...alert })),
      ocrJob: invoice.ocrJob ? { ...invoice.ocrJob } : undefined,
      ocrResult: invoice.ocrResult
        ? {
            ...invoice.ocrResult,
            warnings: [...invoice.ocrResult.warnings],
            lines: invoice.ocrResult.lines.map((line) => ({
              ...line,
              warnings: [...line.warnings]
            }))
          }
        : undefined,
      qualityReport: invoice.qualityReport
        ? {
            ...invoice.qualityReport,
            warnings: [...invoice.qualityReport.warnings]
          }
        : undefined
    })),
    ocrJobs: payload.ocrJobs.map((job) => ({
      ...job,
      qualityReport: job.qualityReport
        ? {
            ...job.qualityReport,
            warnings: [...job.qualityReport.warnings]
          }
        : undefined
    }))
  };
}
