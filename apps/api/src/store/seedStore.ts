import type { DemoDatasetDefinition, Ingredient, Recipe } from "../../../../packages/core/src/index.js";

const pilotIngredients: Ingredient[] = [
  { id: "pilot-romaine", name: "Romaine Lettuce", costPerUnitCents: 1, unit: "g" },
  { id: "pilot-parmesan", name: "Parmesan", costPerUnitCents: 6, unit: "g" },
  { id: "pilot-croutons", name: "Croutons", costPerUnitCents: 3, unit: "g" },
  { id: "pilot-chicken", name: "Chicken Breast", costPerUnitCents: 2, unit: "g" },
  { id: "pilot-bun", name: "Brioche Bun", costPerUnitCents: 90, unit: "piece" },
  { id: "pilot-beef-patty", name: "Beef Patty", costPerUnitCents: 3, unit: "g" },
  { id: "pilot-cheddar", name: "Cheddar", costPerUnitCents: 5, unit: "g" },
  { id: "pilot-fries", name: "Fries", costPerUnitCents: 1, unit: "g" }
];

const pilotRecipes: Recipe[] = [
  {
    id: "pilot-recipe-caesar",
    name: "Pilot Chicken Caesar",
    yield: 1,
    ingredients: [
      { ingredientId: "pilot-romaine", quantity: 120, unit: "g" },
      { ingredientId: "pilot-parmesan", quantity: 20, unit: "g" },
      { ingredientId: "pilot-croutons", quantity: 30, unit: "g" },
      { ingredientId: "pilot-chicken", quantity: 110, unit: "g" }
    ]
  },
  {
    id: "pilot-recipe-burger",
    name: "Pilot House Burger",
    yield: 1,
    ingredients: [
      { ingredientId: "pilot-bun", quantity: 1, unit: "piece" },
      { ingredientId: "pilot-beef-patty", quantity: 180, unit: "g" },
      { ingredientId: "pilot-cheddar", quantity: 25, unit: "g" }
    ]
  },
  {
    id: "pilot-recipe-loaded-fries",
    name: "Pilot Loaded Fries",
    yield: 1,
    ingredients: [
      { ingredientId: "pilot-fries", quantity: 180, unit: "g" },
      { ingredientId: "pilot-cheddar", quantity: 35, unit: "g" }
    ]
  }
];

export function createPilotWorkspaceDefinition(): DemoDatasetDefinition {
  return {
    id: "pilot-workspace",
    name: "Pilot Workspace",
    description:
      "Neutral starter workspace for a controlled pilot. Replace or refine it with imported restaurant data before making live decisions.",
    profile: "mixed",
    ownerDiagnosis: "Pilot workspace is ready for cost confirmation and first-pass menu review.",
    expectedBehavior:
      "A small neutral menu that keeps the dashboard, invoice workflow, and alerts usable before customer-specific data is loaded.",
    demoNarrative:
      "Use this workspace as the safe starting point in pilot mode before importing restaurant-specific menu and cost data.",
    validationStatus: "pass",
    data: {
      ingredients: pilotIngredients.map((ingredient) => ({ ...ingredient })),
      recipes: pilotRecipes.map((recipe) => ({
        ...recipe,
        ingredients: recipe.ingredients.map((ingredient) => ({ ...ingredient }))
      })),
      dishes: [
        {
          id: "pilot-dish-caesar",
          name: "Pilot Chicken Caesar",
          recipeId: "pilot-recipe-caesar",
          priceCents: 1390,
          salesVolume: 80
        },
        {
          id: "pilot-dish-burger",
          name: "Pilot House Burger",
          recipeId: "pilot-recipe-burger",
          priceCents: 1490,
          salesVolume: 110
        },
        {
          id: "pilot-dish-loaded-fries",
          name: "Pilot Loaded Fries",
          recipeId: "pilot-recipe-loaded-fries",
          priceCents: 890,
          salesVolume: 70
        }
      ]
    }
  };
}
