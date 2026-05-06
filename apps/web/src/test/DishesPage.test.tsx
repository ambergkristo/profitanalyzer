import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DishesPage } from "../pages/Dishes.js";

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

describe("DishesPage", () => {
  beforeEach(() => {
    vi.mocked(apiClient.getDemoDatasets).mockResolvedValue([
      {
        id: "mixed-restaurant",
        name: "Mixed Casual Restaurant",
        description: "Balanced casual dining scenario.",
        profile: "mixed",
        ownerDiagnosis: "Mixed performance. Fix leaks while protecting top contributors.",
        expectedBehavior: "Balanced action stack.",
        demoNarrative: "Show the full decision loop.",
        validationStatus: "pass"
      }
    ]);

    vi.mocked(apiClient.getOverview).mockResolvedValue({
      totalDishes: 2,
      profitableCount: 1,
      warningCount: 1,
      lossCount: 0,
      averageMarginPercent: 48,
      estimatedPeriodProfitCents: 150000,
      totalRevenueCents: 450000,
      totalCostCents: 234000,
      weightedAverageMarginPercent: 48,
      supplierAlertCount: 0,
      highSeveritySupplierAlertCount: 0,
      latestSupplierAlerts: [],
      topActions: [],
      topProfitContributors: [],
      riskiestDishes: [],
      dataQualityWarnings: []
    });

    vi.mocked(apiClient.getDishes).mockResolvedValue([
      {
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
      {
        dishId: "dish-caesar",
        name: "Caesar Salad",
        priceCents: 1450,
        costCents: 775,
        marginPercent: 46.55,
        grossProfitPerSaleCents: 675,
        estimatedPeriodProfitCents: 114750,
        salesVolume: 170,
        status: "warning",
        costRatioPercent: 53.45,
        contributionRank: 2,
        warnings: []
      }
    ]);

    vi.mocked(apiClient.getActions).mockResolvedValue([
      {
        id: "1",
        type: "bestseller_protection",
        title: "Protect Beef Burger before volume hides the margin leak",
        message: "Beef Burger sells often but margin is thin.",
        dishId: "dish-burger",
        severity: "high",
        estimatedImpactCents: 40600,
        confidence: "high",
        reasonCodes: ["HIGH_SALES_LOW_MARGIN"],
        currentMarginPercent: 35.56,
        recommendedPriceCents: 1490,
        targetMarginPercent: 50,
        createdFromRule: "high-sales-low-margin-bestseller"
      }
    ]);
  });

  it("renders the menu workspace and keeps sorting available after dataset selection", async () => {
    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        initialEntries={["/dishes?dataset=mixed-restaurant"]}
      >
        <DishesPage />
      </MemoryRouter>
    );

    expect(await screen.findByText("Menu workspace")).toBeInTheDocument();
    expect(await screen.findByText("Menu decisions")).toBeInTheDocument();
    expect(await screen.findByText("Risk priority")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Sort dishes"), {
      target: { value: "salesVolume" }
    });

    expect(await screen.findByText("2 visible dishes")).toBeInTheDocument();
    expect(screen.getByText("Selected dish")).toBeInTheDocument();
    expect(vi.mocked(apiClient.getDishes)).toHaveBeenCalledWith("mixed-restaurant");
    expect(vi.mocked(apiClient.getActions)).toHaveBeenCalledWith("mixed-restaurant");
  });
});
