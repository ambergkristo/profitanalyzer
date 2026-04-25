import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { DishRow } from "../components/DishRow.js";
import { SeverityBadge } from "../components/SeverityBadge.js";
import { StatusTag } from "../components/StatusTag.js";
import { formatEuro } from "../utils/format.js";

describe("formatting utilities", () => {
  it("formats cents into euro strings", () => {
    expect(formatEuro(1250)).toContain("12.50");
  });
});

describe("status rendering", () => {
  it("renders status tags", () => {
    render(<StatusTag status="warning" />);

    expect(screen.getByText("Warning")).toBeInTheDocument();
  });

  it("renders severity badges", () => {
    render(<SeverityBadge severity="high" />);

    expect(screen.getByText("high")).toBeInTheDocument();
  });

  it("renders dish row metrics and action hint", () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <DishRow
          actionHint={{
            id: "action-1",
            type: "bestseller_protection",
            title: "Protect Beef Burger before volume hides the margin leak",
            message: "Beef Burger sells often but margin is thin.",
            dishId: "dish-burger",
            severity: "high",
            estimatedImpactCents: 32000,
            confidence: "high",
            reasonCodes: ["HIGH_SALES_LOW_MARGIN", "PRICE_SIMULATION_UPSIDE"],
            recommendedPriceCents: 1490,
            currentMarginPercent: 37.41,
            targetMarginPercent: 50,
            createdFromRule: "high-sales-low-margin-bestseller"
          }}
          dish={{
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
          }}
        />
      </MemoryRouter>
    );

    expect(screen.getByText("Beef Burger")).toBeInTheDocument();
    expect(screen.getAllByText("Warning")).toHaveLength(2);
    expect(screen.getByText("Protect Beef Burger before volume hides the margin leak")).toBeInTheDocument();
    expect(screen.getByText(/13\.90/)).toBeInTheDocument();
  });
});
