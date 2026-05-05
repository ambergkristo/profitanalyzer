import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useSearchParams } from "react-router-dom";

import { apiClient } from "../api/client.js";
import { readStoredLanguage, translations, type LanguageCode } from "../design/i18n.js";
import type { AuthMeResponse } from "../types.js";
import { useAsyncData } from "../hooks.js";
import { buildDatasetSearch, getScenarioMeta } from "../utils/scenario.js";
import { LanguageToggle } from "./LanguageToggle.js";
import { Panel } from "./Panel.js";
import { ScenarioSelector } from "./ScenarioSelector.js";
import { ThemeToggle } from "./ThemeToggle.js";

const primaryNav = [
  { key: "overview", path: "/" },
  { key: "menu", path: "/dishes" },
  { key: "recipes", path: "/recipes" },
  { key: "ingredients", path: "/ingredients" },
  { key: "invoices", path: "/invoices" },
  { key: "alerts", path: "/alerts" },
  { key: "onboarding", path: "/onboarding" },
  { key: "billing", path: "/billing" },
  { key: "settings", path: "/settings" }
] as const;

const navClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm font-semibold transition ${
    isActive
      ? "bg-accent text-bg shadow-telemetry"
      : "text-muted hover:bg-white/[0.04] hover:text-text"
  }`;

export function Layout() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const datasetId = searchParams.get("dataset") ?? undefined;
  const [language, setLanguage] = useState<LanguageCode>(() => readStoredLanguage());
  const t = translations[language];
  const loadDatasets = useCallback(() => apiClient.getDemoDatasets(), []);
  const loadConfig = useCallback(() => apiClient.getAppConfig(), []);
  const datasets = useAsyncData(loadDatasets);
  const config = useAsyncData(loadConfig);
  const [authToken, setAuthToken] = useState(() => apiClient.getStoredAuthToken());
  const [authState, setAuthState] = useState<{
    loading: boolean;
    me: AuthMeResponse | null;
    error: string | null;
  }>({ loading: false, me: null, error: null });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleAuthChange = () => setAuthToken(apiClient.getStoredAuthToken());
    window.addEventListener(apiClient.authChangeEvent, handleAuthChange);
    return () => window.removeEventListener(apiClient.authChangeEvent, handleAuthChange);
  }, []);

  useEffect(() => {
    if (!config.data?.auth.required || !authToken) {
      setAuthState({ loading: false, me: null, error: null });
      return;
    }

    let cancelled = false;
    setAuthState((current) => ({ ...current, loading: true, error: null }));
    apiClient
      .getAuthMe()
      .then((me) => {
        if (!cancelled) {
          setAuthState({ loading: false, me, error: null });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          apiClient.clearStoredAuthToken();
          setAuthState({
            loading: false,
            me: null,
            error: error instanceof Error ? error.message : "Authentication failed."
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authToken, config.data?.auth.required]);

  const appMode = config.data?.appMode ?? "demo";
  const authRequired = config.data?.auth.required ?? false;
  const authenticatedDatasetId = authState.me?.activeRestaurantId;

  useEffect(() => {
    if (authRequired && authenticatedDatasetId) {
      if (datasetId !== authenticatedDatasetId) {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set("dataset", authenticatedDatasetId);
        setSearchParams(nextParams, { replace: true });
      }
      return;
    }

    if (!datasetId && datasets.data?.length) {
      const nextParams = new URLSearchParams(searchParams);
      const preferredDatasetId =
        appMode === "pilot"
          ? datasets.data.find((dataset) => dataset.id === "pilot-workspace")?.id ?? datasets.data[0].id
          : datasets.data[0].id;
      nextParams.set("dataset", preferredDatasetId);
      setSearchParams(nextParams, { replace: true });
    }
  }, [appMode, authRequired, authenticatedDatasetId, datasetId, datasets.data, searchParams, setSearchParams]);

  const selectedDatasetId = authRequired ? authenticatedDatasetId ?? datasetId : datasetId;
  const selectedDataset = datasets.data ? getScenarioMeta(datasets.data, selectedDatasetId) : undefined;
  const restaurantOptions = useMemo(
    () =>
      authState.me?.workspaces.flatMap((workspace) =>
        workspace.restaurants.map((restaurant) => ({
          workspaceId: workspace.workspaceId,
          workspaceName: workspace.workspaceName,
          restaurantId: restaurant.restaurantId,
          restaurantName: restaurant.restaurantName,
          role: workspace.role
        }))
      ) ?? [],
    [authState.me]
  );
  const currentRestaurant =
    restaurantOptions.find((restaurant) => restaurant.restaurantId === authState.me?.activeRestaurantId) ?? null;

  function handleDatasetChange(nextDatasetId: string) {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("dataset", nextDatasetId);
    setSearchParams(nextParams);
  }

  async function handleRestaurantChange(nextRestaurantId: string) {
    const target = restaurantOptions.find((restaurant) => restaurant.restaurantId === nextRestaurantId);
    if (!target) {
      return;
    }

    const me = await apiClient.setAuthContext({
      workspaceId: target.workspaceId,
      restaurantId: target.restaurantId
    });
    setAuthState({ loading: false, me, error: null });
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("dataset", target.restaurantId);
    setSearchParams(nextParams);
  }

  async function handleLogout() {
    try {
      await apiClient.logout();
    } finally {
      setAuthState({ loading: false, me: null, error: null });
    }
  }

  if (config.loading || datasets.loading || (authRequired && authToken && authState.loading)) {
    return <ShellState title="Loading workspace" message="Preparing the restaurant work area." />;
  }

  if (config.error || datasets.error || !config.data || !datasets.data) {
    return <ShellState title="Configuration did not load" message="Start the frontend and API, then reload this view." tone="danger" />;
  }

  const loginPath = `/login?next=${encodeURIComponent(`${location.pathname}${location.search}`)}`;
  const authGate =
    authRequired && !authState.me ? (
      <Panel className="mx-auto max-w-xl rounded-[2rem]" tone="warning">
        <p className="text-xs uppercase tracking-[0.2em] text-warning">Login required</p>
        <h2 className="mt-3 font-display text-3xl text-text">Workspace session required</h2>
        <p className="mt-3 text-sm leading-6 text-text">
          {authState.error ?? "Sign in before loading restaurant data."}
        </p>
        <Link
          className="mt-5 inline-flex rounded-full border border-warning/30 bg-warning/10 px-4 py-2 text-sm text-warning"
          to={loginPath}
        >
          Open login
        </Link>
      </Panel>
    ) : null;

  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="grid min-h-screen lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="border-b border-border bg-panel/95 p-4 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-3 lg:block">
            <Link className="block" to={{ pathname: "/", search: buildDatasetSearch(selectedDataset?.id) }}>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Profit Analyzer</p>
              <p className="mt-2 hidden text-sm leading-5 text-muted lg:block">Restaurant margin operations</p>
            </Link>
            <div className="flex gap-2 lg:mt-6">
              <LanguageToggle onChange={setLanguage} />
              <ThemeToggle />
            </div>
          </div>

          <nav className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-1" aria-label="Primary navigation">
            {primaryNav.map((item) => (
              <NavLink
                className={navClass}
                end={item.path === "/"}
                key={`${item.key}-${item.path}`}
                to={{ pathname: item.path, search: buildDatasetSearch(selectedDataset?.id) }}
              >
                <span>{t[item.key]}</span>
              </NavLink>
            ))}
          </nav>

          {config.data.appMode === "demo" ? (
            <div className="mt-5 rounded-3xl border border-border bg-elevated/70 p-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Demo workspace</p>
              <ScenarioSelector
                datasets={datasets.data}
                onChange={handleDatasetChange}
                selectedDatasetId={selectedDataset?.id}
                compact
              />
            </div>
          ) : null}
        </aside>

        <div className="flex min-w-0 flex-col">
          <header className="flex min-h-[4.5rem] flex-col gap-3 border-b border-border bg-bg/90 px-4 py-3 backdrop-blur md:flex-row md:items-center md:justify-between md:px-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                {config.data.appMode === "demo" ? "Demo workspace" : "Workspace"}
              </p>
              <h1 className="mt-1 text-xl font-bold tracking-[-0.03em] text-text md:text-2xl">
                {currentRestaurant?.restaurantName ?? selectedDataset?.name ?? "Restaurant workspace"}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {restaurantOptions.length > 1 ? (
                <select
                  className="rounded-full border border-border bg-panel px-3 py-2 text-sm text-text"
                  onChange={(event) => void handleRestaurantChange(event.target.value)}
                  value={authState.me?.activeRestaurantId}
                >
                  {restaurantOptions.map((restaurant) => (
                    <option key={restaurant.restaurantId} value={restaurant.restaurantId}>
                      {restaurant.workspaceName} / {restaurant.restaurantName}
                    </option>
                  ))}
                </select>
              ) : null}
              {authState.me ? (
                <div className="flex items-center gap-3 rounded-full border border-border bg-panel px-3 py-2">
                  <span className="text-sm text-text">{authState.me.user.name}</span>
                  <button className="text-sm text-muted hover:text-text" onClick={() => void handleLogout()} type="button">
                    Log out
                  </button>
                </div>
              ) : authRequired ? (
                <Link className="rounded-full border border-border bg-panel px-3 py-2 text-sm text-text" to={loginPath}>
                  Open login
                </Link>
              ) : null}
            </div>
          </header>

          <main className="work-scroll min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6">
            {authGate ?? <Outlet />}
          </main>
        </div>
      </div>
    </div>
  );
}

function ShellState({ title, message, tone = "default" }: { title: string; message: string; tone?: "default" | "danger" }) {
  return (
    <div className="min-h-screen bg-bg p-6 text-text">
      <Panel className="mx-auto max-w-2xl rounded-[2rem]" tone={tone}>
        <p className="text-xs uppercase tracking-[0.22em] text-accent">Profit Analyzer</p>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-[-0.04em]">{title}</h1>
        <p className="mt-4 text-sm leading-6 text-muted">{message}</p>
      </Panel>
    </div>
  );
}
