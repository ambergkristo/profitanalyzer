import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DishDetailPage } from "../pages/DishDetail.js";

vi.mock("../api/client.js", () => ({
  apiClient: {
    getDemoDatasets: vi.fn(),
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
        priceCents: 1350,
        salesVolume: 290
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
        priceCents: 1350,
        costCents: 870,
        marginPercent: 35.56,
        grossProfitPerSaleCents: 480,
        estimatedPeriodProfitCents: 139200,
        salesVolume: 290,
        status: "warning",
        costRatioPercent: 64.44,
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
      costDriverInsight: {
        ingredientId: "beef-patty",
        ingredientName: "Beef Patty",
        lineCostCents: 540,
        percentOfDishCost: 62.07,
        isDominant: true,
        message: "Beef Patty is driving 62.1% of the dish cost."
      },
      explanation: {
        headline: "Beef Burger is profitable but exposed",
        summary: "The dish still contributes profit, yet margin is thin.",
        highlights: ["Margin is 35.6%.", "Estimated current-period profit is €1392.00."],
        reasonCodes: ["LOW_MARGIN", "STRONG_PROFIT_CONTRIBUTOR"]
      },
      recommendedActionsForDish: [
        {
          id: "1",
          type: "bestseller_protection",
          title: "Protect Beef Burger before volume hides the margin leak",
          message: "Beef Burger sells often but margin is only 35.6%.",
          dishId: "dish-burger",
          severity: "high",
          estimatedImpactCents: 40600,
          confidence: "high",
          reasonCodes: ["HIGH_SALES_LOW_MARGIN", "PRICE_SIMULATION_UPSIDE"],
          recommendedPriceCents: 1490,
          currentMarginPercent: 35.56,
          targetMarginPercent: 50,
          createdFromRule: "high-sales-low-margin-bestseller"
        }
      ],
      simulationHints: {
        currentPriceCents: 1350,
        quickAdjustmentsCents: [50, 100, 200],
        targetMarginActions: [
          {
            label: "Reach 50% margin",
            targetMarginPercent: 50,
            priceCents: 1790,
            isAggressive: true
          }
        ],
        recommendedPriceCents: 1490,
        recommendedTargetMarginPercent: 50,
        note: "Use the suggested price as a decision test."
      }
    });
  });

  it("renders the simulator panel and target-margin controls", async () => {
    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        initialEntries={["/dishes/dish-burger?dataset=mixed-restaurant"]}
      >
        <Routes>
          <Route element={<DishDetailPage />} path="/dishes/:dishId" />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("Price simulator")).toBeInTheDocument();
    expect(await screen.findByText("Reach 50% margin")).toBeInTheDocument();
    expect(await screen.findByText("Practical next move")).toBeInTheDocument();
  });
});
