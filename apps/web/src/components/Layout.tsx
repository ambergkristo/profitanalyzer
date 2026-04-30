import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useSearchParams } from "react-router-dom";

import { apiClient } from "../api/client.js";
import type { AuthMeResponse } from "../types.js";
import { useAsyncData } from "../hooks.js";
import { buildDatasetSearch, getScenarioMeta } from "../utils/scenario.js";
import { Panel } from "./Panel.js";
import { ScenarioSelector } from "./ScenarioSelector.js";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-4 py-2 text-sm font-medium transition ${
    isActive ? "bg-accent/15 text-accent" : "text-muted hover:text-text"
  }`;

export function Layout() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const datasetId = searchParams.get("dataset") ?? undefined;
  const loadDatasets = useCallback(() => apiClient.getDemoDatasets(), []);
  const loadConfig = useCallback(() => apiClient.getAppConfig(), []);
  const datasets = useAsyncData(loadDatasets);
  const config = useAsyncData(loadConfig);
  const [authToken, setAuthToken] = useState(() => apiClient.getStoredAuthToken());
  const [authState, setAuthState] = useState<{
    loading: boolean;
    me: AuthMeResponse | null;
    error: string | null;
  }>({
    loading: false,
    me: null,
    error: null
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleAuthChange = () => {
      setAuthToken(apiClient.getStoredAuthToken());
    };

    window.addEventListener(apiClient.authChangeEvent, handleAuthChange);
    return () => window.removeEventListener(apiClient.authChangeEvent, handleAuthChange);
  }, []);

  useEffect(() => {
    if (!config.data?.auth.required) {
      setAuthState({ loading: false, me: null, error: null });
      return;
    }

    if (!authToken) {
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
  const isDemoMode = appMode === "demo";
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
    return (
      <div className="min-h-screen bg-bg px-4 py-6 text-text md:px-6 xl:px-8">
        <div className="mx-auto max-w-[1400px]">
          <Panel className="rounded-[2rem] border border-border bg-panel/90 p-6 shadow-telemetry backdrop-blur">
            <p className="text-xs uppercase tracking-[0.24em] text-accent">Menu Profit Optimizer</p>
            <h1 className="mt-3 font-display text-4xl leading-none md:text-6xl">
              Loading workspace
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">
              Checking app mode, storage, and workspace access.
            </p>
          </Panel>
        </div>
      </div>
    );
  }

  if (config.error || datasets.error || !config.data || !datasets.data) {
    return (
      <div className="min-h-screen bg-bg px-4 py-6 text-text md:px-6 xl:px-8">
        <div className="mx-auto max-w-[1400px]">
          <Panel className="rounded-[2rem] border border-danger/20 bg-danger/[0.08] p-6 shadow-telemetry">
            <p className="text-xs uppercase tracking-[0.24em] text-danger">App unavailable</p>
            <h1 className="mt-3 font-display text-4xl leading-none md:text-6xl">Configuration did not load</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-text">
              Start the frontend and API with <code>npm run dev</code>, then reload this view.
            </p>
          </Panel>
        </div>
      </div>
    );
  }

  const loginPath = `/login?next=${encodeURIComponent(`${location.pathname}${location.search}`)}`;
  const currentRestaurant =
    restaurantOptions.find((restaurant) => restaurant.restaurantId === authState.me?.activeRestaurantId) ?? null;

  const authGate =
    authRequired && !authState.me ? (
      <Panel className="rounded-tile border-warning/25 bg-warning/[0.08] px-4 py-4" tone="warning">
        <p className="text-[11px] uppercase tracking-[0.2em] text-warning">Login required</p>
        <p className="mt-2 text-sm leading-6 text-text">
          {authState.error ?? "Pilot and production-like modes require a signed-in workspace session before restaurant data can load."}
        </p>
        <div className="mt-4">
          <Link
            className="inline-flex rounded-full border border-warning/30 bg-warning/10 px-4 py-2 text-sm text-warning transition hover:border-warning/60"
            to={loginPath}
          >
            Open login
          </Link>
        </div>
      </Panel>
    ) : null;

  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="mx-auto flex min-h-screen max-w-[1400px] flex-col px-4 py-6 md:px-6 xl:px-8">
        <header className="rounded-[2rem] border border-border bg-panel/90 p-5 shadow-telemetry backdrop-blur">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs uppercase tracking-[0.24em] text-accent">Menu Profit Optimizer</p>
                <h1 className="mt-3 font-display text-4xl leading-none md:text-6xl">Restaurant Profit Command Center</h1>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">
                  {isDemoMode
                    ? "Scenario-switchable decision cockpit for margin repair, profit protection, and price testing."
                    : "Authenticated workspace for invoice-driven cost updates, supplier alerts, and decision-first menu reviews."}
                </p>
              </div>

              {datasets.data && isDemoMode ? (
                <ScenarioSelector
                  datasets={datasets.data}
                  onChange={handleDatasetChange}
                  selectedDatasetId={selectedDataset?.id}
                />
              ) : null}
            </div>

            <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
              <Panel className="rounded-tile border-white/8 bg-black/20 px-4 py-4" tone="subtle">
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted">
                  {isDemoMode ? "Active demo profile" : "Active workspace"}
                </p>
                <div className="mt-2 flex flex-col gap-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-display text-2xl text-text">
                        {selectedDataset?.name ?? (authRequired ? "Workspace session required" : "Loading scenario")}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-muted">
                        {selectedDataset?.ownerDiagnosis ??
                          (isDemoMode
                            ? "Loading scenario metadata..."
                            : "Sign in to load a workspace and keep review-confirm safety active.")}
                      </p>
                      {selectedDataset ? (
                        <p className="mt-2 text-sm leading-6 text-muted">{selectedDataset.description}</p>
                      ) : null}
                      {config.data ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="rounded-full border border-white/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-text">
                            {config.data.appMode === "demo" ? "Demo mode" : "Pilot mode"}
                          </span>
                          <span className="rounded-full border border-white/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-muted">
                            Storage {config.data.storage.driver}
                          </span>
                          <span className="rounded-full border border-white/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-muted">
                            Auth {config.data.auth.mode}
                          </span>
                          {config.data.features.externalOcrConfigured ? (
                            <span className="rounded-full border border-profit/20 bg-profit/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-profit">
                              External OCR configured
                            </span>
                          ) : (
                            <span className="rounded-full border border-warning/20 bg-warning/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-warning">
                              Fixture OCR default
                            </span>
                          )}
                        </div>
                      ) : null}
                    </div>

                    {authState.me ? (
                      <div className="min-w-[16rem] rounded-tile border border-white/10 bg-white/[0.03] p-4">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Signed in</p>
                        <p className="mt-2 font-medium text-text">{authState.me.user.name}</p>
                        <p className="text-sm text-muted">{authState.me.user.email}</p>
                        {currentRestaurant ? (
                          <>
                            <p className="mt-4 text-[11px] uppercase tracking-[0.18em] text-muted">Workspace</p>
                            <p className="mt-2 text-sm text-text">{currentRestaurant.workspaceName}</p>
                            <p className="text-sm text-muted">
                              {currentRestaurant.restaurantName} · {currentRestaurant.role}
                            </p>
                          </>
                        ) : null}
                        {restaurantOptions.length > 1 ? (
                          <label className="mt-4 flex flex-col gap-2 text-sm text-muted">
                            Active restaurant
                            <select
                              className="rounded-xl border border-border bg-panel px-3 py-2 text-text"
                              onChange={(event) => void handleRestaurantChange(event.target.value)}
                              value={authState.me.activeRestaurantId}
                            >
                              {restaurantOptions.map((restaurant) => (
                                <option key={restaurant.restaurantId} value={restaurant.restaurantId}>
                                  {restaurant.workspaceName} / {restaurant.restaurantName}
                                </option>
                              ))}
                            </select>
                          </label>
                        ) : null}
                        <button
                          className="mt-4 rounded-full border border-white/10 px-4 py-2 text-sm text-text transition hover:border-accent/30 hover:text-accent"
                          onClick={() => void handleLogout()}
                          type="button"
                        >
                          Log out
                        </button>
                      </div>
                    ) : authRequired ? (
                      <div className="min-w-[16rem] rounded-tile border border-warning/20 bg-warning/[0.08] p-4">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-warning">Access required</p>
                        <p className="mt-2 text-sm leading-6 text-text">
                          Sign in to load workspace-scoped restaurant data.
                        </p>
                        <Link
                          className="mt-4 inline-flex rounded-full border border-warning/30 bg-warning/10 px-4 py-2 text-sm text-warning transition hover:border-warning/60"
                          to={loginPath}
                        >
                          Open login
                        </Link>
                      </div>
                    ) : null}
                  </div>

                  {!authGate ? (
                    <nav className="flex flex-wrap gap-2">
                      <NavLink
                        className={linkClass}
                        to={{ pathname: "/onboarding", search: buildDatasetSearch(selectedDataset?.id) }}
                      >
                        Onboarding
                      </NavLink>
                      <NavLink
                        className={linkClass}
                        to={{ pathname: "/", search: buildDatasetSearch(selectedDataset?.id) }}
                      >
                        Dashboard
                      </NavLink>
                      <NavLink
                        className={linkClass}
                        to={{ pathname: "/dishes", search: buildDatasetSearch(selectedDataset?.id) }}
                      >
                        Dishes
                      </NavLink>
                      <NavLink
                        className={linkClass}
                        to={{ pathname: "/invoices", search: buildDatasetSearch(selectedDataset?.id) }}
                      >
                        Cost Intake
                      </NavLink>
                      <NavLink
                        className={linkClass}
                        to={{ pathname: "/alerts", search: buildDatasetSearch(selectedDataset?.id) }}
                      >
                        Supplier Alerts
                      </NavLink>
                      <NavLink
                        className={linkClass}
                        to={{ pathname: "/pilot-tools", search: buildDatasetSearch(selectedDataset?.id) }}
                      >
                        Pilot Tools
                      </NavLink>
                    </nav>
                  ) : null}
                </div>
              </Panel>
              {config.data.storage.persistenceWarning ? (
                <Panel className="rounded-tile border-warning/25 bg-warning/[0.08] px-4 py-4" tone="warning">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-warning">Persistence warning</p>
                  <p className="mt-2 text-sm leading-6 text-text">
                    {config.data.storage.persistenceWarning}
                  </p>
                </Panel>
              ) : null}
            </div>
          </div>
        </header>

        <main className="mt-6 flex-1">{authGate ?? <Outlet />}</main>
      </div>
    </div>
  );
}
