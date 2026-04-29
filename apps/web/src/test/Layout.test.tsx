import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Layout } from "../components/Layout.js";

vi.mock("../api/client.js", () => ({
  apiClient: {
    getAppConfig: vi.fn(),
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
    vi.mocked(apiClient.getAppConfig).mockResolvedValue({
      appMode: "demo",
      version: "0.1.0",
      productionReadinessClaimed: false,
      storage: {
        driver: "memory",
        dataDirConfigured: false,
        readable: true,
        writable: true,
        persistenceWarning: "This demo build uses memory storage. Restarting the API resets data."
      },
      workspaceContext: {
        workspaceId: "workspace-mixed-restaurant",
        restaurantId: "mixed-restaurant"
      },
      features: {
        invoiceIntake: true,
        ocrFixture: true,
        externalOcrConfigured: false,
        databaseConfigured: false
      }
    });

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
      },
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
  });

  it("renders the scenario selector metadata and updates the dataset query param", async () => {
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
    expect((await screen.findAllByText("Show the full decision loop.")).length).toBeGreaterThan(0);
    expect(await screen.findByText("Demo mode")).toBeInTheDocument();
    expect(
      await screen.findByText("This demo build uses memory storage. Restarting the API resets data.")
    ).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue("Mixed Casual Restaurant"), {
      target: { value: "low-margin-kitchen" }
    });

    expect(await screen.findByText("?dataset=low-margin-kitchen")).toBeInTheDocument();
    expect((await screen.findAllByText("Use this scenario first in a demo.")).length).toBeGreaterThan(0);
  });
});
