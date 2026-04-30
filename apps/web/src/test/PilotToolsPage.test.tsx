import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PilotToolsPage } from "../pages/PilotTools.js";

vi.mock("../api/client.js", () => ({
  apiClient: {
    getAppConfig: vi.fn(),
    getDemoDatasets: vi.fn(),
    getDeepHealth: vi.fn(),
    getIngredients: vi.fn(),
    getMenuDishes: vi.fn(),
    getRecipes: vi.fn(),
    createIngredient: vi.fn(),
    updateIngredient: vi.fn(),
    createRecipe: vi.fn(),
    updateRecipe: vi.fn(),
    createDish: vi.fn(),
    updateDish: vi.fn(),
    exportDataset: vi.fn(),
    exportDatasetBlob: vi.fn(),
    validateImportDataset: vi.fn(),
    importDataset: vi.fn(),
    resetDataset: vi.fn()
  }
}));

import { apiClient } from "../api/client.js";

describe("PilotToolsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(apiClient.getAppConfig).mockResolvedValue({
      appMode: "pilot",
      version: "0.1.0",
      productionReadinessClaimed: false,
      storage: {
        driver: "memory",
        dataDirConfigured: false,
        readable: true,
        writable: true,
        persistenceWarning: "This pilot build uses memory storage. Restarting the API resets data."
      },
      workspaceContext: {
        workspaceId: "workspace-pilot-workspace",
        restaurantId: "pilot-workspace"
      },
      auth: {
        mode: "dev",
        required: true
      },
      features: {
        invoiceIntake: true,
        ocrFixture: true,
        externalOcrConfigured: false,
        databaseConfigured: false
      }
    });
    vi.mocked(apiClient.getDemoDatasets).mockResolvedValue([
      {
        id: "pilot-workspace",
        name: "Pilot Workspace",
        description: "Controlled pilot dataset.",
        profile: "mixed",
        ownerDiagnosis: "Pilot workspace is ready for cost confirmation and first-pass menu review.",
        expectedBehavior: "Pilot setup path.",
        demoNarrative: "Use this workspace before customer-specific import.",
        validationStatus: "pass"
      }
    ]);
    vi.mocked(apiClient.getDeepHealth).mockResolvedValue({
      ok: true,
      storage: {
        driver: "memory",
        dataDirConfigured: false,
        readable: true,
        writable: true,
        persistenceWarning: "This pilot build uses memory storage. Restarting the API resets data."
      },
      appMode: "pilot",
      workspaceContext: {
        workspaceId: "workspace-pilot-workspace",
        restaurantId: "pilot-workspace"
      },
      externalOcrConfigured: false,
      auth: {
        mode: "dev",
        required: true
      },
      checks: [
        {
          key: "storage",
          status: "warn",
          message: "Memory storage is active. Restarting the API resets pilot data."
        }
      ]
    });
    vi.mocked(apiClient.getIngredients).mockResolvedValue([
      { id: "pilot-romaine", name: "Romaine", costPerUnitCents: 2, unit: "g" },
      { id: "pilot-parmesan", name: "Parmesan", costPerUnitCents: 6, unit: "g" }
    ]);
    vi.mocked(apiClient.getMenuDishes).mockResolvedValue([
      {
        id: "pilot-dish-caesar",
        name: "Pilot Caesar",
        recipeId: "pilot-recipe-caesar",
        priceCents: 1390,
        salesVolume: 80
      }
    ]);
    vi.mocked(apiClient.getRecipes).mockResolvedValue([
      {
        id: "pilot-recipe-caesar",
        name: "Pilot Caesar Recipe",
        yield: 1,
        ingredients: [{ ingredientId: "pilot-romaine", quantity: 120, unit: "g" }]
      }
    ]);
    vi.mocked(apiClient.createIngredient).mockResolvedValue({
      id: "ingredient-new",
      name: "New ingredient",
      costPerUnitCents: 120,
      unit: "g"
    });
    vi.mocked(apiClient.updateIngredient).mockResolvedValue({
      id: "ingredient-existing",
      name: "Updated ingredient",
      costPerUnitCents: 125,
      unit: "g"
    });
    vi.mocked(apiClient.createRecipe).mockResolvedValue({
      id: "recipe-new",
      name: "New recipe",
      yield: 1,
      ingredients: [{ ingredientId: "pilot-romaine", quantity: 120, unit: "g" }]
    });
    vi.mocked(apiClient.updateRecipe).mockResolvedValue({
      id: "pilot-recipe-caesar",
      name: "Pilot Caesar Recipe",
      yield: 1,
      ingredients: [{ ingredientId: "pilot-romaine", quantity: 150, unit: "g" }]
    });
    vi.mocked(apiClient.createDish).mockResolvedValue({
      id: "dish-new",
      name: "New dish",
      recipeId: "pilot-recipe-caesar",
      priceCents: 1200,
      salesVolume: 10
    });
    vi.mocked(apiClient.updateDish).mockResolvedValue({
      id: "dish-existing",
      name: "Updated dish",
      recipeId: "pilot-recipe-caesar",
      priceCents: 1250,
      salesVolume: 12
    });
    vi.mocked(apiClient.exportDataset).mockResolvedValue({
      schemaVersion: 1,
      datasetId: "pilot-workspace",
      exportedFromAppVersion: "0.1.0",
      dataset: {
        id: "pilot-workspace",
        name: "Pilot Workspace",
        description: "Controlled pilot dataset.",
        profile: "mixed",
        ownerDiagnosis: "Pilot",
        expectedBehavior: "Pilot",
        demoNarrative: "Pilot",
        validationStatus: "pass",
        data: {
          ingredients: [],
          recipes: [],
          dishes: []
        }
      },
      ingredients: [],
      recipes: [],
      dishes: [],
      suppliers: [],
      supplierProductMatches: [],
      costHistory: [],
      alerts: [],
      invoices: [],
      ocrJobs: []
    });
    vi.mocked(apiClient.exportDatasetBlob).mockResolvedValue(new Blob(["{}"], { type: "application/json" }));
    vi.mocked(apiClient.validateImportDataset).mockResolvedValue({
      valid: true,
      summary: {
        ingredients: 2,
        recipes: 1,
        dishes: 1,
        suppliers: 1,
        invoices: 0
      },
      warnings: [],
      errors: []
    });
    vi.mocked(apiClient.resetDataset).mockResolvedValue({
      datasetId: "pilot-workspace",
      clearedInvoices: 2,
      clearedCostHistory: 1,
      clearedAlerts: 3,
      clearedOcrJobs: 1,
      restoredDishCount: 3
    });
    vi.mocked(apiClient.importDataset).mockResolvedValue({
      datasetId: "pilot-workspace",
      ingredientCount: 2,
      recipeCount: 1,
      dishCount: 1,
      supplierCount: 1
    });
  });

  function renderPage() {
    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        initialEntries={["/pilot-tools?dataset=pilot-workspace"]}
      >
        <PilotToolsPage />
      </MemoryRouter>
    );
  }

  it("renders storage warning, recipe editor, and export controls", async () => {
    renderPage();

    expect(await screen.findByText("Set up the pilot workspace safely")).toBeInTheDocument();
    expect(
      await screen.findByText("This pilot build uses memory storage. Restarting the API resets data.")
    ).toBeInTheDocument();
    expect(screen.getByText("Recipes")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export dataset" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download JSON" })).toBeInTheDocument();
  });

  it("supports recipe editing and safe import validation before import", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { name: "Recipes" })).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Add ingredient line" })[0]);
    expect(screen.getAllByRole("button", { name: "Remove" }).length).toBeGreaterThan(0);

    fireEvent.change(screen.getAllByDisplayValue("Pilot Caesar Recipe")[0], {
      target: { value: "Updated Caesar Recipe" }
    });
    fireEvent.change(screen.getByLabelText("Updated Caesar Recipe ingredient 1"), {
      target: { value: "pilot-parmesan" }
    });
    fireEvent.change(screen.getAllByDisplayValue("120")[0], {
      target: { value: "150" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Save recipe" }));

    await waitFor(() => {
      expect(vi.mocked(apiClient.updateRecipe)).toHaveBeenCalledTimes(1);
    });

    const recipeUpdateCall = vi.mocked(apiClient.updateRecipe).mock.calls[0];
    const recipeUpdatePayload = recipeUpdateCall?.[1] as
      | { name?: string; ingredients?: Array<{ ingredientId: string; quantity: number }> }
      | undefined;

    expect(recipeUpdateCall?.[0]).toBe("pilot-recipe-caesar");
    expect(recipeUpdateCall?.[2]).toBe("pilot-workspace");
    expect(recipeUpdatePayload?.name).toBe("Updated Caesar Recipe");
    expect(recipeUpdatePayload?.ingredients).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ingredientId: "pilot-parmesan",
          quantity: 150
        })
      ])
    );

    const importPayload = JSON.stringify({
      schemaVersion: 1,
      datasetId: "pilot-workspace",
      exportedFromAppVersion: "0.1.0",
      dataset: {
        id: "pilot-workspace",
        name: "Pilot Workspace",
        description: "Pilot",
        profile: "mixed",
        ownerDiagnosis: "Pilot",
        expectedBehavior: "Pilot",
        demoNarrative: "Pilot",
        validationStatus: "pass",
        data: {
          ingredients: [],
          recipes: [],
          dishes: []
        }
      },
      ingredients: [],
      recipes: [],
      dishes: [],
      suppliers: [],
      supplierProductMatches: [],
      costHistory: [],
      alerts: [],
      invoices: [],
      ocrJobs: []
    });

    fireEvent.change(screen.getByLabelText("Dataset JSON"), {
      target: { value: importPayload }
    });

    fireEvent.click(screen.getByRole("button", { name: "Validate import" }));
    expect(await screen.findByText("Import validation summary")).toBeInTheDocument();
    expect(screen.getByText("Ingredients 2, recipes 1, dishes 1, suppliers 1, invoices 0.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Import pilot dataset" }));
    await waitFor(() => {
      expect(vi.mocked(apiClient.importDataset)).toHaveBeenCalledTimes(1);
    });
  });
});
