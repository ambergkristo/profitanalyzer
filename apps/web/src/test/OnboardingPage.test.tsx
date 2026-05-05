import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OnboardingPage } from "../pages/Onboarding.js";

vi.mock("../api/client.js", () => ({
  apiClient: {
    getAppConfig: vi.fn(),
    getDemoDatasets: vi.fn(),
    getRestaurantProfile: vi.fn(),
    updateRestaurantProfile: vi.fn(),
    getOnboardingStatus: vi.fn(),
    getOnboardingChecklist: vi.fn(),
    getIngredients: vi.fn(),
    getRecipes: vi.fn(),
    getMenuDishes: vi.fn(),
    getSuppliers: vi.fn(),
    createIngredient: vi.fn(),
    createRecipe: vi.fn(),
    updateRecipe: vi.fn(),
    createDish: vi.fn(),
    createSupplier: vi.fn(),
    completeOnboardingStep: vi.fn(),
    skipOnboardingStep: vi.fn()
  }
}));

import { apiClient } from "../api/client.js";

const config = {
  appMode: "pilot" as const,
  nodeEnv: "test" as const,
  version: "0.1.0",
  productionReadinessClaimed: false as const,
  storage: {
    driver: "file" as const,
    dataDirConfigured: true,
    readable: true,
    writable: true,
    persistenceWarning: "File storage is active for this pilot workspace."
  },
  workspaceContext: {
    workspaceId: "workspace-pilot-workspace",
    restaurantId: "pilot-workspace"
  },
  auth: {
    mode: "dev" as const,
    required: true
  },
  runtime: {
    logLevel: "warn" as const,
    appBaseUrlConfigured: true,
    apiBaseUrlConfigured: true,
    corsOriginConfigured: true
  },
  features: {
    invoiceIntake: true,
    ocrFixture: true,
    externalOcrConfigured: false,
    databaseConfigured: false
  }
};

const checklist = {
  workspaceId: "workspace-pilot-workspace",
  restaurantId: "pilot-workspace",
  progressPercent: 43,
  readyForDashboard: false,
  items: [
    {
      step: "restaurant_profile" as const,
      label: "Restaurant Profile",
      status: "complete" as const,
      complete: true,
      message: "Restaurant profile is saved."
    },
    {
      step: "ingredients" as const,
      label: "Ingredients",
      status: "in_progress" as const,
      complete: false,
      count: 2,
      minimum: 5,
      message: "Add at least 5 key ingredients."
    },
    {
      step: "recipes" as const,
      label: "Recipes",
      status: "not_started" as const,
      complete: false,
      count: 1,
      minimum: 2,
      message: "Create recipes that connect ingredients to dishes."
    },
    {
      step: "dishes" as const,
      label: "Dishes",
      status: "not_started" as const,
      complete: false,
      count: 1,
      minimum: 2,
      message: "Add priced dishes linked to recipes."
    },
    {
      step: "suppliers" as const,
      label: "Suppliers",
      status: "not_started" as const,
      complete: false,
      count: 0,
      minimum: 1,
      message: "Add at least one supplier."
    },
    {
      step: "first_invoice" as const,
      label: "First Invoice",
      status: "not_started" as const,
      complete: false,
      message: "Confirm a first invoice through review-confirm."
    },
    {
      step: "dashboard_review" as const,
      label: "Dashboard Review",
      status: "not_started" as const,
      complete: false,
      message: "Review the dashboard after setup."
    }
  ]
};

describe("OnboardingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.getAppConfig).mockResolvedValue(config);
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
    vi.mocked(apiClient.getRestaurantProfile).mockResolvedValue({
      workspaceId: "workspace-pilot-workspace",
      restaurantId: "pilot-workspace",
      name: "Pilot Workspace",
      currency: "EUR",
      country: "EE",
      concept: "Bistro",
      averageMonthlyDishSalesEstimate: 1000,
      updatedAt: "2026-04-30T00:00:00.000Z"
    });
    vi.mocked(apiClient.getOnboardingStatus).mockResolvedValue({
      workspaceId: "workspace-pilot-workspace",
      restaurantId: "pilot-workspace",
      currentStep: "restaurant_profile",
      completedSteps: ["restaurant_profile"],
      skippedSteps: [],
      progressPercent: 14,
      createdAt: "2026-04-30T00:00:00.000Z",
      updatedAt: "2026-04-30T00:00:00.000Z"
    });
    vi.mocked(apiClient.getOnboardingChecklist).mockResolvedValue(checklist);
    vi.mocked(apiClient.getIngredients).mockResolvedValue([
      { id: "ing-1", name: "Tomatoes", costPerUnitCents: 2, unit: "g" },
      { id: "ing-2", name: "Mozzarella", costPerUnitCents: 5, unit: "g" }
    ]);
    vi.mocked(apiClient.getRecipes).mockResolvedValue([
      {
        id: "recipe-1",
        name: "Tomato Plate",
        yield: 1,
        ingredients: [{ ingredientId: "ing-1", quantity: 120, unit: "g" }]
      }
    ]);
    vi.mocked(apiClient.getMenuDishes).mockResolvedValue([
      { id: "dish-1", name: "Tomato Plate", recipeId: "recipe-1", priceCents: 1200, salesVolume: 20 }
    ]);
    vi.mocked(apiClient.getSuppliers).mockResolvedValue([]);
    vi.mocked(apiClient.createIngredient).mockResolvedValue({
      id: "ing-3",
      name: "Basil",
      costPerUnitCents: 9,
      unit: "g"
    });
    vi.mocked(apiClient.createSupplier).mockResolvedValue({
      id: "supplier-1",
      restaurantId: "pilot-workspace",
      name: "Fresh Supplier",
      normalizedName: "fresh supplier",
      contactLabel: "Rep"
    });
  });

  it("renders the mobile-first onboarding wizard and stepper", async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={["/onboarding"]}>
        <OnboardingPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Set up the restaurant workspace")).toBeInTheDocument();
    });

    expect(screen.getByText("Setup steps")).toBeInTheDocument();
    expect(screen.getAllByText("Restaurant Profile").length).toBeGreaterThan(0);
    expect(screen.getByText("Readiness checklist")).toBeInTheDocument();
    expect(screen.getByText("Invoice upload remains draft-only. Ingredient costs change only after review-confirm.")).toBeInTheDocument();
  });

  it("renders ingredient setup cards and can add an ingredient", async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={["/onboarding?step=ingredients"]}>
        <OnboardingPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText("Ingredients").length).toBeGreaterThan(0);
    });

    fireEvent.change(screen.getByPlaceholderText("Tomatoes"), { target: { value: "Basil" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Cost cents" }), { target: { value: "9" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => {
      expect(apiClient.createIngredient).toHaveBeenCalledWith(
        { name: "Basil", costPerUnitCents: 9, unit: "g" },
        "pilot-workspace"
      );
    });
  });

  it("renders recipe, dish, supplier, and first invoice setup without table dependency", async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={["/onboarding?step=recipes"]}>
        <OnboardingPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Cost preview: €2.40")).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole("button", { name: /Dishes/u })[0]);
    expect(await screen.findByText("Dish")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /Suppliers/u })[0]);
    expect(await screen.findByText("Suppliers are used for invoice cost updates and price-change alerts.")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /Invoice/u })[0]);
    expect(await screen.findByText("Safe invoice workflow")).toBeInTheDocument();
    expect(screen.getByText("Open invoice intake")).toBeInTheDocument();
  });
});
