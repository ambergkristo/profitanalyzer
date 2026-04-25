import cors from "cors";
import express from "express";

import { simulateDishPriceChange } from "../../../packages/core/src/index.js";
import {
  getAllActions,
  getCalculatedDishes,
  getDishDetail,
  getOverview,
  restaurantData
} from "./data.js";

function isPositivePrice(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/health", (_request, response) => {
    response.json({ ok: true, service: "profit-analyzer-api" });
  });

  app.get("/api/ingredients", (_request, response) => {
    response.json(restaurantData.ingredients);
  });

  app.get("/api/recipes", (_request, response) => {
    response.json(restaurantData.recipes);
  });

  app.get("/api/dishes", (_request, response) => {
    response.json(restaurantData.dishes);
  });

  app.get("/api/analytics/dishes", (_request, response) => {
    response.json(getCalculatedDishes());
  });

  app.get("/api/analytics/overview", (_request, response) => {
    response.json(getOverview());
  });

  app.get("/api/analytics/actions", (_request, response) => {
    response.json(getAllActions());
  });

  app.get("/api/analytics/dish/:id", (request, response) => {
    const detail = getDishDetail(request.params.id);
    if (!detail) {
      response.status(404).json({ message: "Dish not found." });
      return;
    }

    response.json(detail);
  });

  app.post("/api/simulate/price", (request, response) => {
    const { dishId, newPriceCents } = request.body as { dishId?: unknown; newPriceCents?: unknown };

    if (typeof dishId !== "string" || dishId.trim().length === 0 || !isPositivePrice(newPriceCents)) {
      response.status(400).json({ message: "dishId is required and newPriceCents must be a positive number." });
      return;
    }

    const dish = restaurantData.dishes.find((item) => item.id === dishId);
    if (!dish) {
      response.status(404).json({ message: "Dish not found." });
      return;
    }

    const recipe = restaurantData.recipes.find((item) => item.id === dish.recipeId);
    if (!recipe) {
      response.status(404).json({ message: "Recipe not found." });
      return;
    }

    response.json(simulateDishPriceChange(dish, recipe, restaurantData.ingredients, newPriceCents));
  });

  return app;
}
