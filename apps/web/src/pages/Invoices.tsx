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
  InvoiceUnit,
  OcrInvoiceDraftResponse,
  OcrInvoiceJob,
  OcrProviderConfig
} from "../types.js";
import { formatEuro } from "../utils/format.js";
import {
  canConfirmInvoiceLine,
  createEditableInvoiceLines,
  createManualInvoiceLineForm,
  getUnresolvedInvoiceLineCount,
  type EditableInvoiceLine,
  type ManualInvoiceLineForm
} from "../utils/invoices.js";
import { buildDatasetSearch, getScenarioMeta } from "../utils/scenario.js";

const invoiceUnits: InvoiceUnit[] = ["g", "kg", "ml", "l", "pcs", "pack", "piece"];
const entryModes = [
  { id: "sample", label: "Sample invoice" },
  { id: "manual", label: "Manual structured entry" },
  { id: "ocr", label: "Photo/OCR Upload" }
] as const;
const allowedOcrMimeTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const maxOcrFileSizeBytes = 10 * 1024 * 1024;

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

const reviewStatusTone = {
  ready: "border-profit/30 bg-profit/10 text-profit",
  confirmed: "border-profit/35 bg-profit/12 text-profit",
  ignored: "border-white/10 bg-white/[0.04] text-muted",
  needs_review: "border-warning/30 bg-warning/10 text-warning"
} as const;

const ocrJobTone = {
  uploaded: "border-white/10 bg-white/[0.04] text-muted",
  queued: "border-accent/30 bg-accent/10 text-accent",
  processing: "border-accent/30 bg-accent/10 text-accent",
  parsed: "border-profit/30 bg-profit/10 text-profit",
  needs_review: "border-warning/30 bg-warning/10 text-warning",
  failed: "border-danger/30 bg-danger/12 text-danger",
  cancelled: "border-white/10 bg-white/[0.03] text-muted"
} as const;

const reviewModeLabel = {
  quick_review: "Quick review",
  careful_review: "Careful review",
  manual_entry_recommended: "Manual entry recommended"
} as const;

function centsFromEuroInput(value: string) {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }

  return Math.round(parsed * 100);
}

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

function getDisplayReviewStatus(
  line: EditableInvoiceLine,
  isInvoiceConfirmed: boolean
): keyof typeof reviewStatusTone {
  if (line.reviewStatus === "ignored") {
    return "ignored";
  }

  if (line.reviewStatus === "needs_review") {
    return "needs_review";
  }

  return isInvoiceConfirmed ? "confirmed" : "ready";
}

function normalizeReviewLine(line: EditableInvoiceLine): EditableInvoiceLine {
  if (line.reviewStatus === "ignored") {
    return line;
  }

  if (canConfirmInvoiceLine(line)) {
    return {
      ...line,
      reviewStatus: "confirmed"
    };
  }

  return {
    ...line,
    reviewStatus: "needs_review"
  };
}

function createInitialManualLines() {
  return [createManualInvoiceLineForm("manual-line-1")];
}

function isOcrDraftResponse(
  draft: InvoiceDraftResponse | OcrInvoiceDraftResponse
): draft is OcrInvoiceDraftResponse {
  return "ocrJob" in draft;
}

