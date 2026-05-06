import { useCallback, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { apiClient } from "../api/client.js";
import { useAsyncData } from "../hooks.js";
import type { BillingStatus } from "../types.js";
import { Panel } from "../components/Panel.js";
import { CompactMetric, ContextPanel, WorkspaceGrid, WorkspaceHeader, WorkspacePage } from "../components/Workspace.js";

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency
  }).format(cents / 100);
}

function getAccessLabel(status: BillingStatus) {
  if (!status.effectiveAccess.hasAccess) {
    return "No active access";
  }

  if (status.effectiveAccess.status === "lifetime") {
    return "Founding partner lifetime access";
  }

  if (status.effectiveAccess.status === "trialing") {
    return "Trial access";
  }

  if (status.effectiveAccess.status === "internal") {
    return "Internal demo access";
  }

  return "Active subscription access";
}

function getAccessMessage(status: BillingStatus) {
  if (status.effectiveAccess.status === "lifetime") {
    return "Lifetime access is active through an explicit workspace entitlement.";
  }

  if (status.effectiveAccess.status === "trialing") {
    return "Trial access is active for this workspace.";
  }

  if (status.effectiveAccess.status === "internal") {
    return "Internal demo access is active. This is not a paid subscription.";
  }

  if (status.effectiveAccess.status === "active") {
    return "Subscription access is active for this workspace.";
  }

  return "No active subscription, trial, or entitlement is attached to this workspace.";
}

