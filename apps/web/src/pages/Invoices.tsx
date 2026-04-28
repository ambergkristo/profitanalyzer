import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { apiClient } from "../api/client.js";
import { ActionButton } from "../components/ActionButton.js";
import { MetricStrip } from "../components/MetricStrip.js";
import { PageHeader } from "../components/PageHeader.js";
import { Panel } from "../components/Panel.js";
import { SectionHeader } from "../components/SectionHeader.js";
import { SeverityBadge } from "../components/SeverityBadge.js";
import { StatePanel } from "../components/StatePanel.js";
import { useAsyncData } from "../hooks.js";
import type {
  InvoiceConfirmResponse,
  InvoiceDraftResponse,
  InvoiceUnit
} from "../types.js";
import { formatEuro, formatPercent } from "../utils/format.js";
import {
  createEditableInvoiceLines,
  hasUnresolvedInvoiceLines,
  type EditableInvoiceLine,
  type InvoiceReviewLineState
} from "../utils/invoices.js";
import { buildDatasetSearch, getScenarioMeta } from "../utils/scenario.js";

const invoiceUnits: InvoiceUnit[] = ["g", "kg", "ml", "l", "pcs", "pack", "piece"];

const confidenceLabel = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
  none: "Unknown match"
} as const;

const confidenceTone = {
  high: "border-profit/30 bg-profit/10 text-profit",
  medium: "border-accent/30 bg-accent/10 text-accent",
  low: "border-warning/30 bg-warning/10 text-warning",
  none: "border-danger/30 bg-danger/12 text-danger"
} as const;

const reviewStatusTone: Record<InvoiceReviewLineState, string> = {
  confirmed: "border-profit/30 bg-profit/10 text-profit",
  ignored: "border-white/10 bg-white/[0.04] text-muted",
  needs_review: "border-warning/30 bg-warning/10 text-warning"
};

function convertInvoiceCostToIngredientUnit(
  invoiceUnitPriceCents: number,
  invoiceUnit: InvoiceUnit,
  ingredientUnit: string
) {
  if (invoiceUnit === ingredientUnit) {
    return invoiceUnitPriceCents;
  }

  if (invoiceUnit === "pcs" && ingredientUnit === "piece") {
    return invoiceUnitPriceCents;
  }

  if (invoiceUnit === "kg" && ingredientUnit === "g") {
    return Math.max(1, Math.round(invoiceUnitPriceCents / 1000));
  }

  if (invoiceUnit === "l" && ingredientUnit === "ml") {
    return Math.max(1, Math.round(invoiceUnitPriceCents / 1000));
  }

  return null;
}

function calculateDeltaPercent(previousCost: number | undefined, nextCost: number | null) {
  if (!previousCost || !nextCost || previousCost <= 0) {
    return undefined;
  }

  return Number((((nextCost - previousCost) / previousCost) * 100).toFixed(1));
}

