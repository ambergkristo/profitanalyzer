import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";

import { apiClient } from "../api/client.js";
import { ActionButton } from "../components/ActionButton.js";
import { ActionCard } from "../components/ActionCard.js";
import { MetricStrip } from "../components/MetricStrip.js";
import { PageHeader } from "../components/PageHeader.js";
import { Panel } from "../components/Panel.js";
import { ReasonCodeBadge } from "../components/ReasonCodeBadge.js";
import { SectionHeader } from "../components/SectionHeader.js";
import { StatePanel } from "../components/StatePanel.js";
import { StatusTag } from "../components/StatusTag.js";
import { ValueDelta } from "../components/ValueDelta.js";
import { useAsyncData } from "../hooks.js";
import { formatEuro, formatPercent } from "../utils/format.js";
import { buildDatasetSearch } from "../utils/scenario.js";

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
        message="Tracing cost drivers, recommended actions, and the simulation baseline..."
        title="Loading dish detail"
        tone="loading"
      />
    );
  }

  if (error || !detail) {
    const notFound = error?.includes("404");

    return (
      <StatePanel
        actions={[
          { href: `/dishes${buildDatasetSearch(datasetId)}`, label: "Back to dishes" },
          { href: `/${buildDatasetSearch(datasetId)}`, label: "Open dashboard" }
        ]}
        message={
          notFound
            ? "This dish does not exist in the selected scenario. Open the scenario dish list and choose another item."
            : "Backend is not reachable. Start the API with npm run dev."
        }
        title={notFound ? "Dish not available in this scenario" : "Dish detail unavailable"}
        tone="error"
      />
    );
  }

  const practicalNextMove =
    detail.recommendedActionsForDish[0]?.message ??
    "This dish does not need an immediate intervention, so focus on keeping the margin stable.";
  const aggressiveSimulation =
    parsedPriceCents !== null &&
    ((parsedPriceCents - detail.dish.priceCents) / detail.dish.priceCents) * 100 > 25;
  const simulationDeltaDirection =
    simulation?.profitDeltaCents && simulation.profitDeltaCents > 0
      ? "positive"
      : simulation?.profitDeltaCents && simulation.profitDeltaCents < 0
        ? "negative"
        : "neutral";
  const resolvedDetail = detail;

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
      <Panel className="p-7">
        <PageHeader
          actions={
            <Panel className="rounded-tile p-4" tone="subtle">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Primary next move</p>
              <p className="mt-3 text-sm leading-6 text-text">{practicalNextMove}</p>
              {detail.costDriverInsight ? (
                <p className="mt-3 text-sm leading-6 text-warning">{detail.costDriverInsight.message}</p>
              ) : null}
            </Panel>
          }
          badges={
            <>
              <StatusTag status={detail.metrics.status} />
              {detail.explanation.reasonCodes.map((reasonCode) => (
                <ReasonCodeBadge key={reasonCode} reasonCode={reasonCode} />
              ))}
            </>
          }
          description={detail.explanation.summary}
          eyebrow="Dish decision summary"
          title={detail.dish.name}
        />
      </Panel>

      <Panel>
        <SectionHeader
          description="Read the live economics first, then check whether the simulator improves the status enough to justify a menu change."
          eyebrow="Metric strip"
          title="Current economics"
        />
        <div className="mt-6">
          <MetricStrip
            items={[
              { label: "Current price", value: formatEuro(detail.metrics.priceCents) },
              { label: "Current cost", value: formatEuro(detail.metrics.costCents) },
              { label: "Gross profit / sale", value: formatEuro(detail.metrics.grossProfitPerSaleCents) },
              {
                label: "Margin",
                value: formatPercent(detail.metrics.marginPercent),
                tone:
                  detail.metrics.status === "loss"
                    ? "danger"
                    : detail.metrics.status === "warning"
                      ? "warning"
                      : "profit"
              },
              { label: "Period profit", value: formatEuro(detail.metrics.estimatedPeriodProfitCents) },
              { label: "Sales volume", value: `${detail.metrics.salesVolume}` }
            ]}
          />
        </div>
      </Panel>

      <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <Panel>
          <SectionHeader
            description="The engine highlights the ingredient that most heavily drives dish cost so the next move is concrete."
            eyebrow="Cost driver panel"
            title="What makes it expensive"
          />
          <div className="mt-6 space-y-3">
            {costDrivers.map((item, index) => (
              <div
                key={item.ingredientId}
                className={`rounded-tile border p-4 ${
                  index === 0 ? "border-warning/30 bg-warning/[0.08]" : "border-border bg-white/[0.02]"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
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
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/30">
                  <div className="h-full rounded-full bg-warning" style={{ width: `${item.percentOfDishCost}%` }} />
                </div>
                <p className="mt-3 text-sm leading-6 text-muted">
                  {item.percentOfDishCost.toFixed(1)}% of dish cost
                  {index === 0 && item.percentOfDishCost > 35
                    ? ". One ingredient is carrying more than 35% of total cost."
                    : "."}
                </p>
                {item.warning ? <p className="mt-3 text-sm leading-6 text-warning">{item.warning}</p> : null}
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionHeader
            description="Simulator results are generated by the backend so the UI stays aligned with the engine."
            eyebrow="Price simulator"
            title="Test the next menu move"
          />
          <div className="mt-6 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <Panel className="rounded-tile p-4" tone="subtle">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Current live price</p>
              <p className="mt-2 font-display text-3xl text-text">{formatEuro(detail.simulationHints.currentPriceCents)}</p>
              <p className="mt-3 text-sm leading-6 text-muted">{detail.simulationHints.note}</p>
              {detail.simulationHints.recommendedPriceCents ? (
                <p className="mt-3 text-sm leading-6 text-text">
                  Suggested next test price {formatEuro(detail.simulationHints.recommendedPriceCents)} for a target margin of {detail.simulationHints.recommendedTargetMarginPercent}%.
                </p>
              ) : null}
            </Panel>

            <Panel className="rounded-tile p-4" tone="subtle">
              <label className="text-sm text-muted">
                New price
                <input
                  className="mt-2 w-full rounded-tile border border-border bg-black/20 px-4 py-3 text-lg text-text outline-none transition focus:border-accent/50"
                  onChange={(event) => setPriceInput(event.target.value)}
                  step="0.10"
                  type="number"
                  value={priceInput}
                />
              </label>

              <div className="mt-4 flex flex-wrap gap-2">
                {detail.simulationHints.quickAdjustmentsCents.map((delta) => (
                  <ActionButton key={delta} onClick={() => runQuickAdjustment(delta)} variant="secondary">
                    +{formatEuro(delta)}
                  </ActionButton>
                ))}
                {detail.simulationHints.targetMarginActions.map((target) => (
                  <ActionButton
                    key={target.label}
                    onClick={() => void runSimulation(target.priceCents)}
                    variant="profit"
                  >
                    {target.label}
                  </ActionButton>
                ))}
              </div>

              <div className="mt-4">
                <ActionButton
                  disabled={isSimulating}
                  onClick={() => void runSimulation()}
                  variant="primary"
                >
                  {isSimulating ? "Running simulation..." : "Run simulation"}
                </ActionButton>
              </div>
            </Panel>
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
            <div className="mt-6 space-y-4">
              <MetricStrip
                items={[
                  { label: "Old margin", value: formatPercent(simulation.oldMarginPercent) },
                  {
                    label: "New margin",
                    value: formatPercent(simulation.newMarginPercent),
                    tone:
                      simulation.statusAfter === "loss"
                        ? "danger"
                        : simulation.statusAfter === "warning"
                          ? "warning"
                          : "profit"
                  },
                  { label: "Old profit", value: formatEuro(simulation.oldEstimatedPeriodProfitCents) },
                  { label: "New profit", value: formatEuro(simulation.newEstimatedPeriodProfitCents) }
                ]}
              />
              <div className="grid gap-4 md:grid-cols-[0.8fr_1.2fr]">
                <Panel className="rounded-tile p-4" tone="subtle">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Profit delta</p>
                  <div className="mt-3">
                    <ValueDelta
                      direction={simulationDeltaDirection}
                      value={formatEuro(Math.abs(simulation.profitDeltaCents))}
                    />
                  </div>
                </Panel>
                <Panel className="rounded-tile p-4" tone="subtle">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Status change</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <StatusTag status={simulation.statusBefore} />
                    <span className="text-sm text-muted">to</span>
                    <StatusTag status={simulation.statusAfter} />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-text">{simulation.message}</p>
                </Panel>
              </div>
            </div>
          ) : null}
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel>
          <SectionHeader
            description="Ingredient share bars make it obvious where the cost stack is concentrated."
            eyebrow="Ingredient breakdown"
            title="Where the cost comes from"
          />
          <div className="mt-6 space-y-3">
            {detail.ingredientBreakdown.map((item) => (
              <div key={item.ingredientId} className="rounded-tile border border-border bg-white/[0.02] p-4">
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
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/30">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${item.percentOfDishCost}%` }} />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted">
                  <span>{item.percentOfDishCost.toFixed(1)}% of dish cost</span>
                  <span>
                    Unit cost {item.unitCostCents !== null ? formatEuro(item.unitCostCents) : "n/a"} per {item.unit}
                  </span>
                </div>
                {item.warning ? <p className="mt-3 text-sm leading-6 text-warning">{item.warning}</p> : null}
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionHeader
            aside={
              <Link
                className="text-sm font-medium text-accent"
                to={`/dishes${datasetId ? `?dataset=${encodeURIComponent(datasetId)}` : ""}`}
              >
                Back to dish list
              </Link>
            }
            description="These actions are already filtered to the current dish so the owner sees only the next decision-relevant moves."
            eyebrow="Recommended actions"
            title="What to do with this dish"
          />
          <div className="mt-6 space-y-4">
            {detail.recommendedActionsForDish.length === 0 ? (
              <StatePanel
                message="The current numbers do not trigger a margin repair, promotion, or data-quality workflow."
                title="No immediate actions are ranked for this dish."
                tone="empty"
              />
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
        </Panel>
      </section>
    </div>
  );
}
