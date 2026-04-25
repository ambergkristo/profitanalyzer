import cors from "cors";
import express from "express";

import { calculateDishMetrics } from "../../../packages/core/src/index.js";
import { getCalculatedDishes, getDishDetail, getOverview, restaurantData } from "./data.js";

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

  app.get("/api/analytics/dish/:id", (request, response) => {
    const detail = getDishDetail(request.params.id);
    if (!detail) {
      response.status(404).json({ message: "Dish not found." });
      return;
    }

    response.json(detail);
  });

  app.post("/api/simulate/price", (request, response) => {
    const { dishId, newPriceCents } = request.body as { dishId?: string; newPriceCents?: number };

    if (!dishId || typeof newPriceCents !== "number") {
      response.status(400).json({ message: "dishId and newPriceCents are required." });
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

    const oldMetrics = getCalculatedDishes().find((item) => item.dishId === dishId);
    const simulatedDish = { ...dish, priceCents: newPriceCents };
    const newMetrics = calculateDishMetrics(simulatedDish, recipe, restaurantData.ingredients);

    if (!oldMetrics) {
      response.status(500).json({ message: "Simulation failed." });
      return;
    }

    response.json({
      dishId,
      oldPriceCents: dish.priceCents,
      newPriceCents,
      oldMarginPercent: oldMetrics.marginPercent,
      newMarginPercent: newMetrics.marginPercent,
      oldEstimatedPeriodProfitCents: oldMetrics.estimatedPeriodProfitCents,
      newEstimatedPeriodProfitCents: newMetrics.estimatedPeriodProfitCents,
      profitDeltaCents: newMetrics.estimatedPeriodProfitCents - oldMetrics.estimatedPeriodProfitCents
    });
  });

  return app;
}
