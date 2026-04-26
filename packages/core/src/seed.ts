import {
  type DemoDatasetDefinition,
  type DemoDatasetSummary,
  type Ingredient,
  type Recipe,
  type SampleRestaurantData
} from "./types.js";

const baseIngredients: Ingredient[] = [
  { id: "romaine", name: "Romaine Lettuce", costPerUnitCents: 1, unit: "g" },
  { id: "parmesan", name: "Parmesan", costPerUnitCents: 6, unit: "g" },
  { id: "croutons", name: "Croutons", costPerUnitCents: 3, unit: "g" },
  { id: "caesar-dressing", name: "Caesar Dressing", costPerUnitCents: 5, unit: "ml" },
  { id: "chicken", name: "Chicken Breast", costPerUnitCents: 2, unit: "g" },
  { id: "bun", name: "Brioche Bun", costPerUnitCents: 90, unit: "piece" },
  { id: "beef-patty", name: "Beef Patty", costPerUnitCents: 3, unit: "g" },
  { id: "cheddar", name: "Cheddar", costPerUnitCents: 5, unit: "g" },
  { id: "burger-sauce", name: "Burger Sauce", costPerUnitCents: 4, unit: "ml" },
  { id: "tomato", name: "Tomato", costPerUnitCents: 1, unit: "g" },
  { id: "lettuce", name: "Butter Lettuce", costPerUnitCents: 1, unit: "g" },
  { id: "pasta", name: "Fresh Pasta", costPerUnitCents: 1, unit: "g" },
  { id: "guanciale", name: "Guanciale", costPerUnitCents: 5, unit: "g" },
  { id: "cream", name: "Cream", costPerUnitCents: 2, unit: "ml" },
  { id: "egg", name: "Egg", costPerUnitCents: 45, unit: "piece" },
  { id: "salmon", name: "Salmon Fillet", costPerUnitCents: 5, unit: "g" },
  { id: "avocado", name: "Avocado", costPerUnitCents: 4, unit: "g" },
  { id: "citrus-dressing", name: "Citrus Dressing", costPerUnitCents: 4, unit: "ml" },
  { id: "rice", name: "Sushi Rice", costPerUnitCents: 1, unit: "g" },
  { id: "duck-breast", name: "Duck Breast", costPerUnitCents: 6, unit: "g" },
  { id: "orange-glaze", name: "Orange Glaze", costPerUnitCents: 3, unit: "ml" },
  { id: "potato", name: "Potato", costPerUnitCents: 1, unit: "g" },
  { id: "cream-dessert", name: "Dessert Cream", costPerUnitCents: 2, unit: "ml" },
  { id: "gelatin", name: "Gelatin", costPerUnitCents: 12, unit: "g" },
  { id: "vanilla", name: "Vanilla", costPerUnitCents: 20, unit: "g" },
  { id: "berry-compote", name: "Berry Compote", costPerUnitCents: 4, unit: "g" },
  { id: "flatbread-base", name: "Flatbread Base", costPerUnitCents: 120, unit: "piece" },
  { id: "tomato-sauce", name: "Tomato Sauce", costPerUnitCents: 2, unit: "g" },
  { id: "mozzarella", name: "Mozzarella", costPerUnitCents: 3, unit: "g" },
  { id: "basil", name: "Basil", costPerUnitCents: 15, unit: "g" },
  { id: "steak", name: "Sirloin Steak", costPerUnitCents: 7, unit: "g" },
  { id: "fries", name: "Fries", costPerUnitCents: 1, unit: "g" },
  { id: "pepper-sauce", name: "Pepper Sauce", costPerUnitCents: 4, unit: "ml" }
];

