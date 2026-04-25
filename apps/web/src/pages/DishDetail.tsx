import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";

import { apiClient } from "../api/client.js";
import { ActionCard } from "../components/ActionCard.js";
import { SeverityBadge } from "../components/SeverityBadge.js";
import { StatePanel } from "../components/StatePanel.js";
import { StatusTag } from "../components/StatusTag.js";
import { useAsyncData } from "../hooks.js";
import { formatEuro, formatPercent } from "../utils/format.js";

function centsToInputValue(cents: number) {
  return (cents / 100).toFixed(2);
}

function parseInputToCents(value: string): number | null {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.round(parsed * 100);
}

export function DishDetailPage() {
  const params = useParams<{ dishId: string }>();
  const [searchParams] = useSearchParams();
  const datasetId = searchParams.get("dataset") ?? undefined;
  const dishId = params.dishId ?? "";
  const loadDishDetail = useCallback(
    () => apiClient.getDishDetail(dishId, datasetId),
    [dishId, datasetId]
  );
  const { data, loading, error } = useAsyncData(loadDishDetail);
  const [priceInput, setPriceInput] = useState("");
  const [simulation, setSimulation] = useState<Awaited<ReturnType<typeof apiClient.simulatePrice>> | null>(null);
  const [simulationError, setSimulationError] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    if (data) {
      setPriceInput(centsToInputValue(data.dish.priceCents));
      setSimulation(null);
      setSimulationError(null);
    }
  }, [data]);

  const detail = data;
  const parsedPriceCents = parseInputToCents(priceInput);
  const costDrivers = useMemo(
    () =>
      [...(detail?.ingredientBreakdown ?? [])]
        .sort((left, right) => right.lineCostCents - left.lineCostCents)
        .slice(0, 3),
    [detail]
  );

  if (loading) {
    return (
      <StatePanel
        title="Loading dish detail"
        message="Tracing cost drivers, recommended actions, and the simulation baseline..."
      />
    );
  }

  if (error || !detail) {
    return (
      <StatePanel
        title={error?.includes("404") ? "Dish not available in this scenario" : "Dish detail unavailable"}
        message={
          error?.includes("404")
            ? "This dish does not exist in the selected scenario. Open the scenario dish list and choose another item."
            : "Backend is not reachable. Start the API with npm run dev."
        }
      />
    );
  }

  const resolvedDetail = detail;
  const practicalNextMove =
    resolvedDetail.recommendedActionsForDish[0]?.message ??
    "This dish does not need an immediate intervention, so focus on keeping the margin stable.";
  const aggressiveSimulation =
    parsedPriceCents !== null &&
    ((parsedPriceCents - resolvedDetail.dish.priceCents) / resolvedDetail.dish.priceCents) * 100 > 25;

  async function runSimulation(nextPriceCents: number | null = parsedPriceCents) {
    if (!nextPriceCents) {
      setSimulation(null);
      setSimulationError("Enter a valid positive price before running the simulation.");
      return;
    }

    setIsSimulating(true);
    setSimulationError(null);

    try {
      const result = await apiClient.simulatePrice(resolvedDetail.dish.id, nextPriceCents, datasetId);
      setPriceInput(centsToInputValue(nextPriceCents));
      setSimulation(result);
    } catch (reason) {
      setSimulation(null);
      setSimulationError(reason instanceof Error ? reason.message : "Simulation failed.");
    } finally {
      setIsSimulating(false);
    }
  }

  function runQuickAdjustment(deltaCents: number) {
    const currentValue = parseInputToCents(priceInput) ?? resolvedDetail.dish.priceCents;
    const nextValue = Math.max(50, currentValue + deltaCents);
    void runSimulation(nextValue);
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[2rem] border border-border bg-panel p-6 shadow-telemetry">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted">Dish detail</p>
              <h2 className="mt-2 font-display text-4xl text-text">{detail.dish.name}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{detail.explanation.summary}</p>
            </div>
            <StatusTag status={detail.metrics.status} />
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <MetricCard label="Current price" value={formatEuro(detail.metrics.priceCents)} />
            <MetricCard label="Current cost" value={formatEuro(detail.metrics.costCents)} />
            <MetricCard label="Gross profit / sale" value={formatEuro(detail.metrics.grossProfitPerSaleCents)} />
            <MetricCard label="Margin" value={formatPercent(detail.metrics.marginPercent)} />
            <MetricCard label="Estimated period profit" value={formatEuro(detail.metrics.estimatedPeriodProfitCents)} />
            <MetricCard label="Sales volume" value={`${detail.metrics.salesVolume}`} />
          </div>

          <div className="mt-8 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[1.75rem] border border-white/8 bg-black/20 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">Decision summary</p>
              <h3 className="mt-3 font-display text-2xl text-text">{detail.explanation.headline}</h3>
              <div className="mt-4 space-y-2">
                {detail.explanation.highlights.map((item) => (
                  <p key={item} className="text-sm leading-6 text-muted">
                    {item}
                  </p>
                ))}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/8 bg-black/20 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">Practical next move</p>
              <p className="mt-3 text-sm leading-6 text-text">{practicalNextMove}</p>
              {detail.costDriverInsight ? (
                <p className="mt-4 text-sm leading-6 text-warning">{detail.costDriverInsight.message}</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-[2rem] border border-border bg-panel p-6 shadow-telemetry">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Cost driver panel</p>
            <h3 className="mt-2 font-display text-3xl">What makes it expensive</h3>
            <div className="mt-6 space-y-3">
              {costDrivers.map((item, index) => (
                <div
                  key={item.ingredientId}
                  className={`rounded-[1.5rem] border p-4 ${
                    index === 0 ? "border-warning/30 bg-warning/10" : "border-border bg-white/[0.02]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="font-medium text-text">{item.ingredientName}</p>
                      {index === 0 ? <SeverityBadge severity="high" /> : null}
                    </div>
                    <p className="text-sm text-text">{formatEuro(item.lineCostCents)}</p>
                  </div>
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted">
                    {item.percentOfDishCost.toFixed(1)}% of dish cost
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-border bg-panel p-6 shadow-telemetry">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Price simulator</p>
            <h3 className="mt-2 font-display text-3xl">Test the next menu move</h3>
            <p className="mt-3 text-sm leading-6 text-muted">{detail.simulationHints.note}</p>

            <div className="mt-6 rounded-[1.5rem] border border-border bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted">Current live price</p>
              <p className="mt-2 font-display text-3xl text-text">{formatEuro(detail.simulationHints.currentPriceCents)}</p>
              {detail.simulationHints.recommendedPriceCents ? (
                <p className="mt-3 text-sm leading-6 text-muted">
                  Suggested next test price {formatEuro(detail.simulationHints.recommendedPriceCents)} for a target margin of {detail.simulationHints.recommendedTargetMarginPercent}%.
                </p>
              ) : null}
            </div>

            <div className="mt-6 flex flex-col gap-4">
              <label className="text-sm text-muted">
                New price
                <input
                  className="mt-2 w-full rounded-[1rem] border border-border bg-black/20 px-4 py-3 text-lg text-text outline-none transition focus:border-accent/50"
                  onChange={(event) => setPriceInput(event.target.value)}
                  step="0.10"
                  type="number"
                  value={priceInput}
                />
              </label>

              <div className="flex flex-wrap gap-2">
                {detail.simulationHints.quickAdjustmentsCents.map((delta) => (
                  <button
                    key={delta}
                    className="rounded-full border border-border bg-black/20 px-4 py-2 text-sm text-text transition hover:border-accent/40 hover:text-accent"
                    onClick={() => runQuickAdjustment(delta)}
                    type="button"
                  >
                    +{formatEuro(delta)}
                  </button>
                ))}
                {detail.simulationHints.targetMarginActions.map((target) => (
                  <button
                    key={target.label}
                    className="rounded-full border border-profit/35 bg-profit/10 px-4 py-2 text-sm text-profit transition hover:border-profit/60"
                    onClick={() => void runSimulation(target.priceCents)}
                    type="button"
                  >
                    {target.label}
                  </button>
                ))}
              </div>

              <button
                className="rounded-[1rem] bg-accent px-5 py-3 text-sm font-semibold text-bg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSimulating}
                onClick={() => void runSimulation()}
                type="button"
              >
                {isSimulating ? "Running simulation..." : "Run simulation"}
              </button>
            </div>

            {aggressiveSimulation ? (
              <p className="mt-4 text-sm leading-6 text-warning">
                This simulated price is more than 25% above the current menu price. Treat it as an aggressive test.
              </p>
            ) : null}

            {simulationError ? (
              <p className="mt-4 text-sm leading-6 text-danger">{simulationError}</p>
            ) : null}

            {simulation ? (
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <MetricCard label="Old margin" value={formatPercent(simulation.oldMarginPercent)} />
                <MetricCard label="New margin" value={formatPercent(simulation.newMarginPercent)} />
                <MetricCard label="Old estimated profit" value={formatEuro(simulation.oldEstimatedPeriodProfitCents)} />
                <MetricCard label="New estimated profit" value={formatEuro(simulation.newEstimatedPeriodProfitCents)} />
                <MetricCard label="Profit delta" value={formatEuro(simulation.profitDeltaCents)} />
                <MetricCard label="Status change" value={`${simulation.statusBefore} -> ${simulation.statusAfter}`} />
                <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.02] p-4 md:col-span-2">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted">Interpretation</p>
                  <p className="mt-3 text-sm leading-6 text-text">{simulation.message}</p>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[2rem] border border-border bg-panel p-6 shadow-telemetry">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Ingredient breakdown</p>
          <h3 className="mt-2 font-display text-3xl">Where the cost comes from</h3>
          <div className="mt-6 space-y-3">
            {detail.ingredientBreakdown.map((item) => (
              <div key={item.ingredientId} className="rounded-[1.5rem] border border-border bg-white/[0.02] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-text">{item.ingredientName}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted">
                      {item.quantity} {item.unit}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted">Line cost</p>
                    <p className="mt-2 text-lg text-text">{formatEuro(item.lineCostCents)}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted">
                  <span>{item.percentOfDishCost.toFixed(1)}% of dish cost</span>
                  <span>
                    Unit cost {item.unitCostCents !== null ? formatEuro(item.unitCostCents) : "n/a"} per {item.unit}
                  </span>
                </div>
                {item.warning ? (
                  <p className="mt-3 text-sm leading-6 text-warning">{item.warning}</p>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-border bg-panel p-6 shadow-telemetry">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted">Recommended actions</p>
              <h3 className="mt-2 font-display text-3xl">What to do with this dish</h3>
            </div>
            <Link
              className="text-sm font-medium text-accent"
              to={`/dishes${datasetId ? `?dataset=${encodeURIComponent(datasetId)}` : ""}`}
            >
              Back to dish list
            </Link>
          </div>
          <div className="mt-6 space-y-4">
            {detail.recommendedActionsForDish.length === 0 ? (
              <div className="rounded-[1.5rem] border border-border bg-black/20 p-5">
                <p className="font-medium text-text">No immediate actions are ranked for this dish.</p>
                <p className="mt-2 text-sm leading-6 text-muted">The current numbers do not trigger a margin repair, promotion, or data-quality workflow.</p>
              </div>
            ) : (
              detail.recommendedActionsForDish.map((action) => (
                <ActionCard
                  key={action.id}
                  action={action}
                  datasetId={datasetId}
                  dishName={detail.dish.name}
                />
              ))
            )}
          </div>
        </section>
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.02] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-3 font-display text-3xl text-text">{value}</p>
    </div>
  );
}
