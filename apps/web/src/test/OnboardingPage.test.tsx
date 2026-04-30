import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OnboardingPage } from "../pages/Onboarding.js";

vi.mock("../api/client.js", () => ({
  apiClient: {
    getAppConfig: vi.fn(),
    getDemoDatasets: vi.fn()
  }
}));

import { apiClient } from "../api/client.js";

describe("OnboardingPage", () => {
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
        persistenceWarning: "File storage is active for this pilot workspace."
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
    vi.mocked(apiClient.getDemoDatasets).mockResolvedValue([
      {
        id: "pilot-workspace",
        name: "Pilot Workspace",
        description: "Controlled pilot dataset.",
        profile: "mixed",
        ownerDiagnosis: "Pilot workspace is ready for cost confirmation and first-pass menu review.",
        expectedBehavior: "Pilot setup path.",
        demoNarrative: "Use this workspace before customer-specific import.",
        validationStatus: "pass"
      }
    ]);
  });

  it("renders the pilot onboarding flow", async () => {
    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        initialEntries={["/onboarding"]}
      >
        <OnboardingPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(vi.mocked(apiClient.getAppConfig)).toHaveBeenCalledTimes(1);
      expect(vi.mocked(apiClient.getDemoDatasets)).toHaveBeenCalledTimes(1);
    });

    expect(screen.queryByText("Onboarding unavailable")).not.toBeInTheDocument();
  });
});
