import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DishDetailPage } from "../pages/DishDetail.js";

vi.mock("../api/client.js", () => ({
  apiClient: {
    getOverview: vi.fn(),
    getDishes: vi.fn(),
    getActions: vi.fn(),
    getDishDetail: vi.fn(),
    simulatePrice: vi.fn()
  }
}));

import { apiClient } from "../api/client.js";

describe("DishDetailPage", () => {
  beforeEach(() => {
    vi.mocked(apiClient.getDishDetail).mockResolvedValue({
      dish: {
        id: "dish-burger",
        name: "Beef Burger",
        recipeId: "recipe-burger",
        priceCents: 1390,
        salesVolume: 320
      },
      recipe: {
        id: "recipe-burger",
        name: "Beef Burger",
        yield: 1,
        ingredients: []
      },
      metrics: {
        dishId: "dish-burger",
        name: "Beef Burger",
        priceCents: 1390,
        costCents: 870,
        marginPercent: 37.41,
        grossProfitPerSaleCents: 520,
        estimatedPeriodProfitCents: 166400,
        salesVolume: 320,
        status: "warning",
        costRatioPercent: 62.59,
        contributionRank: 1,
        warnings: []
      },
      ingredientBreakdown: [
        {
          ingredientId: "beef-patty",
          ingredientName: "Beef Patty",
          quantity: 180,
          unit: "g",
          unitCostCents: 3,
          lineCostCents: 540,
          percentOfDishCost: 62.07,
          isMissing: false
        }
      ],
      explanation: {
        headline: "Beef Burger is profitable but exposed",
        summary: "The dish still contributes profit, yet margin is thin.",
        highlights: ["Margin is 37.4%.", "Estimated current-period profit is EUR 1664.00."],
        reasonCodes: ["LOW_MARGIN", "STRONG_PROFIT_CONTRIBUTOR"]
      },
      recommendedActionsForDish: [
        {
          id: "1",
          type: "bestseller_protection",
          title: "Protect Beef Burger before volume hides the margin leak",
          message: "Beef Burger sells often but margin is only 37.4%.",
          dishId: "dish-burger",
          severity: "high",
          estimatedImpactCents: 32000,
          confidence: "high",
          reasonCodes: ["HIGH_SALES_LOW_MARGIN", "PRICE_SIMULATION_UPSIDE"],
          recommendedPriceCents: 1490,
          currentMarginPercent: 37.41,
          targetMarginPercent: 50,
          createdFromRule: "high-sales-low-margin-bestseller"
        }
      ],
      simulationHints: {
        currentPriceCents: 1390,
        quickAdjustmentsCents: [50, 100, 200],
        recommendedPriceCents: 1490,
        recommendedTargetMarginPercent: 50,
        note: "Start by testing the suggested price."
      }
    });
  });

  it("renders the simulator panel and recommended actions", async () => {
    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        initialEntries={["/dishes/dish-burger"]}
      >
        <Routes>
          <Route element={<DishDetailPage />} path="/dishes/:dishId" />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("Price simulator")).toBeInTheDocument();
    expect(await screen.findByText("Run simulation")).toBeInTheDocument();
    expect(await screen.findByText("Protect Beef Burger before volume hides the margin leak")).toBeInTheDocument();
  });
});
