import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LoginPage } from "../pages/Login.js";

vi.mock("../api/client.js", () => ({
  apiClient: {
    getAppConfig: vi.fn(),
    getStoredAuthToken: vi.fn(() => null),
    devLogin: vi.fn()
  }
}));

import { apiClient } from "../api/client.js";

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    vi.mocked(apiClient.devLogin).mockResolvedValue({
      token: "dev-session-token",
      me: {
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
      }
    });
  });

  it("renders the login form and submits dev login", async () => {
    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        initialEntries={["/login?next=%2Finvoices"]}
      >
        <Routes>
          <Route element={<LoginPage />} path="/login" />
          <Route element={<div>Invoices route</div>} path="/invoices" />
        </Routes>
      </MemoryRouter>
    );

    expect(
      await screen.findByRole("heading", { name: /Sign in to a workspace/i })
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "admin@example.com" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(vi.mocked(apiClient.devLogin)).toHaveBeenCalledWith({
        email: "admin@example.com"
      });
    });
  });
});
