import type {
  BillingProviderStatus,
  BillingStatus,
  LicenseEntitlement,
  Plan,
  PlanCode,
  UsageCounter,
  WorkspaceSubscription
} from "./types.js";

const deterministicBillingCreatedAt = "2026-05-05T00:00:00.000Z";

export const defaultPlans: Plan[] = [
  {
    id: "plan-starter",
    code: "starter",
    name: "Starter",
    monthlyPriceCents: 4900,
    currency: "EUR",
    includedRestaurants: 1,
    includedUsers: 3,
    includedInvoicesPerMonth: 50,
    features: ["Dish margin dashboard", "Invoice review-confirm", "Supplier price alerts"],
    isPublic: true,
    createdAt: deterministicBillingCreatedAt,
    updatedAt: deterministicBillingCreatedAt
  },
  {
    id: "plan-pro",
    code: "pro",
    name: "Pro",
    monthlyPriceCents: 9900,
    currency: "EUR",
    includedRestaurants: 1,
    includedUsers: 8,
    includedInvoicesPerMonth: 200,
    features: ["Everything in Starter", "OCR draft workflow", "Advanced action prioritization"],
    isPublic: true,
    createdAt: deterministicBillingCreatedAt,
    updatedAt: deterministicBillingCreatedAt
  },
  {
    id: "plan-multi-location",
    code: "multi_location",
    name: "Multi-location",
    monthlyPriceCents: 24900,
    currency: "EUR",
    includedRestaurants: 5,
    includedUsers: 20,
    includedInvoicesPerMonth: 1000,
    features: ["Multiple restaurants", "Workspace-level reporting", "Priority setup support"],
    isPublic: true,
    createdAt: deterministicBillingCreatedAt,
    updatedAt: deterministicBillingCreatedAt
  },
  {
    id: "plan-founding-partner",
    code: "founding_partner",
    name: "Founding partner",
    monthlyPriceCents: 0,
    currency: "EUR",
    includedRestaurants: 1,
    includedUsers: 10,
    features: ["Lifetime access entitlement", "Founder-led setup", "Case-study eligible support"],
    isPublic: false,
    createdAt: deterministicBillingCreatedAt,
    updatedAt: deterministicBillingCreatedAt
  },
  {
    id: "plan-internal-demo",
    code: "internal_demo",
    name: "Internal demo",
    monthlyPriceCents: 0,
    currency: "EUR",
    includedRestaurants: 3,
    includedUsers: 10,
    features: ["Demo scenarios", "Fixture OCR", "Internal validation"],
    isPublic: false,
    createdAt: deterministicBillingCreatedAt,
    updatedAt: deterministicBillingCreatedAt
  }
];

export function getDefaultPlans() {
  return defaultPlans.map((plan) => ({ ...plan, features: [...plan.features] }));
}

export function getPlanByCode(code: PlanCode, plans: Plan[] = defaultPlans) {
  return plans.find((plan) => plan.code === code) ?? plans[0];
}

export function createDefaultSubscription(workspaceId: string, planCode: PlanCode = "internal_demo"): WorkspaceSubscription {
  return {
    id: `subscription-${workspaceId}`,
    workspaceId,
    planCode,
    status: planCode === "internal_demo" ? "internal" : "trialing",
    billingProvider: "none",
    trialEndsAt: planCode === "internal_demo" ? undefined : "2026-06-05T00:00:00.000Z",
    createdAt: deterministicBillingCreatedAt,
    updatedAt: deterministicBillingCreatedAt
  };
}

export function createDefaultUsageCounter(workspaceId: string): UsageCounter {
  return {
    id: `usage-${workspaceId}-2026-05`,
    workspaceId,
    period: "2026-05",
    invoicesProcessed: 0,
    ocrUploads: 0,
    usersCount: 1,
    restaurantsCount: 1,
    createdAt: deterministicBillingCreatedAt,
    updatedAt: deterministicBillingCreatedAt
  };
}

export function createInternalDemoEntitlement(workspaceId: string): LicenseEntitlement {
  return {
    id: `entitlement-${workspaceId}-internal-demo`,
    workspaceId,
    type: "internal_demo",
    status: "active",
    startsAt: deterministicBillingCreatedAt,
    notes: "Internal demo access for product validation.",
    createdAt: deterministicBillingCreatedAt,
    updatedAt: deterministicBillingCreatedAt
  };
}

export function resolveEffectiveAccess(input: {
  subscription: WorkspaceSubscription;
  entitlements: LicenseEntitlement[];
}): BillingStatus["effectiveAccess"] {
  const activeEntitlement = input.entitlements.find((entitlement) => entitlement.status === "active");

  if (activeEntitlement?.type === "founding_partner_lifetime") {
    return {
      hasAccess: true,
      status: "lifetime",
      reason: "Founding partner lifetime entitlement is active."
    };
  }

  if (activeEntitlement?.type === "internal_demo") {
    return {
      hasAccess: true,
      status: "internal",
      reason: "Internal demo entitlement is active."
    };
  }

  if (activeEntitlement?.type === "manual_comp") {
    return {
      hasAccess: true,
      status: "active",
      reason: "Manual complimentary entitlement is active."
    };
  }

  if (input.subscription.status === "lifetime") {
    return {
      hasAccess: true,
      status: "lifetime",
      reason: input.subscription.lifetimeAccessReason ?? "Lifetime subscription status is active."
    };
  }

  if (input.subscription.status === "active") {
    return {
      hasAccess: true,
      status: "active",
      reason: "Subscription is active."
    };
  }

  if (input.subscription.status === "trialing") {
    return {
      hasAccess: true,
      status: "trialing",
      reason: "Trial is active."
    };
  }

  if (input.subscription.status === "internal") {
    return {
      hasAccess: true,
      status: "internal",
      reason: "Internal subscription status is active."
    };
  }

  return {
    hasAccess: false,
    status: "no_access",
    reason: "No active subscription, trial, or entitlement is available."
  };
}

export function buildBillingStatus(input: {
  workspaceId: string;
  plans?: Plan[];
  subscription: WorkspaceSubscription;
  entitlements: LicenseEntitlement[];
  usage: UsageCounter;
  billingProviderStatus: BillingProviderStatus;
}): BillingStatus {
  const plan = getPlanByCode(input.subscription.planCode, input.plans ?? defaultPlans);

  return {
    workspaceId: input.workspaceId,
    plan: { ...plan, features: [...plan.features] },
    subscription: { ...input.subscription },
    entitlements: input.entitlements.map((entitlement) => ({ ...entitlement })),
    usage: { ...input.usage },
    billingProviderStatus: { ...input.billingProviderStatus },
    effectiveAccess: resolveEffectiveAccess({
      subscription: input.subscription,
      entitlements: input.entitlements
    })
  };
}
