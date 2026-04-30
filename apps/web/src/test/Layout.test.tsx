import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Layout } from "../components/Layout.js";

vi.mock("../api/client.js", () => ({
  apiClient: {
    getStoredAuthToken: vi.fn(() => null),
    authChangeEvent: "profit-analyzer-auth-change",
    getAppConfig: vi.fn(),
    getAuthMe: vi.fn(),
    clearStoredAuthToken: vi.fn(),
    setAuthContext: vi.fn(),
    logout: vi.fn(),
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
    vi.clearAllMocks();
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
      auth: {
        mode: "dev",
        required: false
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

    vi.mocked(apiClient.getAuthMe).mockResolvedValue({
      user: {
        id: "user-owner-example-com",
        email: "owner@example.com",
        name: "Owner",
        createdAt: "2026-04-30T09:00:00.000Z"
      },
      workspaces: [
        {
          workspaceId: "workspace-pilot-workspace",
          workspaceName: "Pilot Workspace",
          role: "owner",
          restaurants: [
            {
              restaurantId: "pilot-workspace",
              restaurantName: "Pilot Workspace"
            }
          ]
        }
      ],
      activeWorkspaceId: "workspace-pilot-workspace",
      activeRestaurantId: "pilot-workspace"
    });
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

  it("shows a login-required gate in pilot mode when no auth token exists", async () => {
    vi.mocked(apiClient.getAppConfig).mockResolvedValue({
      appMode: "pilot",
      version: "0.1.0",
      productionReadinessClaimed: false,
      storage: {
        driver: "file",
        dataDirConfigured: true,
        readable: true,
        writable: true,
        persistenceWarning: null
      },
      workspaceContext: {
        workspaceId: "workspace-pilot-workspace",
        restaurantId: "pilot-workspace"
      },
      auth: {
        mode: "dev",
        required: true
      },
      features: {
        invoiceIntake: true,
        ocrFixture: true,
        externalOcrConfigured: false,
        databaseConfigured: false
      }
    });

    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        initialEntries={["/invoices"]}
      >
        <Routes>
          <Route element={<Layout />} path="/">
            <Route element={<div>Protected content</div>} path="invoices" />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("Login required")).toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
    expect((await screen.findAllByRole("link", { name: "Open login" })).length).toBeGreaterThan(0);
  });

  it("renders the signed-in workspace indicator in pilot mode", async () => {
    vi.mocked(apiClient.getStoredAuthToken).mockReturnValue("dev-session-token");
    vi.mocked(apiClient.getAppConfig).mockResolvedValue({
      appMode: "pilot",
      version: "0.1.0",
      productionReadinessClaimed: false,
      storage: {
        driver: "file",
        dataDirConfigured: true,
        readable: true,
        writable: true,
        persistenceWarning: null
      },
      workspaceContext: {
        workspaceId: "workspace-pilot-workspace",
        restaurantId: "pilot-workspace"
      },
      auth: {
        mode: "dev",
        required: true
      },
      features: {
        invoiceIntake: true,
        ocrFixture: true,
        externalOcrConfigured: false,
        databaseConfigured: false
      }
    });

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

    expect(await screen.findByText("Signed in")).toBeInTheDocument();
    expect(await screen.findByText("owner@example.com")).toBeInTheDocument();
    expect(await screen.findByText("Pilot Workspace · owner")).toBeInTheDocument();
  });
});
