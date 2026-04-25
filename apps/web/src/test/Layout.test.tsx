import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Layout } from "../components/Layout.js";

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

function LocationEcho() {
  const location = useLocation();
  return <div>{location.search}</div>;
}

describe("Layout", () => {
  beforeEach(() => {
    vi.mocked(apiClient.getDemoDatasets).mockResolvedValue([
      {
        id: "mixed-restaurant",
        name: "Mixed Casual Restaurant",
        description: "Balanced casual dining scenario.",
        profile: "mixed"
      },
      {
        id: "low-margin-kitchen",
        name: "Low Margin Kitchen",
        description: "Volume-heavy kitchen under pricing pressure.",
        profile: "low-margin"
      }
    ]);
  });

  it("renders the scenario selector and updates the dataset query param", async () => {
    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        initialEntries={["/"]}
      >
        <Routes>
          <Route element={<Layout />} path="/">
            <Route element={<LocationEcho />} index />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("Dataset / Scenario")).toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue("Mixed Casual Restaurant"), {
      target: { value: "low-margin-kitchen" }
    });

    expect(await screen.findByText("?dataset=low-margin-kitchen")).toBeInTheDocument();
  });
});
