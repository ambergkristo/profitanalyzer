import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DashboardPage } from "../pages/Dashboard.js";

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

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.mocked(apiClient.getOverview).mockResolvedValue({
      totalDishes: 8,
      profitableCount: 2,
      warningCount: 5,
      lossCount: 1,
      averageMarginPercent: 41.2,
      estimatedPeriodProfitCents: 611165,
      totalRevenueCents: 1079100,
      totalCostCents: 467935,
      weightedAverageMarginPercent: 56.64,
      topActions: [
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
          type: "promotion_opportunity",
          title: "Margherita Flatbread has margin headroom to promote",
          message: "High margin, lower sales.",
          dishId: "dish-flatbread",
          severity: "low",
          estimatedImpactCents: 9850,
          confidence: "medium",
          reasonCodes: ["HIGH_MARGIN_LOW_SALES"],
          currentMarginPercent: 66.11,
          createdFromRule: "high-margin-low-sales"
        }
      ],
      topProfitContributors: [
        {
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
        }
      ],
      riskiestDishes: [
        {
          dishId: "dish-steak-frites",
          name: "Steak Frites",
          priceCents: 1590,
          costCents: 1670,
          marginPercent: -5.03,
          grossProfitPerSaleCents: -80,
          estimatedPeriodProfitCents: -7200,
          salesVolume: 90,
          status: "loss",
          costRatioPercent: 105.03,
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
      }
    ]);
  });

  it("renders upgraded KPI cards and top action cards", async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <DashboardPage />
      </MemoryRouter>
    );

    expect(await screen.findByText("Estimated Period Profit")).toBeInTheDocument();
    expect(await screen.findByText("Weighted Margin")).toBeInTheDocument();
    expect(await screen.findByText("What to fix first")).toBeInTheDocument();
    expect(await screen.findByText("Protect Beef Burger before volume hides the margin leak")).toBeInTheDocument();
    expect(await screen.findByText("HIGH SALES LOW MARGIN")).toBeInTheDocument();
  });
});
