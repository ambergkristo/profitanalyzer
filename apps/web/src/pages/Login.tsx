import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { apiClient } from "../api/client.js";
import { Panel } from "../components/Panel.js";
import { StatePanel } from "../components/StatePanel.js";
import { useAsyncData } from "../hooks.js";

function getModeLabel(appMode: "demo" | "pilot" | "production") {
  if (appMode === "production") {
    return "Production mode";
  }

  return appMode === "demo" ? "Demo mode" : "Pilot mode";
}

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = searchParams.get("next") || "/";
  const loadConfig = useCallback(() => apiClient.getAppConfig(), []);
  const config = useAsyncData(loadConfig);
  const [email, setEmail] = useState("owner@example.com");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!config.data?.auth.required && config.data?.appMode === "demo" && apiClient.getStoredAuthToken()) {
      navigate(nextPath, { replace: true });
    }
  }, [config.data, navigate, nextPath]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await apiClient.devLogin({ email });
      navigate(nextPath, { replace: true });
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Login failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (config.loading) {
    return (
      <StatePanel
        title="Loading login"
        message="Checking app mode and auth configuration."
        tone="loading"
      />
    );
  }

  if (config.error || !config.data) {
    return (
      <StatePanel
        title="Login unavailable"
        message="Backend is not reachable. Start the API with npm run dev."
        tone="error"
      />
    );
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-6 text-text md:px-6 xl:px-8">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6">
        <Panel className="rounded-[2rem] border border-border bg-panel/90 p-6 shadow-telemetry backdrop-blur">
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr] xl:items-end">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-accent">Menu Profit Optimizer</p>
              <h1 className="mt-3 font-display text-4xl leading-none md:text-6xl">
                {config.data.auth.required ? "Sign in to a workspace" : "Demo mode stays open"}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">
                {config.data.auth.required
                  ? "Phase 13 adds workspace-scoped access control. Use the local dev login to load a restaurant context without weakening invoice review-confirm safety."
                  : "Auth is not required in demo mode. You can still use the local dev login to inspect workspace-scoped flows."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-text">
                  {getModeLabel(config.data.appMode)}
                </span>
                <span className="rounded-full border border-white/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-muted">
                  Auth {config.data.auth.mode}
                </span>
                <span className="rounded-full border border-white/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-muted">
                  Storage {config.data.storage.driver}
                </span>
              </div>
            </div>

            <Panel className="rounded-tile border-white/8 bg-black/20 p-5" tone="subtle">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Local dev access</p>
              <p className="mt-3 text-sm leading-6 text-text">
                Use email prefixes to test roles: <code>owner@</code>, <code>admin@</code>, or <code>member@</code>.
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">
                This is a development auth path, not production-complete authentication.
              </p>
            </Panel>
          </div>
        </Panel>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Panel className="p-6">
            <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
              <div>
                <label className="text-[11px] uppercase tracking-[0.18em] text-muted" htmlFor="email">
                  Email
                </label>
                <input
                  className="mt-2 w-full rounded-2xl border border-border bg-panel px-4 py-3 text-text outline-none transition focus:border-accent/40"
                  id="email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="owner@example.com"
                  type="email"
                  value={email}
                />
              </div>

              {error ? (
                <div className="rounded-2xl border border-danger/20 bg-danger/[0.08] px-4 py-3 text-sm text-danger">
                  {error}
                </div>
              ) : null}

              <button
                className="w-full rounded-full border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent transition hover:border-accent/60 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={submitting}
                type="submit"
              >
                {submitting ? "Signing in..." : "Sign in"}
              </button>
            </form>
          </Panel>

          <Panel className="p-6">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted">What stays protected</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-tile border border-border bg-white/[0.02] p-4">
                <p className="font-medium text-text">Workspace isolation</p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Restaurant data only loads from the active workspace and restaurant context.
                </p>
              </div>
              <div className="rounded-tile border border-border bg-white/[0.02] p-4">
                <p className="font-medium text-text">Invoice safety</p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  OCR and invoice uploads still create drafts only. Costs change only after review-confirm.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-text transition hover:border-accent/30 hover:text-accent"
                to="/"
              >
                Return to app shell
              </Link>
              {!config.data.auth.required ? (
                <Link
                  className="rounded-full border border-white/10 px-4 py-2 text-sm text-text transition hover:border-accent/30 hover:text-accent"
                  to={nextPath}
                >
                  Continue in demo mode
                </Link>
              ) : null}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