export function InvoicesPage() {
  const [searchParams] = useSearchParams();
  const datasetId = searchParams.get("dataset") ?? undefined;
  const previousDatasetId = useRef(datasetId);
  const loadInvoicePage = useCallback(async () => {
    const [datasets, samples, ingredients, suppliers, ocrProviders, ocrJobs] = await Promise.all([
      apiClient.getDemoDatasets(),
      apiClient.getInvoiceSamples(),
      apiClient.getIngredients(datasetId),
      apiClient.getSuppliers(datasetId),
      apiClient.getOcrProviders(),
      apiClient.getOcrJobs(datasetId)
    ]);

    return { datasets, samples, ingredients, suppliers, ocrProviders, ocrJobs };
  }, [datasetId]);
  const page = useAsyncData(loadInvoicePage);
  const [entryMode, setEntryMode] = useState<(typeof entryModes)[number]["id"]>("sample");
  const [selectedSampleId, setSelectedSampleId] = useState("");
  const [manualSupplierName, setManualSupplierName] = useState("");
  const [manualInvoiceNumber, setManualInvoiceNumber] = useState("");
  const [manualInvoiceDate, setManualInvoiceDate] = useState("2026-04-28");
  const [manualLines, setManualLines] = useState<ManualInvoiceLineForm[]>(createInitialManualLines);
  const [draft, setDraft] = useState<(InvoiceDraftResponse | OcrInvoiceDraftResponse) | null>(null);
  const [reviewLines, setReviewLines] = useState<EditableInvoiceLine[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [ocrFile, setOcrFile] = useState<File | null>(null);
  const [selectedOcrProviderId, setSelectedOcrProviderId] = useState<OcrProviderConfig["id"]>("fixture");
  const [ocrJobs, setOcrJobs] = useState<OcrInvoiceJob[]>([]);
  const [latestConfirmation, setLatestConfirmation] = useState<InvoiceConfirmResponse | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [manualError, setManualError] = useState<string | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [datasetResetNotice, setDatasetResetNotice] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isCreatingManualDraft, setIsCreatingManualDraft] = useState(false);
  const [isUploadingOcr, setIsUploadingOcr] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    if (page.data?.samples.length && !selectedSampleId) {
      setSelectedSampleId(page.data.samples[0].id);
    }
  }, [page.data?.samples, selectedSampleId]);

  useEffect(() => {
    if (!page.data) {
      return;
    }

    setOcrJobs(page.data.ocrJobs);
    const defaultProvider =
      page.data.ocrProviders.find((provider) => provider.isDefault) ?? page.data.ocrProviders[0];

    if (defaultProvider) {
      setSelectedOcrProviderId(defaultProvider.id);
    }
  }, [page.data]);

  useEffect(() => {
    if (previousDatasetId.current !== datasetId) {
      if (draft || latestConfirmation) {
        setDraft(null);
        setReviewLines([]);
        setLatestConfirmation(null);
        setConfirmError(null);
        setParseError(null);
        setManualError(null);
        setOcrError(null);
        setOcrFile(null);
        setOcrJobs([]);
        setDatasetResetNotice(
          "Scenario changed. The current invoice draft was cleared so cost updates stay isolated to one restaurant profile."
        );
      }

      previousDatasetId.current = datasetId;
    }
  }, [datasetId, draft, latestConfirmation]);

  const selectedDataset = page.data ? getScenarioMeta(page.data.datasets, datasetId) : undefined;
  const selectedSample = page.data?.samples.find((sample) => sample.id === selectedSampleId);
  const unresolvedLineCount = getUnresolvedInvoiceLineCount(reviewLines);
  const isInvoiceConfirmed = latestConfirmation !== null;
  const ocrDraft = draft && isOcrDraftResponse(draft) ? draft : null;
  const isOcrDraft = ocrDraft !== null;
  const alertPreview = latestConfirmation?.alerts ?? [];
  const affectedDishes = latestConfirmation?.affectedDishes ?? [];
  const confirmationSummary = latestConfirmation?.confirmationSummary;

  const reviewCompletionLabel =
    reviewLines.length === 0
      ? "No invoice loaded yet."
      : unresolvedLineCount > 0
        ? `Resolve or ignore ${unresolvedLineCount} ${isOcrDraft ? "OCR " : ""}lines before confirming.`
        : "All non-ignored lines are ready. Confirming now will update current ingredient costs for this scenario.";

  const confirmDisabled =
    isConfirming || reviewLines.length === 0 || unresolvedLineCount > 0 || isInvoiceConfirmed;

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
  const selectedOcrProvider =
    pageData.ocrProviders.find((provider) => provider.id === selectedOcrProviderId) ??
    pageData.ocrProviders[0];

  function loadDraft(parsed: InvoiceDraftResponse | OcrInvoiceDraftResponse) {
    setDraft(parsed);
    setReviewLines(createEditableInvoiceLines(parsed.lines));
    setSupplierId(parsed.supplierSuggestion.supplierId ?? parsed.invoiceDraft.supplierId);
    setInvoiceDate(parsed.invoiceDraft.invoiceDate);
    setInvoiceNumber(parsed.invoiceDraft.invoiceNumber ?? "");
    setLatestConfirmation(null);
  }

  async function handleOpenStoredInvoice(invoiceId: string) {
    setParseError(null);
    setManualError(null);
    setOcrError(null);

    try {
      const invoice = await apiClient.getInvoice(invoiceId, datasetId);
      if (invoice.ocrJob && invoice.ocrResult && invoice.qualityReport) {
        loadDraft({
          invoiceDraft: invoice.invoice,
          supplierSuggestion: invoice.supplierSuggestion,
          lines: invoice.lines,
          summary: invoice.summary,
          ocrJob: invoice.ocrJob,
          ocrResult: invoice.ocrResult,
          qualityReport: invoice.qualityReport,
          providerConfig:
            pageData.ocrProviders.find((provider) => provider.id === invoice.ocrJob?.provider) ??
            selectedOcrProvider
        } satisfies OcrInvoiceDraftResponse);
        return;
      }

      loadDraft({
        invoiceDraft: invoice.invoice,
        supplierSuggestion: invoice.supplierSuggestion,
        lines: invoice.lines,
        summary: invoice.summary
      } satisfies InvoiceDraftResponse);
    } catch (reason) {
      setOcrError(reason instanceof Error ? reason.message : "Failed to open OCR draft.");
    }
  }

  async function handleParseInvoice() {
    if (!selectedSampleId) {
      return;
    }

    setIsParsing(true);
    setParseError(null);
    setConfirmError(null);
    setManualError(null);
    setOcrError(null);
    setDatasetResetNotice(null);

    try {
      const parsed = await apiClient.parseMockInvoiceSample(selectedSampleId, datasetId);
      loadDraft(parsed);
    } catch (reason) {
      setDraft(null);
      setReviewLines([]);
      setLatestConfirmation(null);
      setParseError(reason instanceof Error ? reason.message : "Failed to parse invoice sample.");
    } finally {
      setIsParsing(false);
    }
  }

  async function handleCreateManualDraft() {
    setIsCreatingManualDraft(true);
    setManualError(null);
    setConfirmError(null);
    setParseError(null);
    setOcrError(null);
    setDatasetResetNotice(null);

    try {
      const parsed = await apiClient.createManualInvoiceDraft(
        {
          supplierName: manualSupplierName,
          invoiceNumber: manualInvoiceNumber || undefined,
          invoiceDate: manualInvoiceDate,
          lines: manualLines.map((line) => ({
            rawProductName: line.rawProductName,
            parsedQuantity: Number(line.parsedQuantity),
            parsedUnit: line.parsedUnit,
            parsedUnitPriceCents: centsFromEuroInput(line.parsedUnitPrice),
            parsedLineTotalCents: centsFromEuroInput(line.parsedLineTotal),
            matchedIngredientId: line.matchedIngredientId || undefined
          }))
        },
        datasetId
      );

      loadDraft(parsed);
    } catch (reason) {
      setManualError(reason instanceof Error ? reason.message : "Failed to create manual invoice draft.");
    } finally {
      setIsCreatingManualDraft(false);
    }
  }

  function handleOcrFileChange(file: File | null) {
    setOcrFile(null);
    setOcrError(null);

    if (!file) {
      return;
    }

    if (!allowedOcrMimeTypes.includes(file.type)) {
      setOcrError("Unsupported file type. Use JPEG, PNG, WEBP, or PDF for invoice OCR draft creation.");
      return;
    }

    if (file.size > maxOcrFileSizeBytes) {
      setOcrError(`File is too large. Keep invoice uploads under ${Math.round(maxOcrFileSizeBytes / (1024 * 1024))}MB.`);
      return;
    }

    setOcrFile(file);
  }

  async function handleUploadOcrDraft() {
    if (!ocrFile) {
      return;
    }

    setIsUploadingOcr(true);
    setOcrError(null);
    setConfirmError(null);
    setParseError(null);
    setManualError(null);
    setDatasetResetNotice(null);

    try {
      const parsed = await apiClient.uploadOcrInvoice(
        ocrFile,
        datasetId,
        selectedOcrProvider?.id
      );
      loadDraft(parsed);
      setOcrJobs((current) => [parsed.ocrJob, ...current.filter((job) => job.id !== parsed.ocrJob.id)]);
    } catch (reason) {
      setDraft(null);
      setReviewLines([]);
      setLatestConfirmation(null);
      setOcrError(reason instanceof Error ? reason.message : "Failed to create OCR review draft.");
      try {
        const refreshedJobs = await apiClient.getOcrJobs(datasetId);
        setOcrJobs(refreshedJobs);
      } catch {
        // Preserve the original OCR error message if job refresh also fails.
      }
    } finally {
      setIsUploadingOcr(false);
    }
  }

  async function handleRetryOcrJob(jobId: string) {
    setOcrError(null);

    try {
      const parsed = await apiClient.retryOcrJob(jobId, datasetId);
      loadDraft(parsed);
      setOcrJobs((current) => [parsed.ocrJob, ...current.filter((job) => job.id !== parsed.ocrJob.id)]);
    } catch (reason) {
      setOcrError(reason instanceof Error ? reason.message : "Failed to retry OCR job.");
      try {
        setOcrJobs(await apiClient.getOcrJobs(datasetId));
      } catch {
        // Preserve the retry error if job refresh also fails.
      }
    }
  }

  async function handleCancelOcrJob(jobId: string) {
    setOcrError(null);

    try {
      const response = await apiClient.cancelOcrJob(jobId, datasetId);
      setOcrJobs((current) => current.map((job) => (job.id === response.ocrJob.id ? response.ocrJob : job)));
    } catch (reason) {
      setOcrError(reason instanceof Error ? reason.message : "Failed to cancel OCR job.");
    }
  }

  function addManualLine() {
    setManualLines((current) => [
      ...current,
      createManualInvoiceLineForm(`manual-line-${current.length + 1}`)
    ]);
  }

  function removeManualLine(lineId: string) {
    setManualLines((current) =>
      current.length === 1 ? current : current.filter((line) => line.id !== lineId)
    );
  }

  function updateManualLine(lineId: string, patch: Partial<ManualInvoiceLineForm>) {
    setManualLines((current) =>
      current.map((line) => (line.id === lineId ? { ...line, ...patch } : line))
    );
  }

  function updateLine(lineId: string, patch: Partial<EditableInvoiceLine>) {
    setReviewLines((current) =>
      current.map((line) =>
        line.lineId === lineId ? normalizeReviewLine({ ...line, ...patch }) : line
      )
    );
  }

  function confirmReadyLines() {
    setReviewLines((current) => current.map((line) => normalizeReviewLine(line)));
  }

  async function handleConfirmInvoice() {
    if (!draft || confirmDisabled) {
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
              line.reviewStatus === "ignored" ? undefined : line.matchedIngredientId,
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
                Sample, manual, and RM8 adapter uploads all stop at review. Nothing updates current costs until you confirm.
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
          description="Turn supplier invoices into confirmed ingredient cost updates, cost-history entries, price-change alerts, and affected-dish margin impact."
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
          description="Use repeatable sample invoices for demo flow, enter a structured invoice manually, or create an RM8 OCR review draft from an uploaded file."
          eyebrow="Draft source"
          title="Choose how to start the review"
        />

        <div className="mt-6 flex flex-wrap gap-3">
          {entryModes.map((mode) => (
            <button
              key={mode.id}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                entryMode === mode.id
                  ? "border-accent/40 bg-accent/10 text-accent"
                  : "border-white/10 bg-white/[0.03] text-muted hover:text-text"
              }`}
              onClick={() => setEntryMode(mode.id)}
              type="button"
            >
              {mode.label}
            </button>
          ))}
        </div>

        {entryMode === "sample" ? (
          <>
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
          </>
        ) : entryMode === "manual" ? (
          <>
            <div className="mt-6 grid gap-4 xl:grid-cols-3">
              <label className="text-sm text-muted">
                Supplier
                <input
                  className="mt-2 w-full rounded-tile border border-border bg-black/20 px-4 py-3 text-text outline-none transition focus:border-accent/40"
                  onChange={(event) => setManualSupplierName(event.target.value)}
                  placeholder="Supplier name"
                  type="text"
                  value={manualSupplierName}
                />
              </label>
              <label className="text-sm text-muted">
                Invoice number
                <input
                  className="mt-2 w-full rounded-tile border border-border bg-black/20 px-4 py-3 text-text outline-none transition focus:border-accent/40"
                  onChange={(event) => setManualInvoiceNumber(event.target.value)}
                  placeholder="Optional invoice number"
                  type="text"
                  value={manualInvoiceNumber}
                />
              </label>
              <label className="text-sm text-muted">
                Invoice date
                <input
                  className="mt-2 w-full rounded-tile border border-border bg-black/20 px-4 py-3 text-text outline-none transition focus:border-accent/40"
                  onChange={(event) => setManualInvoiceDate(event.target.value)}
                  type="date"
                  value={manualInvoiceDate}
                />
              </label>
            </div>

            <div className="mt-6 space-y-4">
              {manualLines.map((line, index) => (
                <div key={line.id} className="rounded-panel border border-border bg-black/20 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
                        Manual line {index + 1}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-muted">
                        Enter the structured line now. The draft will still go through review-confirm before any ingredient cost updates apply.
                      </p>
                    </div>
                    <ActionButton
                      disabled={manualLines.length === 1}
                      onClick={() => removeManualLine(line.id)}
                      variant="ghost"
                    >
                      Remove line
                    </ActionButton>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <label className="text-sm text-muted">
                      Product name
                      <input
                        className="mt-2 w-full rounded-tile border border-border bg-black/20 px-4 py-3 text-text outline-none transition focus:border-accent/40"
                        onChange={(event) =>
                          updateManualLine(line.id, { rawProductName: event.target.value })
                        }
                        placeholder="Raw supplier product name"
                        type="text"
                        value={line.rawProductName}
                      />
                    </label>
                    <label className="text-sm text-muted">
                      Quantity
                      <input
                        className="mt-2 w-full rounded-tile border border-border bg-black/20 px-4 py-3 text-text outline-none transition focus:border-accent/40"
                        onChange={(event) =>
                          updateManualLine(line.id, { parsedQuantity: event.target.value })
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
                          updateManualLine(line.id, {
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
                      Matched ingredient
                      <select
                        className="mt-2 w-full rounded-tile border border-border bg-black/20 px-4 py-3 text-text outline-none transition focus:border-accent/40"
                        onChange={(event) =>
                          updateManualLine(line.id, {
                            matchedIngredientId: event.target.value
                          })
                        }
                        value={line.matchedIngredientId}
                      >
                        <option value="">Auto match in review</option>
                        {pageData.ingredients.map((ingredient) => (
                          <option key={ingredient.id} value={ingredient.id}>
                            {ingredient.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-2">
                    <label className="text-sm text-muted">
                      Unit price
                      <input
                        className="mt-2 w-full rounded-tile border border-border bg-black/20 px-4 py-3 text-text outline-none transition focus:border-accent/40"
                        onChange={(event) =>
                          updateManualLine(line.id, { parsedUnitPrice: event.target.value })
                        }
                        placeholder="Leave blank if only line total is known"
                        step="0.01"
                        type="number"
                        value={line.parsedUnitPrice}
                      />
                    </label>
                    <label className="text-sm text-muted">
                      Line total
                      <input
                        className="mt-2 w-full rounded-tile border border-border bg-black/20 px-4 py-3 text-text outline-none transition focus:border-accent/40"
                        onChange={(event) =>
                          updateManualLine(line.id, { parsedLineTotal: event.target.value })
                        }
                        placeholder="Optional if unit price is known"
                        step="0.01"
                        type="number"
                        value={line.parsedLineTotal}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <ActionButton onClick={addManualLine} variant="secondary">
                Add line
              </ActionButton>
              <ActionButton disabled={isCreatingManualDraft} onClick={() => void handleCreateManualDraft()} variant="primary">
                {isCreatingManualDraft ? "Creating manual draft..." : "Create manual draft"}
              </ActionButton>
            </div>
            {manualError ? <p className="mt-4 text-sm leading-6 text-danger">{manualError}</p> : null}
          </>
        ) : (
          <>
            <div className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <Panel className="rounded-panel border border-border bg-black/20 p-5">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted">RM8 adapter mode</p>
                <h2 className="mt-3 font-display text-3xl text-text">Photo/OCR upload creates a draft only</h2>
                <p className="mt-3 text-sm leading-6 text-muted">
                  Upload a file to simulate OCR intake. The adapter returns a review draft, not a confirmed invoice. Low-confidence lines stay blocked until you resolve or ignore them.
                </p>
                <div className="mt-5 rounded-tile border border-warning/25 bg-warning/10 p-4">
                  <p className="text-sm leading-6 text-text">
                    OCR is only a draft. Review is required before ingredient costs change.
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    Treat OCR as a starting point, not a source of truth.
                  </p>
                </div>
                <label className="mt-5 block text-sm text-muted">
                  OCR provider
                  <select
                    className="mt-2 w-full rounded-tile border border-border bg-black/20 px-4 py-3 text-text outline-none transition focus:border-accent/40"
                    onChange={(event) =>
                      setSelectedOcrProviderId(event.target.value as OcrProviderConfig["id"])
                    }
                    value={selectedOcrProvider?.id ?? "fixture"}
                  >
                    {pageData.ocrProviders.map((provider) => (
                      <option
                        disabled={provider.id === "external_env" && !provider.isConfigured}
                        key={provider.id}
                        value={provider.id}
                      >
                        {provider.displayName}
                        {provider.isConfigured ? "" : " (not configured)"}
                      </option>
                    ))}
                  </select>
                </label>
                {selectedOcrProvider ? (
                  <div className="mt-4 rounded-tile border border-white/8 bg-white/[0.02] p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-muted">
                        {selectedOcrProvider.mode}
                      </span>
                      <span
                        className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.16em] ${
                          selectedOcrProvider.isConfigured
                            ? "border-profit/30 bg-profit/10 text-profit"
                            : "border-warning/30 bg-warning/10 text-warning"
                        }`}
                      >
                        {selectedOcrProvider.isConfigured ? "Configured" : "Not configured"}
                      </span>
                      {selectedOcrProvider.isDefault ? (
                        <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-accent">
                          Default
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-text">
                      Allowed files: {selectedOcrProvider.supportsMimeTypes.join(", ")}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted">
                      Max file size {Math.round(selectedOcrProvider.maxFileSizeBytes / (1024 * 1024))}MB.
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted">
                      {selectedOcrProvider.id === "fixture"
                        ? "Development fixture OCR stays local and deterministic for demo-safe draft creation."
                        : selectedOcrProvider.isConfigured
                          ? "Creates review drafts only. Confirmation still required before ingredient costs change."
                          : "Configure OCR_PROVIDER_API_KEY and OCR_PROVIDER_MODEL on the API server to enable."}
                    </p>
                  </div>
                ) : null}
                <label className="mt-5 block text-sm text-muted">
                  Choose file
                  <input
                    accept="image/*,application/pdf"
                    capture="environment"
                    className="mt-2 block w-full rounded-tile border border-border bg-black/20 px-4 py-3 text-text file:mr-4 file:rounded-full file:border-0 file:bg-accent/15 file:px-4 file:py-2 file:text-sm file:font-medium file:text-accent"
                    onChange={(event) => handleOcrFileChange(event.target.files?.[0] ?? null)}
                    type="file"
                  />
                </label>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <ActionButton
                    disabled={!ocrFile || isUploadingOcr || !selectedOcrProvider?.isConfigured}
                    onClick={() => void handleUploadOcrDraft()}
                    variant="primary"
                  >
                    {isUploadingOcr ? "Creating OCR review draft..." : "Create review draft"}
                  </ActionButton>
                  <p className="text-sm leading-6 text-muted">
                    {selectedOcrProvider?.id === "fixture"
                      ? "Upload creates a review draft. Costs update only after confirmation. Fixture names: `clean-invoice-photo.jpg`, `blurry-invoice-photo.jpg`, or `cropped-invoice-photo.jpg`."
                      : selectedOcrProvider?.isConfigured
                        ? "External OCR creates review drafts only. Ingredient costs update only after review-confirm."
                        : "External OCR stays disabled until environment configuration is present."}
                  </p>
                </div>
                {ocrFile ? (
                  <p className="mt-4 text-sm leading-6 text-text">
                    Selected {ocrFile.name} · {ocrFile.type || "unknown type"} · {Math.max(1, Math.round(ocrFile.size / 1024))} KB
                  </p>
                ) : null}
                {ocrError ? <p className="mt-4 text-sm leading-6 text-danger">{ocrError}</p> : null}
              </Panel>

              <Panel className="rounded-panel border border-white/8 bg-white/[0.02] p-5">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Latest OCR jobs</p>
                <div className="mt-5 space-y-4">
                  {ocrJobs.length === 0 ? (
                    <StatePanel
                      message="No OCR jobs yet. Upload a fixture file to create a draft and inspect the quality gate."
                      title="No OCR jobs yet"
                      tone="empty"
                    />
                  ) : (
                    ocrJobs.slice(0, 4).map((job) => (
                      <div key={job.id} className="rounded-tile border border-white/10 bg-black/20 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.16em] ${ocrJobTone[job.status]}`}>
                            {job.status.replaceAll("_", " ")}
                          </span>
                          <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-muted">
                            {job.providerDisplayName ?? job.provider}
                          </span>
                          {job.qualityReport ? (
                            <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-accent">
                              {reviewModeLabel[job.qualityReport.recommendedReviewMode]}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-3 text-sm leading-6 text-text">{job.originalFileName}</p>
                        {job.failureReason ? (
                          <p className="mt-2 text-sm leading-6 text-danger">{job.failureReason}</p>
                        ) : null}
                        {job.invoiceDraftId ? (
                          <button
                            className="mt-3 inline-flex text-sm font-medium text-accent"
                            onClick={() => void handleOpenStoredInvoice(job.invoiceDraftId!)}
                            type="button"
                          >
                            Open draft {job.invoiceDraftId}
                          </button>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-3">
                          {job.status === "failed" ? (
                            <button
                              className="inline-flex rounded-full border border-accent/30 px-4 py-2 text-sm font-medium text-accent"
                              onClick={() => void handleRetryOcrJob(job.id)}
                              type="button"
                            >
                              Retry OCR job
                            </button>
                          ) : null}
                          {["uploaded", "queued", "processing", "failed"].includes(job.status) ? (
                            <button
                              className="inline-flex rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-muted"
                              onClick={() => void handleCancelOcrJob(job.id)}
                              type="button"
                            >
                              Cancel job
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <p className="mt-6 text-[11px] uppercase tracking-[0.18em] text-muted">Fixture behavior</p>
                <div className="mt-4 space-y-4">
                  <div className="rounded-tile border border-profit/20 bg-profit/10 p-4">
                    <p className="font-medium text-text">Clean fixture</p>
                    <p className="mt-2 text-sm leading-6 text-muted">
                      Mostly high-confidence lines. Quality gate should mark this as quick review.
                    </p>
                  </div>
                  <div className="rounded-tile border border-warning/20 bg-warning/10 p-4">
                    <p className="font-medium text-text">Blurry fixture</p>
                    <p className="mt-2 text-sm leading-6 text-muted">
                      Includes low-confidence and missing-price lines. Confirmation stays blocked until you resolve or ignore them.
                    </p>
                  </div>
                  <div className="rounded-tile border border-white/10 bg-black/20 p-4">
                    <p className="font-medium text-text">Cropped fixture</p>
                    <p className="mt-2 text-sm leading-6 text-muted">
                      Header data is incomplete, but the adapter still creates a safe draft with warnings and careful review mode.
                    </p>
                  </div>
                </div>
              </Panel>
            </div>
          </>
        )}
      </Panel>

      {draft ? (
        <section className="grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
          <Panel>
            <SectionHeader
              description={
                isOcrDraft
                  ? "OCR created this draft. Confirm the supplier, inspect every parsed line, and resolve low-confidence OCR output before current ingredient costs are updated."
                  : "Confirm the supplier, inspect every parsed line, and resolve low-confidence matches before current ingredient costs are updated."
              }
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
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
                  {isOcrDraft ? "OCR draft status" : "Parse status"}
                </p>
                <p className="mt-2 font-medium capitalize text-text">
                  {draft.invoiceDraft.parseStatus.replaceAll("_", " ")}
                </p>
                <p className="mt-3 text-sm leading-6 text-muted">
                  {reviewCompletionLabel}
                </p>
              </Panel>
            </div>

            {ocrDraft ? (
              <div className="mt-4 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                <Panel className="rounded-tile p-4" tone="subtle">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted">OCR job</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-accent">
                      {ocrDraft.providerConfig.displayName}
                    </span>
                    <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.16em] ${ocrJobTone[ocrDraft.ocrJob.status]}`}>
                      {ocrDraft.ocrJob.status.replaceAll("_", " ")}
                    </span>
                    <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.16em] ${confidenceTone[ocrDraft.ocrResult.confidence]}`}>
                      {confidenceLabel[ocrDraft.ocrResult.confidence]}
                    </span>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-muted">
                      {reviewModeLabel[ocrDraft.qualityReport.recommendedReviewMode]}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-text">
                    Source file: {ocrDraft.ocrJob.originalFileName}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    OCR is only a draft. No ingredient costs move until review-confirm succeeds.
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    Low-confidence rows need correction or ignore before saving.
                  </p>
                </Panel>
                <Panel className="rounded-tile p-4" tone="subtle">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted">OCR quality gate</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <Stat label="Lines" value={`${ocrDraft.qualityReport.lineCount}`} />
                    <Stat label="Needs review" value={`${ocrDraft.qualityReport.unresolvedLineCount}`} />
                    <Stat label="Missing prices" value={`${ocrDraft.qualityReport.missingPricesCount}`} />
                    <Stat label="Unknown products" value={`${ocrDraft.qualityReport.unknownProductCount}`} />
                    <Stat
                      label="Unresolved rate"
                      value={
                        ocrDraft.qualityReport.unresolvedLineRate === undefined
                          ? "n/a"
                          : `${Math.round(ocrDraft.qualityReport.unresolvedLineRate * 100)}%`
                      }
                    />
                    <Stat
                      label="Review burden"
                      value={
                        ocrDraft.qualityReport.reviewBurdenScore === undefined
                          ? "n/a"
                          : `${ocrDraft.qualityReport.reviewBurdenScore}/100`
                      }
                    />
                  </div>
                  <p className="mt-4 text-sm leading-6 text-text">
                    Recommended mode: {reviewModeLabel[ocrDraft.qualityReport.recommendedReviewMode]}.
                  </p>
                  <div className="mt-3 space-y-2">
                    {[...ocrDraft.qualityReport.warnings, ...(ocrDraft.qualityReport.policyWarnings ?? [])].map((warning: string) => (
                      <p key={warning} className="text-sm leading-6 text-warning">
                        {warning}
                      </p>
                    ))}
                  </div>
                </Panel>
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <ActionButton onClick={confirmReadyLines} variant="secondary">
                Confirm ready lines
              </ActionButton>
              <p className="text-sm leading-6 text-muted">
                Problem lines stay open until they are resolved or ignored.
              </p>
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
                const displayStatus = getDisplayReviewStatus(line, isInvoiceConfirmed);

                return (
                  <div
                    key={line.lineId}
                    className={`rounded-panel border p-5 ${
                      displayStatus === "needs_review"
                        ? "border-warning/30 bg-warning/[0.08]"
                        : displayStatus === "ignored"
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
                            className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${reviewStatusTone[displayStatus]}`}
                          >
                            {displayStatus.replaceAll("_", " ")}
                          </span>
                          {displayStatus === "needs_review" ? (
                            <span className="inline-flex rounded-full border border-danger/30 bg-danger/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-danger">
                              Requires action
                            </span>
                          ) : null}
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
                        {typeof liveDeltaPercent === "number" && liveDeltaPercent >= 15 ? (
                          <p className="mt-3 text-sm leading-6 text-danger">
                            Cost jump warning: this line is up {liveDeltaPercent.toFixed(1)}% versus the current ingredient cost.
                          </p>
                        ) : null}
                        {ingredient && convertedCost === null ? (
                          <p className="mt-3 text-sm leading-6 text-warning">
                            Unit mismatch: adjust the invoice unit or ingredient match before confirming.
                          </p>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <ActionButton
                          onClick={() => updateLine(line.lineId, { reviewStatus: "confirmed" })}
                          variant={displayStatus === "ready" ? "profit" : "secondary"}
                        >
                          {displayStatus === "confirmed" ? "Confirmed" : "Confirm line"}
                        </ActionButton>
                        <ActionButton
                          onClick={() => updateLine(line.lineId, { reviewStatus: "ignored" })}
                          variant={displayStatus === "ignored" ? "ghost" : "secondary"}
                        >
                          Ignore line
                        </ActionButton>
                        {displayStatus !== "needs_review" ? (
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

          <div className="space-y-6 xl:sticky xl:top-4 xl:self-start">
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
                    {
                      label: "Needs review",
                      value: `${unresolvedLineCount}`,
                      tone: unresolvedLineCount > 0 ? "warning" : "profit"
                    },
                    { label: "High confidence", value: `${draft.summary.highConfidenceCount}` },
                    {
                      label: "Low confidence",
                      value: `${draft.summary.lowConfidenceCount}`,
                      tone: draft.summary.lowConfidenceCount > 0 ? "warning" : "default"
                    }
                  ]}
                />
              </div>
              <p className="mt-5 text-sm leading-6 text-muted">{reviewCompletionLabel}</p>
              {confirmError ? <p className="mt-4 text-sm leading-6 text-danger">{confirmError}</p> : null}
              <div className="mt-6 flex flex-wrap gap-3">
                <ActionButton disabled={confirmDisabled} onClick={() => void handleConfirmInvoice()} variant="primary">
                  {isInvoiceConfirmed
                    ? "Cost updates confirmed"
                    : isConfirming
                      ? "Confirming cost updates..."
                      : "Confirm cost updates"}
                </ActionButton>
                <Link
                  className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-text transition hover:border-accent/40 hover:text-accent"
                  to={{ pathname: "/alerts", search: buildDatasetSearch(selectedDataset.id) }}
                >
                  View supplier alerts
                </Link>
              </div>
            </Panel>

            {latestConfirmation ? (
              <Panel tone="profit">
                <SectionHeader
                  description="The invoice is now confirmed for this scenario. Current ingredient costs, cost history, and downstream alerts are updated in memory."
                  eyebrow="Confirmation result"
                  title="What changed"
                />
                <div className="mt-6">
                  <MetricStrip
                    items={[
                      { label: "Ingredients updated", value: `${confirmationSummary?.updatedIngredientCount ?? 0}` },
                      {
                        label: "Price increases",
                        value: `${confirmationSummary?.priceIncreaseCount ?? 0}`,
                        tone: (confirmationSummary?.priceIncreaseCount ?? 0) > 0 ? "warning" : "default"
                      },
                      {
                        label: "Price decreases",
                        value: `${confirmationSummary?.priceDecreaseCount ?? 0}`,
                        tone: (confirmationSummary?.priceDecreaseCount ?? 0) > 0 ? "profit" : "default"
                      },
                      { label: "Alerts created", value: `${confirmationSummary?.alertCount ?? 0}` }
                    ]}
                  />
                </div>
                <p className="mt-5 text-sm leading-6 text-text">
                  {confirmationSummary?.confirmedLineCount ?? 0} confirmed lines updated current ingredient costs for {selectedDataset.name}.
                </p>
                {affectedDishes.length > 0 ? (
                  <div className="mt-5 space-y-3">
                    {affectedDishes.slice(0, 3).map((dish) => (
                      <Link
                        key={dish.dishId}
                        className="block rounded-tile border border-profit/15 bg-black/20 p-4 transition hover:border-accent/30"
                        to={{
                          pathname: `/dishes/${dish.dishId}`,
                          search: buildDatasetSearch(selectedDataset.id)
                        }}
                      >
                        <p className="font-medium text-text">{dish.name}</p>
                        <p className="mt-2 text-sm leading-6 text-muted">
                          Margin moved from {dish.oldMarginPercent.toFixed(1)}% to {dish.newMarginPercent.toFixed(1)}%.
                        </p>
                      </Link>
                    ))}
                  </div>
                ) : null}
              </Panel>
            ) : null}

            <Panel>
              <SectionHeader
                aside={
                  <Link className="text-sm font-medium text-accent" to={{ pathname: "/alerts", search: buildDatasetSearch(selectedDataset.id) }}>
                    Open all alerts
                  </Link>
                }
                description="Confirmed price changes surface as alerts with affected dishes and the next recommended move."
                eyebrow="Alerts preview"
                title="Supplier price alerts"
              />
              <div className="mt-6 space-y-3">
                {alertPreview.length === 0 ? (
                  <StatePanel
                    message="No supplier price alerts yet. Confirm a sample or manual invoice to see cost-change impact."
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
                      {typeof alert.deltaPercent === "number" ? (
                        <p className="mt-3 text-sm leading-6 text-warning">
                          Supplier delta {alert.deltaPercent > 0 ? "+" : ""}
                          {alert.deltaPercent.toFixed(1)}%
                        </p>
                      ) : null}
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
                        Period profit impact {formatEuro(dish.periodProfitImpactCents)}.
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
