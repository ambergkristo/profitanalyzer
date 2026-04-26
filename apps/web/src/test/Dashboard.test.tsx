import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DashboardPage } from "../pages/Dashboard.js";

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

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.mocked(apiClient.getDemoDatasets).mockResolvedValue([
      {
        id: "low-margin-kitchen",
        name: "Low Margin Kitchen",
        description: "Volume-heavy kitchen under pricing pressure.",
        profile: "low-margin",
        ownerDiagnosis: "Margin pressure detected. Start with high-sales dishes below 50% margin.",
        expectedBehavior: "Critical repairs should dominate.",
        demoNarrative: "Use this scenario first in a demo.",
        validationStatus: "pass"
      }
    ]);

    vi.mocked(apiClient.getOverview).mockResolvedValue({
      totalDishes: 8,
      profitableCount: 1,
      warningCount: 3,
      lossCount: 4,
      averageMarginPercent: 22.3,
      estimatedPeriodProfitCents: 211165,
      totalRevenueCents: 1079100,
      totalCostCents: 867935,
      weightedAverageMarginPercent: 19.55,
      topActions: [
        {
          id: "1",
          type: "bestseller_protection",
          title: "Protect Beef Burger before volume hides the margin leak",
          message: "Beef Burger sells often but margin is only 20.2%.",
          dishId: "dish-burger",
          severity: "high",
          estimatedImpactCents: 32000,
          confidence: "high",
          reasonCodes: ["HIGH_SALES_LOW_MARGIN", "PRICE_SIMULATION_UPSIDE"],
          recommendedPriceCents: 1290,
          currentMarginPercent: 20.2,
          targetMarginPercent: 50,
          createdFromRule: "high-sales-low-margin-bestseller"
        },
        {
          id: "2",
          type: "margin_repair",
          title: "Steak Frites is losing cash on every sale",
          message: "Steak Frites loses money every time it sells.",
          dishId: "dish-steak-frites",
          severity: "critical",
          estimatedImpactCents: 26100,
          confidence: "high",
          reasonCodes: ["LOSS_MARGIN", "NEGATIVE_PROFIT_PER_SALE"],
          recommendedPriceCents: 1790,
          currentMarginPercent: -5.03,
          targetMarginPercent: 50,
          createdFromRule: "negative-profit-per-sale"
        },
        {
          id: "3",
          type: "warning_review",
          title: "Panna Cotta needs a margin review",
          message: "Panna Cotta is still selling, but the margin is thin.",
          dishId: "dish-panna-cotta",
          severity: "medium",
          estimatedImpactCents: 9000,
          confidence: "medium",
          reasonCodes: ["LOW_MARGIN", "PRICE_SIMULATION_UPSIDE"],
          currentMarginPercent: 32.1,
          recommendedPriceCents: 890,
          targetMarginPercent: 50,
          createdFromRule: "margin-between-30-and-50"
        }
      ],
      topProfitContributors: [
        {
          dishId: "dish-burger",
          name: "Beef Burger",
          priceCents: 1090,
          costCents: 870,
          marginPercent: 20.18,
          grossProfitPerSaleCents: 220,
          estimatedPeriodProfitCents: 79200,
          salesVolume: 360,
          status: "loss",
          costRatioPercent: 79.82,
          contributionRank: 1,
          warnings: []
        }
      ],
      riskiestDishes: [
        {
          dishId: "dish-steak-frites",
          name: "Steak Frites",
          priceCents: 1490,
          costCents: 1670,
          marginPercent: -12.08,
          grossProfitPerSaleCents: -180,
          estimatedPeriodProfitCents: -21600,
          salesVolume: 120,
          status: "loss",
          costRatioPercent: 112.08,
          contributionRank: 8,
          warnings: []
        }
      ],
      dataQualityWarnings: []
    });

    vi.mocked(apiClient.getDishes).mockResolvedValue([
      {
        dishId: "dish-burger",
        name: "Beef Burger",
        priceCents: 1090,
        costCents: 870,
        marginPercent: 20.18,
        grossProfitPerSaleCents: 220,
        estimatedPeriodProfitCents: 79200,
        salesVolume: 360,
        status: "loss",
        costRatioPercent: 79.82,
        contributionRank: 1,
        warnings: []
      }
    ]);
  });

  it("renders scenario-aware diagnostics and loads data with dataset id", async () => {
    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        initialEntries={["/?dataset=low-margin-kitchen"]}
      >
        <DashboardPage />
      </MemoryRouter>
    );

    expect(await screen.findByText("Margin pressure detected. Start with high-sales dishes below 50% margin.")).toBeInTheDocument();
    expect(await screen.findByText("Use this scenario first in a demo.")).toBeInTheDocument();
    expect(await screen.findByText("Weighted Margin")).toBeInTheDocument();
    expect(await screen.findByText("What to fix first")).toBeInTheDocument();
    expect(vi.mocked(apiClient.getOverview)).toHaveBeenCalledWith("low-margin-kitchen");
    expect(vi.mocked(apiClient.getDishes)).toHaveBeenCalledWith("low-margin-kitchen");
  });

  it("renders a clear invalid-scenario state when the dataset query is unknown", async () => {
    vi.mocked(apiClient.getOverview).mockRejectedValueOnce(
      new Error("Request failed for /api/analytics/overview?dataset=ghost with 404")
    );
    vi.mocked(apiClient.getDishes).mockRejectedValueOnce(
      new Error("Request failed for /api/analytics/dishes?dataset=ghost with 404")
    );

    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        initialEntries={["/?dataset=ghost"]}
      >
        <DashboardPage />
      </MemoryRouter>
    );

    expect(await screen.findByText("Scenario unavailable")).toBeInTheDocument();
  });
});
