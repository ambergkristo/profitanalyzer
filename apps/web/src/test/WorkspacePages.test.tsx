import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AlertsPage } from "../pages/Alerts.js";
import { IngredientsPage } from "../pages/Ingredients.js";
import { RecipesPage } from "../pages/Recipes.js";
import type { Ingredient, PriceChangeAlert, Recipe } from "../types.js";

vi.mock("../api/client.js", () => ({
  apiClient: {
    getDishes: vi.fn(),
    getIngredients: vi.fn(),
    getPriceChangeAlerts: vi.fn(),
    getRecipes: vi.fn(),
    createIngredient: vi.fn(),
    createRecipe: vi.fn(),
    updateIngredient: vi.fn(),
    updateRecipe: vi.fn()
  }
}));

import { apiClient } from "../api/client.js";

const ingredients: Ingredient[] = [
  { id: "ing-flour", name: "Flour", costPerUnitCents: 2, unit: "g" },
  { id: "ing-cheese", name: "Cheese", costPerUnitCents: 6, unit: "g" }
];

const recipes: Recipe[] = [
  {
    id: "recipe-pizza",
    name: "House Pizza Base",
    yield: 1,
    ingredients: [{ ingredientId: "ing-flour", quantity: 180, unit: "g" }]
  }
];

describe("production workspace pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.getIngredients).mockResolvedValue([...ingredients]);
    vi.mocked(apiClient.getRecipes).mockResolvedValue([...recipes]);
    vi.mocked(apiClient.getDishes).mockResolvedValue([
      {
        dishId: "dish-pizza",
        name: "House Pizza",
        priceCents: 1400,
        costCents: 620,
        marginPercent: 55.7,
        grossProfitPerSaleCents: 780,
        estimatedPeriodProfitCents: 70200,
        salesVolume: 90,
        status: "profitable",
        costRatioPercent: 44.3,
        contributionRank: 1,
        warnings: []
      }
    ]);
    vi.mocked(apiClient.getPriceChangeAlerts).mockResolvedValue([
      {
        id: "alert-cheese",
        type: "ingredient_price_up",
        severity: "high",
        ingredientId: "ing-cheese",
        ingredientName: "Cheese",
        supplierId: "supplier-dairy",
        supplierName: "Dairy Supplier",
        invoiceId: "invoice-1",
        invoiceLineId: "line-1",
        previousCostPerUnitCents: 5,
        newCostPerUnitCents: 6,
        deltaPercent: 20,
        affectedDishIds: ["dish-pizza"],
        affectedDishNames: ["House Pizza"],
        estimatedMarginImpactCents: 1200,
        message: "Cheese cost increased by 20%.",
        recommendedAction: "Review pizza margin before the next menu cycle.",
        status: "open",
        sourceInvoiceNumber: "INV-1",
        sourceInvoiceDate: "2026-05-01",
        createdAt: "2026-05-05T00:00:00.000Z"
      }
    ] satisfies PriceChangeAlert[]);
  });

  it("renders the ingredients workspace with compact editing context", async () => {
    render(
      <MemoryRouter initialEntries={["/ingredients?dataset=mixed-restaurant"]}>
        <IngredientsPage />
      </MemoryRouter>
    );

    expect(await screen.findByText("Ingredient workspace")).toBeInTheDocument();
    expect(screen.getByText("Ingredient costs")).toBeInTheDocument();
    expect(screen.getByText("Flour")).toBeInTheDocument();
    expect(screen.getByLabelText("Search ingredients")).toBeInTheDocument();
  });

  it("renders the recipe builder as a split workspace", async () => {
    render(
      <MemoryRouter initialEntries={["/recipes?dataset=mixed-restaurant"]}>
        <RecipesPage />
      </MemoryRouter>
    );

    expect(await screen.findByText("Recipe workspace")).toBeInTheDocument();
    expect(screen.getByText("Recipe builder")).toBeInTheDocument();
    expect(screen.getByText("House Pizza Base")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add ingredient line" })).toBeInTheDocument();
  });

  it("renders alerts as a supplier risk worklist", async () => {
    render(
      <MemoryRouter initialEntries={["/alerts?dataset=mixed-restaurant"]}>
        <AlertsPage />
      </MemoryRouter>
    );

    expect(await screen.findByText("Alerts workspace")).toBeInTheDocument();
    expect(screen.getByText("Supplier cost pressure")).toBeInTheDocument();
    expect(screen.getByText("Cheese cost increased by 20%.")).toBeInTheDocument();
    expect(screen.getByText("Open affected dish")).toBeInTheDocument();
  });
});