export function InvoicesPage() {
  const [searchParams] = useSearchParams();
  const datasetId = searchParams.get("dataset") ?? undefined;
  const previousDatasetId = useRef(datasetId);
  const loadInvoicePage = useCallback(async () => {
    const [datasets, samples, ingredients, suppliers] = await Promise.all([
      apiClient.getDemoDatasets(),
      apiClient.getInvoiceSamples(),
      apiClient.getIngredients(datasetId),
      apiClient.getSuppliers(datasetId)
    ]);

    return { datasets, samples, ingredients, suppliers };
  }, [datasetId]);
  const page = useAsyncData(loadInvoicePage);
  const [selectedSampleId, setSelectedSampleId] = useState<string>("");
  const [draft, setDraft] = useState<InvoiceDraftResponse | null>(null);
  const [reviewLines, setReviewLines] = useState<EditableInvoiceLine[]>([]);
  const [supplierId, setSupplierId] = useState<string>("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [latestConfirmation, setLatestConfirmation] = useState<InvoiceConfirmResponse | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [datasetResetNotice, setDatasetResetNotice] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    if (page.data?.samples.length && !selectedSampleId) {
      setSelectedSampleId(page.data.samples[0].id);
    }
  }, [page.data?.samples, selectedSampleId]);

  useEffect(() => {
    if (previousDatasetId.current !== datasetId) {
      if (draft || latestConfirmation) {
        setDraft(null);
        setReviewLines([]);
        setLatestConfirmation(null);
        setConfirmError(null);
        setParseError(null);
        setDatasetResetNotice(
          "Scenario changed. The current invoice draft was cleared so cost updates stay isolated to one restaurant profile."
        );
      }

      previousDatasetId.current = datasetId;
    }
  }, [datasetId, draft, latestConfirmation]);

  const selectedDataset = page.data ? getScenarioMeta(page.data.datasets, datasetId) : undefined;
  const selectedSample = page.data?.samples.find((sample) => sample.id === selectedSampleId);
  const unresolvedLines = hasUnresolvedInvoiceLines(reviewLines);

  const alertPreview = latestConfirmation?.alerts ?? [];
  const affectedDishes = latestConfirmation?.affectedDishes ?? [];

  const reviewCompletionLabel =
    reviewLines.length === 0
      ? "No invoice loaded yet."
      : unresolvedLines
        ? `${reviewLines.filter((line) => line.reviewStatus === "needs_review").length} lines still need a decision before cost updates can be confirmed.`
        : "All lines are resolved. Confirming now will update current ingredient costs for this scenario.";

  if (page.loading) {
    return (
      <StatePanel
        message="Loading invoice samples, supplier aliases, and ingredient match targets..."
        title="Loading cost intake"
        tone="loading"
      />
    );
  }

  if (page.error || !page.data || !selectedDataset) {
    return (
      <StatePanel
        message={
          page.error?.includes("404")
            ? "The selected scenario is not available. Switch back to a valid demo dataset."
            : "Backend is not reachable. Start the API with npm run dev."
        }
        title={page.error?.includes("404") ? "Scenario unavailable" : "Cost intake unavailable"}
        tone="error"
        actions={[{ href: "/", label: "Open dashboard" }]}
      />
    );
  }

  const pageData = page.data;

  async function handleParseInvoice() {
    if (!selectedSampleId) {
      return;
    }

    setIsParsing(true);
    setParseError(null);
    setConfirmError(null);
    setDatasetResetNotice(null);

    try {
      const parsed = await apiClient.parseMockInvoiceSample(selectedSampleId, datasetId);
      setDraft(parsed);
      setReviewLines(createEditableInvoiceLines(parsed.lines));
      setSupplierId(parsed.supplierSuggestion.supplierId ?? parsed.invoiceDraft.supplierId);
      setInvoiceDate(parsed.invoiceDraft.invoiceDate);
      setInvoiceNumber(parsed.invoiceDraft.invoiceNumber ?? "");
      setLatestConfirmation(null);
    } catch (reason) {
      setDraft(null);
      setReviewLines([]);
      setLatestConfirmation(null);
      setParseError(reason instanceof Error ? reason.message : "Failed to parse invoice sample.");
    } finally {
      setIsParsing(false);
    }
  }

  function updateLine(lineId: string, patch: Partial<EditableInvoiceLine>) {
    setReviewLines((current) =>
      current.map((line) => (line.lineId === lineId ? { ...line, ...patch } : line))
    );
  }

  async function handleConfirmInvoice() {
    if (!draft || unresolvedLines) {
      return;
    }

    setIsConfirming(true);
    setConfirmError(null);

    try {
      const result = await apiClient.confirmInvoiceReview(
        draft.invoiceDraft.id,
        {
          supplierId,
          invoiceDate,
          invoiceNumber,
          lines: reviewLines.map((line) => ({
            lineId: line.lineId,
            reviewStatus: line.reviewStatus === "ignored" ? "ignored" : "confirmed",
            matchedIngredientId:
              line.reviewStatus === "confirmed" ? line.matchedIngredientId : undefined,
            parsedQuantity: line.parsedQuantity,
            parsedUnit: line.parsedUnit,
            parsedUnitPriceCents: line.parsedUnitPriceCents ?? 1,
            parsedLineTotalCents: line.parsedLineTotalCents
          }))
        },
        datasetId
      );

      setLatestConfirmation(result);
    } catch (reason) {
      setConfirmError(reason instanceof Error ? reason.message : "Invoice confirmation failed.");
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <div className="space-y-6">
      <Panel className="p-7">
        <PageHeader
          actions={
            <Panel className="rounded-tile p-4" tone="subtle">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Active scenario</p>
              <p className="mt-2 font-display text-2xl text-text">{selectedDataset.name}</p>
              <p className="mt-3 text-sm leading-6 text-text">{selectedDataset.ownerDiagnosis}</p>
              <p className="mt-3 text-sm leading-6 text-muted">
                Real photo and OCR upload starts in RM8. This workflow is deliberately review-first.
              </p>
            </Panel>
          }
          badges={
            <>
              <span className="rounded-full border border-white/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-muted">
                {selectedDataset.profile}
              </span>
              <span className="rounded-full border border-profit/20 bg-profit/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-profit">
                Review before update
              </span>
            </>
          }
          description="Turn supplier invoices into confirmed ingredient cost updates, price-change alerts, and affected-dish margin impact."
          eyebrow="Invoice cost intake"
          title="Review supplier costs before they hit margin"
        />
      </Panel>

      {datasetResetNotice ? (
        <Panel tone="warning">
          <p className="text-sm leading-6 text-text">{datasetResetNotice}</p>
        </Panel>
      ) : null}

      <Panel>
        <SectionHeader
          description="Start with a structured sample invoice. The workflow stays deterministic so the demo is repeatable."
          eyebrow="Sample invoices"
          title="Choose a supplier cost update"
        />
        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          {pageData.samples.map((sample) => (
            <button
              key={sample.id}
              className={`rounded-panel border p-5 text-left transition ${
                sample.id === selectedSampleId
                  ? "border-accent/40 bg-accent/[0.08]"
                  : "border-border bg-white/[0.02] hover:border-white/15"
              }`}
              onClick={() => setSelectedSampleId(sample.id)}
              type="button"
            >
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted">{sample.invoiceDate}</p>
              <h2 className="mt-3 font-display text-3xl text-text">{sample.name}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{sample.description}</p>
              <div className="mt-4 rounded-tile border border-white/8 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-warning">Expected impact</p>
                <p className="mt-2 text-sm leading-6 text-text">{sample.expectedImpact}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <ActionButton disabled={!selectedSampleId || isParsing} onClick={() => void handleParseInvoice()} variant="primary">
            {isParsing ? "Parsing sample invoice..." : "Parse sample invoice"}
          </ActionButton>
          {selectedSample ? (
            <p className="text-sm leading-6 text-muted">
              Selected {selectedSample.supplierName}. Use this to confirm costs safely before analytics update.
            </p>
          ) : null}
        </div>

        {parseError ? <p className="mt-4 text-sm leading-6 text-danger">{parseError}</p> : null}
      </Panel>

      {draft ? (
        <section className="grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
          <Panel>
            <SectionHeader
              description="Confirm the supplier, inspect every parsed line, and resolve low-confidence matches before current ingredient costs are updated."
              eyebrow="Parsed invoice review"
              title="Review before applying cost changes"
            />

            <div className="mt-6 grid gap-4 xl:grid-cols-4">
              <label className="text-sm text-muted">
                Supplier
                <select
                  className="mt-2 w-full rounded-tile border border-border bg-black/20 px-4 py-3 text-text outline-none transition focus:border-accent/40"
                  onChange={(event) => setSupplierId(event.target.value)}
                  value={supplierId}
                >
                  {pageData.suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-muted">
                Invoice date
                <input
                  className="mt-2 w-full rounded-tile border border-border bg-black/20 px-4 py-3 text-text outline-none transition focus:border-accent/40"
                  onChange={(event) => setInvoiceDate(event.target.value)}
                  type="date"
                  value={invoiceDate}
                />
              </label>
              <label className="text-sm text-muted">
                Invoice number
                <input
                  className="mt-2 w-full rounded-tile border border-border bg-black/20 px-4 py-3 text-text outline-none transition focus:border-accent/40"
                  onChange={(event) => setInvoiceNumber(event.target.value)}
                  placeholder="Optional invoice number"
                  type="text"
                  value={invoiceNumber}
                />
              </label>
              <Panel className="rounded-tile p-4" tone="subtle">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Parse status</p>
                <p className="mt-2 font-medium text-text">{draft.invoiceDraft.parseStatus.replaceAll("_", " ")}</p>
                <p className="mt-3 text-sm leading-6 text-muted">
                  {draft.summary.needsReviewLineCount} lines need attention before confirmation.
                </p>
              </Panel>
            </div>

            <div className="mt-6 space-y-4">
              {reviewLines.map((line) => {
                const ingredient = pageData.ingredients.find(
                  (candidate) => candidate.id === line.matchedIngredientId
                );
                const convertedCost =
                  line.parsedUnitPriceCents !== null && ingredient
                    ? convertInvoiceCostToIngredientUnit(
                        line.parsedUnitPriceCents,
                        line.parsedUnit,
                        ingredient.unit
                      )
                    : null;
                const liveDeltaPercent = calculateDeltaPercent(
                  ingredient?.costPerUnitCents,
                  convertedCost
                );

                return (
                  <div
                    key={line.lineId}
                    className={`rounded-panel border p-5 ${
                      line.reviewStatus === "needs_review"
                        ? "border-warning/30 bg-warning/[0.08]"
                        : line.reviewStatus === "ignored"
                          ? "border-white/10 bg-white/[0.03]"
                          : "border-border bg-black/20"
                    }`}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${confidenceTone[line.matchConfidence]}`}
                          >
                            {confidenceLabel[line.matchConfidence]}
                          </span>
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${reviewStatusTone[line.reviewStatus]}`}
                          >
                            {line.reviewStatus.replaceAll("_", " ")}
                          </span>
                        </div>
                        <h3 className="mt-3 font-display text-3xl text-text">{line.rawProductName}</h3>
                        {line.warnings.length > 0 ? (
                          <div className="mt-3 space-y-2">
                            {line.warnings.map((warning) => (
                              <p key={warning} className="text-sm leading-6 text-warning">
                                {warning}
                              </p>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <ActionButton
                          onClick={() => updateLine(line.lineId, { reviewStatus: "confirmed" })}
                          variant={line.reviewStatus === "confirmed" ? "profit" : "secondary"}
                        >
                          Confirm line
                        </ActionButton>
                        <ActionButton
                          onClick={() => updateLine(line.lineId, { reviewStatus: "ignored" })}
                          variant={line.reviewStatus === "ignored" ? "ghost" : "secondary"}
                        >
                          Ignore line
                        </ActionButton>
                        {line.reviewStatus !== "needs_review" ? (
                          <ActionButton
                            onClick={() => updateLine(line.lineId, { reviewStatus: "needs_review" })}
                            variant="ghost"
                          >
                            Mark for review
                          </ActionButton>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <label className="text-sm text-muted">
                        Quantity
                        <input
                          className="mt-2 w-full rounded-tile border border-border bg-black/20 px-4 py-3 text-text outline-none transition focus:border-accent/40"
                          onChange={(event) =>
                            updateLine(line.lineId, {
                              parsedQuantity: Number(event.target.value)
                            })
                          }
                          step="0.01"
                          type="number"
                          value={line.parsedQuantity}
                        />
                      </label>
                      <label className="text-sm text-muted">
                        Unit
                        <select
                          className="mt-2 w-full rounded-tile border border-border bg-black/20 px-4 py-3 text-text outline-none transition focus:border-accent/40"
                          onChange={(event) =>
                            updateLine(line.lineId, {
                              parsedUnit: event.target.value as InvoiceUnit
                            })
                          }
                          value={line.parsedUnit}
                        >
                          {invoiceUnits.map((unit) => (
                            <option key={unit} value={unit}>
                              {unit}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-sm text-muted">
                        Unit price
                        <input
                          className="mt-2 w-full rounded-tile border border-border bg-black/20 px-4 py-3 text-text outline-none transition focus:border-accent/40"
                          onChange={(event) =>
                            updateLine(line.lineId, {
                              parsedUnitPriceCents:
                                event.target.value.length > 0
                                  ? Math.round(Number(event.target.value) * 100)
                                  : null
                            })
                          }
                          step="0.01"
                          type="number"
                          value={
                            line.parsedUnitPriceCents !== null
                              ? (line.parsedUnitPriceCents / 100).toFixed(2)
                              : ""
                          }
                        />
                      </label>
                      <label className="text-sm text-muted">
                        Matched ingredient
                        <select
                          className="mt-2 w-full rounded-tile border border-border bg-black/20 px-4 py-3 text-text outline-none transition focus:border-accent/40"
                          onChange={(event) =>
                            updateLine(line.lineId, {
                              matchedIngredientId: event.target.value || undefined
                            })
                          }
                          value={line.matchedIngredientId ?? ""}
                        >
                          <option value="">Select ingredient</option>
                          {pageData.ingredients.map((candidate) => (
                            <option key={candidate.id} value={candidate.id}>
                              {candidate.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-4">
                      <Stat label="Previous cost" value={ingredient ? formatEuro(ingredient.costPerUnitCents) : "n/a"} />
                      <Stat
                        label="New cost"
                        value={convertedCost !== null ? formatEuro(convertedCost) : "Review unit"}
                      />
                      <Stat
                        label="Delta"
                        value={
                          typeof liveDeltaPercent === "number"
                            ? `${liveDeltaPercent > 0 ? "+" : ""}${liveDeltaPercent.toFixed(1)}%`
                            : "n/a"
                        }
                      />
                      <Stat label="Line total" value={formatEuro(line.parsedLineTotalCents ?? 0)} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          <div className="space-y-6">
            <Panel>
              <SectionHeader
                description="Cost changes apply only after every required line is either confirmed or ignored."
                eyebrow="Confirm cost updates"
                title="Ready to write current costs"
              />
              <div className="mt-6">
                <MetricStrip
                  items={[
                    { label: "Total lines", value: `${draft.summary.totalLines}` },
                    { label: "Needs review", value: `${draft.summary.needsReviewLineCount}`, tone: draft.summary.needsReviewLineCount > 0 ? "warning" : "profit" },
                    { label: "High confidence", value: `${draft.summary.highConfidenceCount}` },
                    { label: "Low confidence", value: `${draft.summary.lowConfidenceCount}`, tone: draft.summary.lowConfidenceCount > 0 ? "warning" : "default" }
                  ]}
                />
              </div>
              <p className="mt-5 text-sm leading-6 text-muted">{reviewCompletionLabel}</p>
              {confirmError ? <p className="mt-4 text-sm leading-6 text-danger">{confirmError}</p> : null}
              <div className="mt-6 flex flex-wrap gap-3">
                <ActionButton
                  disabled={
                    unresolvedLines ||
                    isConfirming ||
                    reviewLines.length === 0 ||
                    latestConfirmation !== null
                  }
                  onClick={() => void handleConfirmInvoice()}
                  variant="primary"
                >
                  {latestConfirmation
                    ? "Cost updates confirmed"
                    : isConfirming
                      ? "Confirming cost updates..."
                      : "Confirm cost updates"}
                </ActionButton>
                <Link
                  className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-text transition hover:border-accent/40 hover:text-accent"
                  to={{ pathname: "/", search: buildDatasetSearch(selectedDataset.id) }}
                >
                  Return to dashboard
                </Link>
              </div>
            </Panel>

            {latestConfirmation ? (
              <Panel tone="profit">
                <SectionHeader
                  description="The invoice is now confirmed for this scenario. Current ingredient costs and downstream alerts are updated in memory."
                  eyebrow="Confirmation result"
                  title="What changed"
                />
                <div className="mt-6">
                  <MetricStrip
                    items={[
                      { label: "Ingredients updated", value: `${latestConfirmation.confirmationSummary.updatedIngredientCount}` },
                      { label: "Price increases", value: `${latestConfirmation.confirmationSummary.priceIncreaseCount}`, tone: latestConfirmation.confirmationSummary.priceIncreaseCount > 0 ? "warning" : "default" },
                      { label: "Price decreases", value: `${latestConfirmation.confirmationSummary.priceDecreaseCount}`, tone: latestConfirmation.confirmationSummary.priceDecreaseCount > 0 ? "profit" : "default" },
                      { label: "Alerts created", value: `${latestConfirmation.confirmationSummary.alertCount}`, tone: latestConfirmation.confirmationSummary.alertCount > 0 ? "warning" : "default" }
                    ]}
                  />
                </div>
                <p className="mt-5 text-sm leading-6 text-text">
                  {latestConfirmation.confirmationSummary.confirmedLineCount} confirmed lines updated current ingredient costs for {selectedDataset.name}.
                </p>
              </Panel>
            ) : null}

            <Panel>
              <SectionHeader
                description="Confirmed price changes surface as alerts with affected dishes and the next recommended move."
                eyebrow="Alerts preview"
                title="Supplier price alerts"
              />
              <div className="mt-6 space-y-3">
                {alertPreview.length === 0 ? (
                  <StatePanel
                    message="No supplier price alerts yet. Confirm a sample invoice to see cost-change impact."
                    title="No supplier price alerts yet."
                    tone="empty"
                  />
                ) : (
                  alertPreview.map((alert) => (
                    <div key={alert.id} className="rounded-tile border border-border bg-black/20 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <SeverityBadge severity={alert.severity} />
                        <span className="text-xs uppercase tracking-[0.16em] text-muted">
                          {alert.type.replaceAll("_", " ")}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-text">{alert.message}</p>
                      <p className="mt-2 text-sm leading-6 text-muted">{alert.recommendedAction}</p>
                    </div>
                  ))
                )}
              </div>
            </Panel>

            {affectedDishes.length > 0 ? (
              <Panel>
                <SectionHeader
                  description="These dishes use one of the updated ingredients, so their margin moved immediately after confirmation."
                  eyebrow="Affected dishes"
                  title="Where the cost move lands first"
                />
                <div className="mt-6 space-y-3">
                  {affectedDishes.slice(0, 5).map((dish) => (
                    <Link
                      key={dish.dishId}
                      className="block rounded-tile border border-border bg-white/[0.02] p-4 transition hover:border-accent/30"
                      to={{
                        pathname: `/dishes/${dish.dishId}`,
                        search: buildDatasetSearch(selectedDataset.id)
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-text">{dish.name}</p>
                        <span className="text-sm text-muted">{dish.salesVolume} sales</span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-muted">
                        Margin moved from {formatPercent(dish.oldMarginPercent)} to {formatPercent(dish.newMarginPercent)}. Period profit impact {formatEuro(dish.periodProfitImpactCents)}.
                      </p>
                    </Link>
                  ))}
                </div>
              </Panel>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-tile border border-white/8 bg-white/[0.03] p-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 text-lg text-text">{value}</p>
    </div>
  );
}