export function BillingPage() {
  const [searchParams] = useSearchParams();
  const datasetId = searchParams.get("dataset") ?? undefined;
  const [statusOverride, setStatusOverride] = useState<BillingStatus | null>(null);
  const [actionState, setActionState] = useState<{ loading: boolean; message: string | null; error: string | null }>({
    loading: false,
    message: null,
    error: null
  });

  const loadPlans = useCallback(() => apiClient.getBillingPlans(), []);
  const loadStatus = useCallback(() => apiClient.getBillingStatus(datasetId), [datasetId]);
  const plans = useAsyncData(loadPlans);
  const billing = useAsyncData(loadStatus);
  const status = statusOverride ?? billing.data;
  const foundingPartnerActive = status?.entitlements.some(
    (entitlement) => entitlement.type === "founding_partner_lifetime" && entitlement.status === "active"
  );

  async function runBillingAction(action: "trial" | "founding_partner") {
    setActionState({ loading: true, message: null, error: null });

    try {
      const nextStatus =
        action === "trial"
          ? await apiClient.startBillingTrial(datasetId)
          : await apiClient.grantManualLicense(
              {
                type: "founding_partner_lifetime",
                notes: "Controlled founding partner license grant."
              },
              datasetId
            );
      setStatusOverride(nextStatus);
      setActionState({
        loading: false,
        message:
          action === "trial"
            ? "Trial access is active for this workspace."
            : "Founding partner lifetime access is active for this workspace.",
        error: null
      });
    } catch (error) {
      setActionState({
        loading: false,
        message: null,
        error: error instanceof Error ? error.message : "Billing action failed."
      });
    }
  }

  return (
    <WorkspacePage>
      <WorkspaceHeader
        description="Operational license, plan, and usage status for the active workspace. No card collection or checkout runs here."
        eyebrow="Billing workspace"
        title="Workspace access"
      />

      {status ? (
        <div className="grid gap-3 md:grid-cols-4">
          <CompactMetric label="Plan" value={status.plan.name} />
          <CompactMetric label="Invoices" value={status.usage.invoicesProcessed} />
          <CompactMetric label="OCR uploads" value={status.usage.ocrUploads} />
          <CompactMetric label="Access" tone={status.effectiveAccess.hasAccess ? "success" : "warning"} value={status.effectiveAccess.status} />
        </div>
      ) : null}

      <WorkspaceGrid>
      <ContextPanel className="min-h-0">

        {billing.loading ? (
          <p className="mt-6 text-sm text-muted">Loading billing status...</p>
        ) : billing.error ? (
          <Panel className="mt-6 rounded-tile" tone="danger">
            <p className="text-sm text-text">{billing.error}</p>
          </Panel>
        ) : status ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Panel className="rounded-tile bg-black/20" tone={status.effectiveAccess.hasAccess ? "profit" : "warning"}>
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted">Effective access</p>
              <p className="mt-3 font-display text-3xl text-text">{getAccessLabel(status)}</p>
              <p className="mt-3 text-sm leading-6 text-muted">{getAccessMessage(status)}</p>
            </Panel>

            <Panel className="rounded-tile bg-black/20" tone="subtle">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted">Current plan</p>
              <p className="mt-3 font-display text-3xl text-text">{status.plan.name}</p>
              <p className="mt-3 text-sm leading-6 text-muted">
                {formatMoney(status.plan.monthlyPriceCents, status.plan.currency)} / month · {status.subscription.status}
              </p>
            </Panel>

            <Panel className="rounded-tile bg-black/20 md:col-span-2" tone="subtle">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted">Usage counters</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ["Invoices confirmed", status.usage.invoicesProcessed],
                  ["OCR uploads", status.usage.ocrUploads],
                  ["Users", status.usage.usersCount],
                  ["Restaurants", status.usage.restaurantsCount]
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted">{label}</p>
                    <p className="mt-2 font-display text-3xl text-text">{value}</p>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel className="rounded-tile bg-black/20 md:col-span-2" tone={foundingPartnerActive ? "profit" : "subtle"}>
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted">License entitlements</p>
              {status.entitlements.length > 0 ? (
                <div className="mt-4 grid gap-3">
                  {status.entitlements.map((entitlement) => (
                    <div key={entitlement.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <p className="font-medium text-text">{entitlement.type.replace(/_/gu, " ")}</p>
                      <p className="mt-1 text-sm text-muted">{entitlement.status}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted">No manual entitlements are attached to this workspace.</p>
              )}
            </Panel>
          </div>
        ) : null}
      </ContextPanel>

      <div className="grid gap-5">
        <Panel className="rounded-[2rem]" tone="subtle">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted">Provider state</p>
          <p className="mt-3 font-display text-3xl text-text">
            {status?.billingProviderStatus.displayName ?? "Billing provider"}
          </p>
          <p className="mt-3 text-sm leading-6 text-muted">
            {status?.billingProviderStatus.message ?? "Provider status is loading."}
          </p>
          <p className="mt-4 text-sm text-muted">
            Checkout is intentionally disabled until a payment provider is configured in a later phase.
          </p>
        </Panel>

        <Panel className="rounded-[2rem]" tone="warning">
          <p className="text-[11px] uppercase tracking-[0.2em] text-warning">Administrative setup</p>
          <p className="mt-3 text-sm leading-6 text-text">
            Manual license actions are for controlled setup only. They do not process payments or collect card data.
          </p>
          <div className="mt-4 flex flex-col gap-3">
            <button
              className="rounded-full border border-profit/30 bg-profit/10 px-4 py-3 text-sm font-medium text-profit transition hover:border-profit/60 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={actionState.loading}
              onClick={() => void runBillingAction("founding_partner")}
              type="button"
            >
              Grant founding partner lifetime access
            </button>
            <button
              className="rounded-full border border-white/10 px-4 py-3 text-sm font-medium text-text transition hover:border-accent/40 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={actionState.loading}
              onClick={() => void runBillingAction("trial")}
              type="button"
            >
              Start trial
            </button>
          </div>
          {actionState.message ? <p className="mt-4 text-sm text-profit">{actionState.message}</p> : null}
          {actionState.error ? <p className="mt-4 text-sm text-danger">{actionState.error}</p> : null}
        </Panel>

        <Panel className="rounded-[2rem]" tone="subtle">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted">Available plans</p>
          {plans.loading ? (
            <p className="mt-3 text-sm text-muted">Loading plans...</p>
          ) : plans.error ? (
            <p className="mt-3 text-sm text-danger">{plans.error}</p>
          ) : (
            <div className="mt-4 grid gap-3">
              {plans.data?.map((plan) => (
                <div key={plan.code} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="font-medium text-text">{plan.name}</p>
                  <p className="mt-1 text-sm text-muted">
                    {formatMoney(plan.monthlyPriceCents, plan.currency)} / month
                  </p>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
      </WorkspaceGrid>
    </WorkspacePage>
  );
}