const baseRecipes: Recipe[] = [
  {
    id: "recipe-caesar",
    name: "Caesar Salad",
    yield: 1,
    ingredients: [
      { ingredientId: "romaine", quantity: 120, unit: "g" },
      { ingredientId: "parmesan", quantity: 20, unit: "g" },
      { ingredientId: "croutons", quantity: 30, unit: "g" },
      { ingredientId: "caesar-dressing", quantity: 45, unit: "ml" },
      { ingredientId: "chicken", quantity: 110, unit: "g" }
    ]
  },
  {
    id: "recipe-burger",
    name: "Beef Burger",
    yield: 1,
    ingredients: [
      { ingredientId: "bun", quantity: 1, unit: "piece" },
      { ingredientId: "beef-patty", quantity: 180, unit: "g" },
      { ingredientId: "cheddar", quantity: 25, unit: "g" },
      { ingredientId: "burger-sauce", quantity: 20, unit: "ml" },
      { ingredientId: "tomato", quantity: 20, unit: "g" },
      { ingredientId: "lettuce", quantity: 15, unit: "g" }
    ]
  },
  {
    id: "recipe-carbonara",
    name: "Pasta Carbonara",
    yield: 1,
    ingredients: [
      { ingredientId: "pasta", quantity: 110, unit: "g" },
      { ingredientId: "guanciale", quantity: 70, unit: "g" },
      { ingredientId: "cream", quantity: 60, unit: "ml" },
      { ingredientId: "egg", quantity: 1, unit: "piece" },
      { ingredientId: "parmesan", quantity: 20, unit: "g" }
    ]
  },
  {
    id: "recipe-salmon-bowl",
    name: "Salmon Bowl",
    yield: 1,
    ingredients: [
      { ingredientId: "salmon", quantity: 130, unit: "g" },
      { ingredientId: "avocado", quantity: 70, unit: "g" },
      { ingredientId: "rice", quantity: 140, unit: "g" },
      { ingredientId: "citrus-dressing", quantity: 20, unit: "ml" }
    ]
  },
  {
    id: "recipe-duck",
    name: "Duck a l'Orange",
    yield: 1,
    ingredients: [
      { ingredientId: "duck-breast", quantity: 220, unit: "g" },
      { ingredientId: "orange-glaze", quantity: 40, unit: "ml" },
      { ingredientId: "potato", quantity: 180, unit: "g" }
    ]
  },
  {
    id: "recipe-panna-cotta",
    name: "Panna Cotta",
    yield: 1,
    ingredients: [
      { ingredientId: "cream-dessert", quantity: 150, unit: "ml" },
      { ingredientId: "gelatin", quantity: 4, unit: "g" },
      { ingredientId: "vanilla", quantity: 2, unit: "g" },
      { ingredientId: "berry-compote", quantity: 40, unit: "g" }
    ]
  },
  {
    id: "recipe-flatbread",
    name: "Margherita Flatbread",
    yield: 1,
    ingredients: [
      { ingredientId: "flatbread-base", quantity: 1, unit: "piece" },
      { ingredientId: "tomato-sauce", quantity: 50, unit: "g" },
      { ingredientId: "mozzarella", quantity: 90, unit: "g" },
      { ingredientId: "basil", quantity: 1, unit: "g" }
    ]
  },
  {
    id: "recipe-steak-frites",
    name: "Steak Frites",
    yield: 1,
    ingredients: [
      { ingredientId: "steak", quantity: 200, unit: "g" },
      { ingredientId: "fries", quantity: 150, unit: "g" },
      { ingredientId: "pepper-sauce", quantity: 30, unit: "ml" }
    ]
  }
];

function createRestaurantData(
  dishes: SampleRestaurantData["dishes"],
  ingredients: Ingredient[] = baseIngredients,
  recipes: Recipe[] = baseRecipes
): SampleRestaurantData {
  return {
    ingredients,
    recipes,
    dishes
  };
}

function createDataset(definition: DemoDatasetDefinition): DemoDatasetDefinition {
  return definition;
}

