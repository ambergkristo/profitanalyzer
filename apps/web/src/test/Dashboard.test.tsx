import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DashboardPage } from "../pages/Dashboard.js";

vi.mock("../api/client.js", () => ({
  apiClient: {
    getOverview: vi.fn(),
    getDishes: vi.fn()
  }
}));

import { apiClient } from "../api/client.js";

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.mocked(apiClient.getOverview).mockResolvedValue({
      totalDishes: 6,
      profitableCount: 3,
      warningCount: 2,
      lossCount: 1,
      averageMarginPercent: 47.6,
      estimatedPeriodProfitCents: 512340,
      topActions: [
        {
          id: "1",
          type: "price_review",
          title: "Review Beef Burger pricing",
          message: "High sales and low margin.",
          dishId: "dish-burger",
          severity: "urgent",
          estimatedImpactCents: 30000,
          confidence: "high"
        },
        {
          id: "2",
          type: "warning_review",
          title: "Watch Caesar Salad",
          message: "Margin is in the warning band.",
          dishId: "dish-caesar",
          severity: "warning",
          estimatedImpactCents: 12000,
          confidence: "medium"
        },
        {
          id: "3",
          type: "promotion_opportunity",
          title: "Promote Duck a l'Orange",
          message: "High margin, lower sales.",
          dishId: "dish-duck",
          severity: "opportunity",
          estimatedImpactCents: 9000,
          confidence: "medium"
        }
      ]
    });

    vi.mocked(apiClient.getDishes).mockResolvedValue([
      {
        dishId: "dish-burger",
        name: "Beef Burger",
        priceCents: 1590,
        costCents: 740,
        marginPercent: 53.46,
        grossProfitPerSaleCents: 850,
        estimatedPeriodProfitCents: 221000,
        salesVolume: 260,
        status: "profitable",
        warnings: []
      }
    ]);
  });

  it("renders KPI cards from API data", async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <DashboardPage />
      </MemoryRouter>
    );

    expect(await screen.findByText("Estimated Period Profit")).toBeInTheDocument();
    expect(await screen.findByText("€5,123.40")).toBeInTheDocument();
    expect(await screen.findByText("What to fix first")).toBeInTheDocument();
  });
});
