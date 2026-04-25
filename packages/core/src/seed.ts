import { type SampleRestaurantData } from "./types.js";

export const sampleRestaurantData: SampleRestaurantData = {
  ingredients: [
    { id: "romaine", name: "Romaine Lettuce", costPerUnitCents: 1, unit: "g" },
    { id: "parmesan", name: "Parmesan", costPerUnitCents: 6, unit: "g" },
    { id: "croutons", name: "Croutons", costPerUnitCents: 3, unit: "g" },
    { id: "caesar-dressing", name: "Caesar Dressing", costPerUnitCents: 5, unit: "ml" },
    { id: "chicken", name: "Chicken Breast", costPerUnitCents: 2, unit: "g" },
    { id: "bun", name: "Brioche Bun", costPerUnitCents: 90, unit: "piece" },
    { id: "beef-patty", name: "Beef Patty", costPerUnitCents: 3, unit: "g" },
    { id: "cheddar", name: "Cheddar", costPerUnitCents: 5, unit: "g" },
    { id: "carbonara-pasta", name: "Pasta", costPerUnitCents: 1, unit: "g" },
    { id: "guanciale", name: "Guanciale", costPerUnitCents: 5, unit: "g" },
    { id: "cream", name: "Cream", costPerUnitCents: 2, unit: "ml" },
    { id: "egg", name: "Egg", costPerUnitCents: 45, unit: "piece" },
    { id: "salmon", name: "Salmon Fillet", costPerUnitCents: 5, unit: "g" },
    { id: "avocado", name: "Avocado", costPerUnitCents: 4, unit: "g" },
    { id: "citrus-dressing", name: "Citrus Dressing", costPerUnitCents: 4, unit: "ml" },
    { id: "duck-breast", name: "Duck Breast", costPerUnitCents: 6, unit: "g" },
    { id: "orange-glaze", name: "Orange Glaze", costPerUnitCents: 3, unit: "ml" },
    { id: "potato", name: "Potato", costPerUnitCents: 1, unit: "g" },
    { id: "cream-dessert", name: "Dessert Cream", costPerUnitCents: 2, unit: "ml" },
    { id: "gelatin", name: "Gelatin", costPerUnitCents: 12, unit: "g" },
    { id: "vanilla", name: "Vanilla", costPerUnitCents: 20, unit: "g" },
    { id: "berry-compote", name: "Berry Compote", costPerUnitCents: 4, unit: "g" }
  ],
  recipes: [
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
        { ingredientId: "caesar-dressing", quantity: 20, unit: "ml" }
      ]
    },
    {
      id: "recipe-carbonara",
      name: "Pasta Carbonara",
      yield: 1,
      ingredients: [
        { ingredientId: "carbonara-pasta", quantity: 110, unit: "g" },
        { ingredientId: "guanciale", quantity: 70, unit: "g" },
        { ingredientId: "cream", quantity: 60, unit: "ml" },
        { ingredientId: "egg", quantity: 1, unit: "piece" },
        { ingredientId: "parmesan", quantity: 20, unit: "g" }
      ]
    },
    {
      id: "recipe-salmon",
      name: "Salmon Tartare",
      yield: 1,
      ingredients: [
        { ingredientId: "salmon", quantity: 140, unit: "g" },
        { ingredientId: "avocado", quantity: 80, unit: "g" },
        { ingredientId: "citrus-dressing", quantity: 25, unit: "ml" }
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
    }
  ],
  dishes: [
    { id: "dish-caesar", name: "Caesar Salad", recipeId: "recipe-caesar", priceCents: 1690, salesVolume: 120 },
    { id: "dish-burger", name: "Beef Burger", recipeId: "recipe-burger", priceCents: 1590, salesVolume: 260 },
    { id: "dish-carbonara", name: "Pasta Carbonara", recipeId: "recipe-carbonara", priceCents: 1650, salesVolume: 180 },
    { id: "dish-salmon", name: "Salmon Tartare", recipeId: "recipe-salmon", priceCents: 1950, salesVolume: 70 },
    { id: "dish-duck", name: "Duck a l'Orange", recipeId: "recipe-duck", priceCents: 1750, salesVolume: 45 },
    { id: "dish-panna-cotta", name: "Panna Cotta", recipeId: "recipe-panna-cotta", priceCents: 990, salesVolume: 95 }
  ]
};
