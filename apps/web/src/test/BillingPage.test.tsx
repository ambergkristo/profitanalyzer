import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BillingPage } from "../pages/Billing.js";
import type { BillingStatus, Plan } from "../types.js";

vi.mock("../api/client.js", () => ({
  apiClient: {
    getBillingPlans: vi.fn(),
    getBillingStatus: vi.fn(),
    startBillingTrial: vi.fn(),
    grantManualLicense: vi.fn()
  }
}));

import { apiClient } from "../api/client.js";

const plans: Plan[] = [
  {
    id: "plan-starter",
    code: "starter",
    name: "Starter",
    monthlyPriceCents: 9900,
    currency: "EUR",
    includedRestaurants: 1,
    includedUsers: 3,
    features: ["Dashboard"],
    isPublic: true,
    createdAt: "2026-05-05T00:00:00.000Z",
    updatedAt: "2026-05-05T00:00:00.000Z"
  },
  {
    id: "plan-founding-partner",
    code: "founding_partner",
    name: "Founding Partner",
    monthlyPriceCents: 0,
    currency: "EUR",
    includedRestaurants: 1,
    includedUsers: 5,
    features: ["Lifetime access"],
    isPublic: false,
    createdAt: "2026-05-05T00:00:00.000Z",
    updatedAt: "2026-05-05T00:00:00.000Z"
  }
];

const billingStatus: BillingStatus = {
  workspaceId: "workspace-mixed-restaurant",
  plan: plans[0],
  subscription: {
    id: "subscription-workspace-mixed-restaurant",
    workspaceId: "workspace-mixed-restaurant",
    planCode: "starter",
    status: "active",
    billingProvider: "manual",
    createdAt: "2026-05-05T00:00:00.000Z",
    updatedAt: "2026-05-05T00:00:00.000Z"
  },
  entitlements: [],
  usage: {
    id: "usage-workspace-mixed-restaurant-2026-05",
    workspaceId: "workspace-mixed-restaurant",
    period: "2026-05",
    invoicesProcessed: 2,
    ocrUploads: 3,
    usersCount: 1,
    restaurantsCount: 1,
    createdAt: "2026-05-05T00:00:00.000Z",
    updatedAt: "2026-05-05T00:00:00.000Z"
  },
  billingProviderStatus: {
    id: "manual",
    displayName: "Manual Billing Provider",
    isConfigured: true,
    mode: "manual",
    supportsCheckout: false,
    message: "Manual billing is active."
  },
  effectiveAccess: {
    hasAccess: true,
    status: "active",
    reason: "active_subscription"
  }
};

describe("BillingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.getBillingPlans).mockResolvedValue(plans);
    vi.mocked(apiClient.getBillingStatus).mockResolvedValue(billingStatus);
    vi.mocked(apiClient.startBillingTrial).mockResolvedValue({
      ...billingStatus,
      subscription: {
        ...billingStatus.subscription,
        status: "trialing"
      },
      effectiveAccess: {
        hasAccess: true,
        status: "trialing",
        reason: "trial"
      }
    });
    vi.mocked(apiClient.grantManualLicense).mockResolvedValue({
      ...billingStatus,
      plan: plans[1],
      subscription: {
        ...billingStatus.subscription,
        planCode: "founding_partner",
        status: "lifetime"
      },
      entitlements: [
        {
          id: "entitlement-workspace-mixed-restaurant-founding",
          workspaceId: "workspace-mixed-restaurant",
          type: "founding_partner_lifetime",
          status: "active",
          startsAt: "2026-05-05T00:00:00.000Z",
          notes: "Validation grant.",
          createdAt: "2026-05-05T00:00:00.000Z",
          updatedAt: "2026-05-05T00:00:00.000Z"
        }
      ],
      effectiveAccess: {
        hasAccess: true,
        status: "lifetime",
        reason: "lifetime_entitlement"
      }
    });
  });

  it("renders billing status without payment form", async () => {
    render(
      <MemoryRouter initialEntries={["/billing?dataset=mixed-restaurant"]}>
        <BillingPage />
      </MemoryRouter>
    );

    expect(await screen.findByText("Workspace access")).toBeInTheDocument();
    expect(await screen.findByText("Active subscription access")).toBeInTheDocument();
    expect(screen.getByText("Invoices confirmed")).toBeInTheDocument();
    expect(screen.getByText("Checkout is intentionally disabled until a payment provider is configured in a later phase.")).toBeInTheDocument();
    expect(screen.queryByLabelText(/card/i)).not.toBeInTheDocument();
  });

  it("can show founding partner lifetime access after controlled grant", async () => {
    render(
      <MemoryRouter initialEntries={["/billing?dataset=mixed-restaurant"]}>
        <BillingPage />
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByText("Grant founding partner lifetime access"));

    await waitFor(() => {
      expect(apiClient.grantManualLicense).toHaveBeenCalledWith(
        {
          type: "founding_partner_lifetime",
          notes: "Controlled founding partner license grant."
        },
        "mixed-restaurant"
      );
    });
    expect(await screen.findByText("Founding partner lifetime access")).toBeInTheDocument();
  });
});
