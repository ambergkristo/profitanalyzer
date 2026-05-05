import { useCallback } from "react";

import { apiClient } from "../api/client.js";
import { Panel } from "../components/Panel.js";
import { StatePanel } from "../components/StatePanel.js";
import { useAsyncData } from "../hooks.js";

export function SettingsPage() {
  const loadSettings = useCallback(async () => {
    const [config, readiness, providers] = await Promise.all([
      apiClient.getAppConfig(),
      apiClient.getReadiness(),
      apiClient.getOcrProviders()
    ]);

    return { config, readiness, providers };
  }, []);
  const settings = useAsyncData(loadSettings);

  if (settings.loading) {
    return <StatePanel title="Loading settings" message="Reading runtime diagnostics." tone="loading" />;
  }

  if (settings.error || !settings.data) {
    return <StatePanel title="Settings unavailable" message="Runtime diagnostics could not be loaded." tone="error" />;
  }

  const { config, readiness, providers } = settings.data;

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
      <Panel className="rounded-[2rem]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Settings</p>
        <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-text">Workspace diagnostics</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
          Technical runtime details live here instead of the primary work views.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <SettingTile label="App mode" value={config.appMode} />
          <SettingTile label="Storage driver" value={config.storage.driver} />
          <SettingTile label="Auth mode" value={config.auth.mode} />
          <SettingTile label="Production ready" value={readiness.productionReady ? "yes" : "no"} />
          <SettingTile label="Upload storage" value={readiness.uploadStorage.driver} />
          <SettingTile label="OCR provider" value={readiness.ocr.provider} />
        </div>
      </Panel>

      <Panel className="rounded-[2rem]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Diagnostics</p>
        <div className="mt-5 space-y-3">
          {readiness.checks.slice(0, 8).map((check) => (
            <div key={check.name} className="rounded-2xl border border-border bg-white/[0.03] p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-text">{check.name.replace(/_/gu, " ")}</p>
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{check.status}</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted">{check.message}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="rounded-[2rem] xl:col-span-2">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">OCR provider registry</p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {providers.map((provider) => (
            <div key={provider.id} className="rounded-2xl border border-border bg-white/[0.03] p-4">
              <p className="font-semibold text-text">{provider.displayName}</p>
              <p className="mt-2 text-sm text-muted">{provider.isConfigured ? "Configured" : "Not configured"}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function SettingTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-white/[0.03] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-2 text-lg font-semibold text-text">{value}</p>
    </div>
  );
}
