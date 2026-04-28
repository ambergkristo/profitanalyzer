import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PilotToolsPage } from "../pages/PilotTools.js";

vi.mock("../api/client.js", () => ({
  apiClient: {
    getAppConfig: vi.fn(),
    getDemoDatasets: vi.fn(),
    getDeepHealth: vi.fn(),
    exportDataset: vi.fn(),
    importDataset: vi.fn(),
    resetDataset: vi.fn()
  }
}));

import { apiClient } from "../api/client.js";

describe("PilotToolsPage", () => {
  beforeEach(() => {
    vi.mocked(apiClient.getAppConfig).mockResolvedValue({
      appMode: "pilot",
      version: "0.1.0",
      features: {
        invoiceIntake: true,
        ocrFixture: true,
        externalOcrConfigured: false,
        persistence: "memory"
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
      }
    ]);
    vi.mocked(apiClient.getDeepHealth).mockResolvedValue({
      ok: true,
      storage: "memory",
      appMode: "pilot",
      externalOcrConfigured: false,
      checks: [
        {
          key: "storage",
          status: "warn",
          message: "Memory storage is active. Restarting the API resets pilot data."
        }
      ]
    });
    vi.mocked(apiClient.exportDataset).mockResolvedValue({
      dataset: {
        id: "mixed-restaurant",
        name: "Mixed Casual Restaurant",
        description: "Balanced casual dining scenario.",
        profile: "mixed",
        ownerDiagnosis: "Mixed performance. Fix leaks while protecting top contributors.",
        expectedBehavior: "Balanced action stack.",
        demoNarrative: "Show the full decision loop.",
        validationStatus: "pass",
        data: {
          ingredients: [],
          recipes: [],
          dishes: []
        }
      },
      ingredients: [],
      recipes: [],
      dishes: [],
      suppliers: [],
      supplierProductMatches: [],
      costHistory: [],
      alerts: [],
      invoices: [],
      ocrJobs: []
    });
    vi.mocked(apiClient.resetDataset).mockResolvedValue({
      datasetId: "mixed-restaurant",
      clearedInvoices: 2,
      clearedCostHistory: 1,
      clearedAlerts: 3,
      clearedOcrJobs: 1,
      restoredDishCount: 8
    });
    vi.mocked(apiClient.importDataset).mockResolvedValue({
      datasetId: "pilot-workspace",
      ingredientCount: 2,
      recipeCount: 1,
      dishCount: 1,
      supplierCount: 1
    });
  });

  it("renders pilot tools and supports export, reset, and import controls", async () => {
    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        initialEntries={["/pilot-tools?dataset=mixed-restaurant"]}
      >
        <PilotToolsPage />
      </MemoryRouter>
    );

    expect(await screen.findByText("Reset, export, and validate the workspace")).toBeInTheDocument();
    expect(await screen.findByText("Memory storage is active. Restarting the API resets pilot data.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Export dataset" }));
    await waitFor(() => {
      expect(vi.mocked(apiClient.exportDataset)).toHaveBeenCalledWith("mixed-restaurant");
    });

    fireEvent.click(screen.getByRole("button", { name: "Reset current dataset" }));
    await waitFor(() => {
      expect(vi.mocked(apiClient.resetDataset)).toHaveBeenCalledWith("mixed-restaurant");
    });

    fireEvent.change(screen.getByLabelText("Dataset JSON"), {
      target: {
        value: JSON.stringify({
          dataset: {
            id: "pilot-workspace",
            name: "Pilot Workspace",
            description: "Pilot",
            profile: "mixed",
            ownerDiagnosis: "Pilot",
            expectedBehavior: "Pilot",
            demoNarrative: "Pilot",
            validationStatus: "pass",
            data: {
              ingredients: [],
              recipes: [],
              dishes: []
            }
          },
          ingredients: [],
          recipes: [],
          dishes: [],
          suppliers: [],
          supplierProductMatches: [],
          costHistory: [],
          alerts: [],
          invoices: [],
          ocrJobs: []
        })
      }
    });

    fireEvent.click(screen.getByRole("button", { name: "Import pilot dataset" }));
    await waitFor(() => {
      expect(vi.mocked(apiClient.importDataset)).toHaveBeenCalledTimes(1);
    });

    const [payload, targetDatasetId] = vi.mocked(apiClient.importDataset).mock.calls[0] ?? [];
    expect(targetDatasetId).toBe("pilot-workspace");
    expect((payload as { dataset: { id: string } }).dataset.id).toBe("pilot-workspace");
  });
});
