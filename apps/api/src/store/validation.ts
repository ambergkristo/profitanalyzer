import type { IngredientUnit, RecipeIngredient } from "../../../../packages/core/src/index.js";

export const allowedRecipeInputUnits = ["kg", "g", "l", "ml", "pcs", "pack", "piece"] as const;

type AllowedRecipeInputUnit = (typeof allowedRecipeInputUnits)[number];

function isAllowedRecipeInputUnit(value: unknown): value is AllowedRecipeInputUnit {
  return typeof value === "string" && allowedRecipeInputUnits.includes(value as AllowedRecipeInputUnit);
}

export function normalizeRecipeIngredientEntry(input: {
  ingredientId?: unknown;
  quantity?: unknown;
  unit?: unknown;
}): { normalized?: RecipeIngredient; error?: string } {
  if (typeof input.ingredientId !== "string" || input.ingredientId.trim().length === 0) {
    return { error: "ingredientId is required." };
  }

  if (typeof input.quantity !== "number" || !Number.isFinite(input.quantity) || input.quantity <= 0) {
    return { error: `Ingredient "${input.ingredientId}" requires a positive quantity.` };
  }

  if (!isAllowedRecipeInputUnit(input.unit)) {
    return { error: `Ingredient "${input.ingredientId}" uses an unsupported unit.` };
  }

  let normalizedUnit: IngredientUnit;
  let normalizedQuantity = input.quantity;

  switch (input.unit) {
    case "kg":
      normalizedUnit = "g";
      normalizedQuantity = input.quantity * 1000;
      break;
    case "l":
      normalizedUnit = "ml";
      normalizedQuantity = input.quantity * 1000;
      break;
    case "pcs":
    case "pack":
    case "piece":
      normalizedUnit = "piece";
      break;
    case "g":
      normalizedUnit = "g";
      break;
    case "ml":
      normalizedUnit = "ml";
      break;
  }

  return {
    normalized: {
      ingredientId: input.ingredientId.trim(),
      quantity: normalizedQuantity,
      unit: normalizedUnit
    }
  };
}

export function normalizeRecipeIngredientEntries(
  inputs: Array<{ ingredientId?: unknown; quantity?: unknown; unit?: unknown }>
): { normalized?: RecipeIngredient[]; errors: string[] } {
  const normalized: RecipeIngredient[] = [];
  const errors: string[] = [];
  const ingredientIds = new Set<string>();

  for (const input of inputs) {
    const result = normalizeRecipeIngredientEntry(input);

    if (!result.normalized) {
      errors.push(result.error ?? "Invalid recipe ingredient.");
      continue;
    }

    if (ingredientIds.has(result.normalized.ingredientId)) {
      errors.push(`Duplicate ingredient "${result.normalized.ingredientId}" is not allowed in one recipe.`);
      continue;
    }

    ingredientIds.add(result.normalized.ingredientId);
    normalized.push(result.normalized);
  }

  return errors.length > 0 ? { errors } : { normalized, errors: [] };
}