export const canonicalDemoDatasets = [
  createDataset({
    id: "mixed-restaurant",
    name: "Mixed Casual Restaurant",
    description:
      "Balanced casual dining scenario with a few strong winners, a couple of leaks, and one recipe-data warning to prove graceful handling.",
    profile: "mixed",
    ownerDiagnosis: "Mixed performance. Fix leaks while protecting top contributors.",
    expectedBehavior:
      "A balanced action stack with profitable dishes, warning dishes, and at least one clear data-quality or margin-repair action.",
    demoNarrative:
      "Use this scenario to show the full decision loop: a realistic menu with winners, leaks, and one missing-input warning.",
    validationStatus: "pass",
    data: createRestaurantData(
      [
        { id: "dish-caesar", name: "Caesar Salad", recipeId: "recipe-caesar", priceCents: 1450, salesVolume: 170 },
        { id: "dish-burger", name: "Beef Burger", recipeId: "recipe-burger", priceCents: 1350, salesVolume: 290 },
        { id: "dish-carbonara", name: "Pasta Carbonara", recipeId: "recipe-carbonara", priceCents: 1590, salesVolume: 130 },
        { id: "dish-salmon-bowl", name: "Salmon Bowl", recipeId: "recipe-salmon-bowl", priceCents: 1650, salesVolume: 145 },
        { id: "dish-duck", name: "Duck a l'Orange", recipeId: "recipe-duck", priceCents: 1750, salesVolume: 55 },
        { id: "dish-panna-cotta", name: "Panna Cotta", recipeId: "recipe-panna-cotta", priceCents: 990, salesVolume: 95 },
        { id: "dish-flatbread", name: "Margherita Flatbread", recipeId: "recipe-flatbread", priceCents: 1490, salesVolume: 70 },
        { id: "dish-steak-frites", name: "Steak Frites", recipeId: "recipe-steak-frites", priceCents: 1690, salesVolume: 75 }
      ],
      baseIngredients.filter((ingredient) => ingredient.id !== "basil")
    )
  }),
  createDataset({
    id: "low-margin-kitchen",
    name: "Low Margin Kitchen",
    description:
      "Volume-heavy kitchen under pricing pressure where repair actions should dominate the first screen.",
    profile: "low-margin",
    ownerDiagnosis: "Margin pressure detected. Start with high-sales dishes below 50% margin.",
    expectedBehavior:
      "High and critical actions should dominate, with bestseller margin repair and pricing review at the top.",
    demoNarrative:
      "Show this scenario first in a demo when you want the product to surface urgent action immediately.",
    validationStatus: "pass",
    data: createRestaurantData([
      { id: "dish-caesar", name: "Caesar Salad", recipeId: "recipe-caesar", priceCents: 1190, salesVolume: 220 },
      { id: "dish-burger", name: "Beef Burger", recipeId: "recipe-burger", priceCents: 1090, salesVolume: 360 },
      { id: "dish-carbonara", name: "Pasta Carbonara", recipeId: "recipe-carbonara", priceCents: 1190, salesVolume: 230 },
      { id: "dish-salmon-bowl", name: "Salmon Bowl", recipeId: "recipe-salmon-bowl", priceCents: 1290, salesVolume: 205 },
      { id: "dish-duck", name: "Duck a l'Orange", recipeId: "recipe-duck", priceCents: 1490, salesVolume: 115 },
      { id: "dish-panna-cotta", name: "Panna Cotta", recipeId: "recipe-panna-cotta", priceCents: 790, salesVolume: 170 },
      { id: "dish-flatbread", name: "Margherita Flatbread", recipeId: "recipe-flatbread", priceCents: 990, salesVolume: 165 },
      { id: "dish-steak-frites", name: "Steak Frites", recipeId: "recipe-steak-frites", priceCents: 1490, salesVolume: 120 }
    ])
  }),
  createDataset({
    id: "high-margin-bistro",
    name: "High Margin Bistro",
    description:
      "Healthy premium bistro where most dishes are profitable and the engine should emphasize growth and protection of winners.",
    profile: "high-margin",
    ownerDiagnosis: "Menu is mostly healthy. Protect winners and grow high-margin dishes.",
    expectedBehavior:
      "Mostly profitable dishes, few urgent fixes, and some promotion or growth actions instead of repair-heavy output.",
    demoNarrative:
      "Use this scenario to prove the engine does not invent panic when the menu is already healthy.",
    validationStatus: "pass",
    data: createRestaurantData([
      { id: "dish-caesar", name: "Caesar Salad", recipeId: "recipe-caesar", priceCents: 1890, salesVolume: 120 },
      { id: "dish-burger", name: "Beef Burger", recipeId: "recipe-burger", priceCents: 1790, salesVolume: 165 },
      { id: "dish-carbonara", name: "Pasta Carbonara", recipeId: "recipe-carbonara", priceCents: 1890, salesVolume: 110 },
      { id: "dish-salmon-bowl", name: "Salmon Bowl", recipeId: "recipe-salmon-bowl", priceCents: 2090, salesVolume: 95 },
      { id: "dish-duck", name: "Duck a l'Orange", recipeId: "recipe-duck", priceCents: 2490, salesVolume: 70 },
      { id: "dish-panna-cotta", name: "Panna Cotta", recipeId: "recipe-panna-cotta", priceCents: 1290, salesVolume: 60 },
      { id: "dish-flatbread", name: "Margherita Flatbread", recipeId: "recipe-flatbread", priceCents: 1790, salesVolume: 65 },
      { id: "dish-steak-frites", name: "Steak Frites", recipeId: "recipe-steak-frites", priceCents: 2490, salesVolume: 45 }
    ])
  })
] as const satisfies readonly DemoDatasetDefinition[];

export const defaultDemoDatasetId = "mixed-restaurant";

export const sampleRestaurantData = canonicalDemoDatasets[0].data;

export const syntheticRestaurantDatasets = {
  mixed: canonicalDemoDatasets[0].data,
  lowMargin: canonicalDemoDatasets[1].data,
  highMargin: canonicalDemoDatasets[2].data
} as const;

export function listDemoDatasets(): DemoDatasetSummary[] {
  return canonicalDemoDatasets.map((dataset) => ({
    id: dataset.id,
    name: dataset.name,
    description: dataset.description,
    profile: dataset.profile,
    ownerDiagnosis: dataset.ownerDiagnosis,
    expectedBehavior: dataset.expectedBehavior,
    demoNarrative: dataset.demoNarrative,
    validationStatus: dataset.validationStatus
  }));
}

export function getDemoDataset(datasetId = defaultDemoDatasetId): DemoDatasetDefinition | undefined {
  return canonicalDemoDatasets.find((dataset) => dataset.id === datasetId);
}
