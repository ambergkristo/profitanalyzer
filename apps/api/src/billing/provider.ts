import type { BillingProviderStatus } from "../../../../packages/core/src/index.js";

export type BillingProviderEnvironment = Partial<
  Pick<NodeJS.ProcessEnv, "BILLING_PROVIDER" | "BILLING_PROVIDER_SECRET_KEY" | "BILLING_WEBHOOK_SECRET">
>;

export interface BillingProviderAdapter {
  getProviderStatus(): BillingProviderStatus;
}

function configuredProvider(environment: BillingProviderEnvironment = process.env) {
  const provider = environment.BILLING_PROVIDER?.trim() || "none";
  return provider === "manual" || provider === "stripe_future" ? provider : "none";
}

export function createBillingProvider(environment: BillingProviderEnvironment = process.env): BillingProviderAdapter {
  const provider = configuredProvider(environment);

  if (provider === "manual") {
    return {
      getProviderStatus() {
        return {
          id: "manual",
          displayName: "Manual billing",
          isConfigured: true,
          mode: "manual",
          supportsCheckout: false,
          message: "Manual billing is enabled. No card collection or checkout is active."
        };
      }
    };
  }

  if (provider === "stripe_future") {
    const configured = Boolean(environment.BILLING_PROVIDER_SECRET_KEY?.trim());
    return {
      getProviderStatus() {
        return {
          id: "stripe_future",
          displayName: "Stripe future provider",
          isConfigured: configured,
          mode: "external_future",
          supportsCheckout: false,
          message: configured
            ? "Stripe credentials are present, but live checkout is intentionally not implemented yet."
            : "Stripe future provider is disabled until server-side billing env is configured."
        };
      }
    };
  }

  return {
    getProviderStatus() {
      return {
        id: "none",
        displayName: "No payment provider",
        isConfigured: true,
        mode: "none",
        supportsCheckout: false,
        message: "Billing is tracked manually; no payment provider is connected."
      };
    }
  };
}
