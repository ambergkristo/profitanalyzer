import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { DishRow } from "../components/DishRow.js";
import { StatusTag } from "../components/StatusTag.js";
import { formatEuro } from "../utils/format.js";

describe("formatting utilities", () => {
  it("formats cents into euro strings", () => {
    expect(formatEuro(1250)).toBe("€12.50");
  });
});

describe("status rendering", () => {
  it("renders status tags", () => {
    render(<StatusTag status="warning" />);

    expect(screen.getByText("Warning")).toBeInTheDocument();
  });

  it("renders dish row metrics", () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <DishRow
          dish={{
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
          }}
        />
      </MemoryRouter>
    );

    expect(screen.getByText("Beef Burger")).toBeInTheDocument();
    expect(screen.getByText("Profitable")).toBeInTheDocument();
    expect(screen.getByText("€15.90")).toBeInTheDocument();
  });
});
