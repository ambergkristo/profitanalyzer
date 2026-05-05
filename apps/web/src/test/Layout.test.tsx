import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Layout } from "../components/Layout.js";
import type { DemoDatasetSummary } from "../types.js";

vi.mock("../api/client.js", () => ({
  apiClient: {
    getStoredAuthToken: vi.fn(() => null),
    authChangeEvent: "profit-analyzer-auth-change",
    getAppConfig: vi.fn(),
    getAuthMe: vi.fn(),
    clearStoredAuthToken: vi.fn(),
    setAuthContext: vi.fn(),
    logout: vi.fn(),
    getDemoDatasets: vi.fn()
  }
}));

import { apiClient } from "../api/client.js";

function LocationEcho() {
  const location = useLocation();
  return <div>{location.search}</div>;
}

const demoConfig = {
  appMode: "demo" as const,
  nodeEnv: "test" as const,
  version: "0.1.0",
  productionReadinessClaimed: false as const,
  storage: {
    driver: "memory" as const,
    dataDirConfigured: false,
    readable: true,
    writable: true,
    persistenceWarning: "Memory storage resets data on restart."
  },
  workspaceContext: {
    workspaceId: "workspace-mixed-restaurant",
    restaurantId: "mixed-restaurant"
  },
  auth: {
    mode: "dev" as const,
    required: false
  },
  runtime: {
    logLevel: "warn" as const,
    appBaseUrlConfigured: true,
    apiBaseUrlConfigured: true,
    corsOriginConfigured: true
  },
  features: {
    invoiceIntake: true,
    ocrFixture: true,
    externalOcrConfigured: false,
    databaseConfigured: false
  }
};

const datasets: DemoDatasetSummary[] = [
  {
    id: "mixed-restaurant",
    name: "Mixed Casual Restaurant",
    description: "Balanced casual dining scenario.",
    profile: "mixed",
    ownerDiagnosis: "Mixed performance.",
    expectedBehavior: "Balanced action stack.",
    demoNarrative: "Show the full decision loop.",
    validationStatus: "pass" as const
  },
  {
    id: "low-margin-kitchen",
    name: "Low Margin Kitchen",
    description: "Volume-heavy kitchen under pricing pressure.",
    profile: "low-margin",
    ownerDiagnosis: "Margin pressure detected.",
    expectedBehavior: "Critical repairs should dominate.",
    demoNarrative: "Use this scenario first in a demo.",
    validationStatus: "pass" as const
  }
];

describe("Layout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    document.documentElement.dataset.theme = "dark";
    vi.mocked(apiClient.getAppConfig).mockResolvedValue(demoConfig);
    vi.mocked(apiClient.getDemoDatasets).mockResolvedValue(datasets);
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

  it("renders the production app shell, restrained demo selector, and toggles", async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={["/"]}>
        <Routes>
          <Route element={<Layout />} path="/">
            <Route element={<LocationEcho />} index />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByLabelText("Primary navigation")).toBeInTheDocument();
    expect(await screen.findByText("Overview")).toBeInTheDocument();
    expect(await screen.findByText("Menu")).toBeInTheDocument();
    expect(await screen.findByText("Invoices")).toBeInTheDocument();
    expect(await screen.findByText("Settings")).toBeInTheDocument();
    expect(await screen.findByText("Demo restaurant")).toBeInTheDocument();
    expect(screen.queryByText(/Synthetic validation/i)).not.toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue("Mixed Casual Restaurant"), {
      target: { value: "low-margin-kitchen" }
    });
    expect(await screen.findByText("?dataset=low-margin-kitchen")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "ET" }));
    expect(await screen.findByText("Ülevaade")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Toggle theme" }));
    expect(window.localStorage.getItem("profit-analyzer-theme")).toBe("light");
  });

  it("shows a login-required gate in pilot mode when no auth token exists", async () => {
    vi.mocked(apiClient.getAppConfig).mockResolvedValue({
      ...demoConfig,
      appMode: "pilot",
      storage: { ...demoConfig.storage, driver: "file", persistenceWarning: null },
      auth: { mode: "dev", required: true }
    });

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={["/invoices"]}>
        <Routes>
          <Route element={<Layout />} path="/">
            <Route element={<div>Protected content</div>} path="invoices" />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("Login required")).toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("renders the signed-in workspace indicator in pilot mode", async () => {
    vi.mocked(apiClient.getStoredAuthToken).mockReturnValue("dev-session-token");
    vi.mocked(apiClient.getAppConfig).mockResolvedValue({
      ...demoConfig,
      appMode: "pilot",
      storage: { ...demoConfig.storage, driver: "file", persistenceWarning: null },
      auth: { mode: "dev", required: true }
    });

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={["/"]}>
        <Routes>
          <Route element={<Layout />} path="/">
            <Route element={<LocationEcho />} index />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("Owner")).toBeInTheDocument();
    expect(await screen.findByText("Pilot Workspace")).toBeInTheDocument();
  });
});
