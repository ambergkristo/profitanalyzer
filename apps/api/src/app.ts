import cors from "cors";
import express from "express";

import { simulateDishPriceChange } from "../../../packages/core/src/index.js";
import {
  getAllActions,
  getCalculatedDishes,
  getDemoDatasets,
  getDishDetail,
  getOverview,
  getResolvedDataset
} from "./data.js";

function isPositivePrice(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function parseDatasetId(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function resolveDatasetOrRespond(
  datasetId: string | undefined,
  response: express.Response
) {
  const dataset = getResolvedDataset(datasetId);

  if (!dataset) {
    response.status(404).json({ message: `Unknown dataset "${datasetId}".` });
    return null;
  }

  return dataset;
}

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/health", (_request, response) => {
    response.json({ ok: true, service: "profit-analyzer-api" });
  });

  app.get("/api/demo/datasets", (_request, response) => {
    response.json(getDemoDatasets());
  });

  app.get("/api/ingredients", (_request, response) => {
    const dataset = getResolvedDataset();
    response.json(dataset?.data.ingredients ?? []);
  });

  app.get("/api/recipes", (_request, response) => {
    const dataset = getResolvedDataset();
    response.json(dataset?.data.recipes ?? []);
  });

  app.get("/api/dishes", (_request, response) => {
    const dataset = getResolvedDataset();
    response.json(dataset?.data.dishes ?? []);
  });

  app.get("/api/analytics/dishes", (request, response) => {
    const datasetId = parseDatasetId(request.query.dataset);
    if (!resolveDatasetOrRespond(datasetId, response)) {
      return;
    }

    response.json(getCalculatedDishes(datasetId));
  });

  app.get("/api/analytics/overview", (request, response) => {
    const datasetId = parseDatasetId(request.query.dataset);
    if (!resolveDatasetOrRespond(datasetId, response)) {
      return;
    }

    response.json(getOverview(datasetId));
  });

  app.get("/api/analytics/actions", (request, response) => {
    const datasetId = parseDatasetId(request.query.dataset);
    if (!resolveDatasetOrRespond(datasetId, response)) {
      return;
    }

    response.json(getAllActions(datasetId));
  });

  app.get("/api/analytics/dish/:id", (request, response) => {
    const datasetId = parseDatasetId(request.query.dataset);
    if (!resolveDatasetOrRespond(datasetId, response)) {
      return;
    }

    const detail = getDishDetail(request.params.id, datasetId);
    if (!detail) {
      response.status(404).json({ message: "Dish not found." });
      return;
    }

    response.json(detail);
  });

  app.post("/api/simulate/price", (request, response) => {
    const datasetId = parseDatasetId(request.query.dataset);
    const dataset = resolveDatasetOrRespond(datasetId, response);

    if (!dataset) {
      return;
    }

    const { dishId, newPriceCents } = request.body as { dishId?: unknown; newPriceCents?: unknown };

    if (typeof dishId !== "string" || dishId.trim().length === 0 || !isPositivePrice(newPriceCents)) {
      response.status(400).json({ message: "dishId is required and newPriceCents must be a positive number." });
      return;
    }

    const dish = dataset.data.dishes.find((item) => item.id === dishId);
    if (!dish) {
      response.status(404).json({ message: "Dish not found." });
      return;
    }

    const recipe = dataset.data.recipes.find((item) => item.id === dish.recipeId);
    if (!recipe) {
      response.status(404).json({ message: "Recipe not found." });
      return;
    }

    response.json(simulateDishPriceChange(dish, recipe, dataset.data.ingredients, newPriceCents));
  });

  return app;
}
