import type {
  InvoiceUnit,
  OcrConfidence,
  OcrParsedInvoiceResult,
  OcrParsedLine,
  OcrProviderConfig
} from "../../../../packages/core/src/index.js";
import {
  OcrProviderExecutionError,
  OcrProviderNotConfiguredError,
  type OcrUploadPayload
} from "./shared.js";

const defaultEndpoint = "https://api.openai.com/v1/responses";
const defaultTimeoutMs = 30_000;
const defaultMaxRetries = 1;
const allowedUnits = new Set<InvoiceUnit>(["kg", "g", "l", "ml", "pcs", "pack"]);
const unitMap: Record<string, InvoiceUnit> = {
  kilogram: "kg",
  kilograms: "kg",
  kg: "kg",
  gram: "g",
  grams: "g",
  g: "g",
  litre: "l",
  litres: "l",
  liter: "l",
  liters: "l",
  l: "l",
  millilitre: "ml",
  millilitres: "ml",
  milliliter: "ml",
  milliliters: "ml",
  ml: "ml",
  piece: "pcs",
  pieces: "pcs",
  pc: "pcs",
  pcs: "pcs",
  pack: "pack",
  packs: "pack"
};

export interface ExternalOcrProviderEnv {
  OCR_PROVIDER?: string;
  OCR_PROVIDER_API_KEY?: string;
  OCR_PROVIDER_MODEL?: string;
  OCR_PROVIDER_ENDPOINT?: string;
  OCR_PROVIDER_TIMEOUT_MS?: string;
  OCR_PROVIDER_MAX_RETRIES?: string;
}

export interface ExternalOcrProviderRuntimeConfig {
  apiKey: string;
  endpoint: string;
  maxRetries: number;
  model: string;
  timeoutMs: number;
}

export interface CreateExternalOcrProviderOptions {
  env?: ExternalOcrProviderEnv;
  fetchImpl?: typeof fetch;
}

interface ProviderExtractedLine {
  rawProductName?: unknown;
  quantity?: unknown;
  unit?: unknown;
  unitPriceCents?: unknown;
  lineTotalCents?: unknown;
  confidence?: unknown;
  warnings?: unknown;
}

interface ProviderExtractedInvoice {
  supplierName?: unknown;
  invoiceNumber?: unknown;
  invoiceDate?: unknown;
  totalAmountCents?: unknown;
  confidence?: unknown;
  warnings?: unknown;
  lines?: unknown;
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getWarningList(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function getFiniteNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const normalized = value.trim().replace(",", ".");
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function normalizeConfidence(value: unknown): OcrConfidence {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (normalized === "high" || normalized === "medium" || normalized === "low" || normalized === "none") {
    return normalized;
  }

  return "low";
}

function normalizeDate(value: unknown, warnings: string[]) {
  const dateText = getString(value);
  if (!dateText) {
    return undefined;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
    return dateText;
  }

  const parsed = new Date(dateText);
  if (!Number.isNaN(parsed.valueOf())) {
    warnings.push("Invoice date was normalized into YYYY-MM-DD format.");
    return parsed.toISOString().slice(0, 10);
  }

  warnings.push("Invoice date could not be parsed from provider output.");
  return undefined;
}

function normalizeMoneyToCents(
  value: unknown,
  fieldLabel: string,
  warnings: string[]
) {
  const numeric = getFiniteNumber(value);
  if (numeric === undefined) {
    return undefined;
  }

  if (numeric < 0) {
    warnings.push(`${fieldLabel} was negative and was ignored.`);
    return undefined;
  }

  if (Number.isInteger(numeric)) {
    return numeric;
  }

  warnings.push(`${fieldLabel} was converted from a decimal currency amount into cents.`);
  return Math.round(numeric * 100);
}

function normalizeQuantity(value: unknown, warnings: string[]) {
  const numeric = getFiniteNumber(value);
  if (numeric === undefined) {
    return undefined;
  }

  if (numeric <= 0) {
    warnings.push("Quantity was not positive and requires manual review.");
    return undefined;
  }

  return numeric;
}

function normalizeUnit(value: unknown, warnings: string[]): InvoiceUnit | undefined {
  const unitText = getString(value).toLowerCase();
  const normalized = unitMap[unitText];

  if (normalized && allowedUnits.has(normalized)) {
    return normalized;
  }

  if (unitText.length > 0) {
    warnings.push(`Unsupported unit "${unitText}" from provider output requires review.`);
  }

  return undefined;
}

function normalizeLine(line: ProviderExtractedLine): OcrParsedLine {
  const warnings = getWarningList(line.warnings);
  const rawProductName = getString(line.rawProductName);

  if (!rawProductName) {
    warnings.push("Provider returned a line without a product name.");
  }

  const parsedUnitPrice = normalizeMoneyToCents(
    line.unitPriceCents,
    "Line unit price",
    warnings
  );
  const parsedLineTotal = normalizeMoneyToCents(
    line.lineTotalCents,
    "Line total",
    warnings
  );

  if (parsedUnitPrice === undefined && parsedLineTotal === undefined) {
    warnings.push("Provider line is missing readable price data.");
  }

  return {
    rawProductName: rawProductName || "Unlabeled OCR line",
    quantity: normalizeQuantity(line.quantity, warnings),
    unit: normalizeUnit(line.unit, warnings),
    unitPriceCents: parsedUnitPrice,
    lineTotalCents: parsedLineTotal,
    confidence: normalizeConfidence(line.confidence),
    warnings
  };
}

function extractJsonText(responsePayload: unknown) {
  if (typeof responsePayload === "string") {
    return responsePayload;
  }

  if (!responsePayload || typeof responsePayload !== "object") {
    throw new OcrProviderExecutionError("External OCR provider returned an unreadable response.");
  }

  const payload = responsePayload as Record<string, unknown>;
  if (typeof payload.output_text === "string" && payload.output_text.trim().length > 0) {
    return payload.output_text;
  }

  const output = Array.isArray(payload.output) ? payload.output : [];
  for (const item of output) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const content = Array.isArray((item as { content?: unknown }).content)
      ? ((item as { content: unknown[] }).content)
      : [];

    for (const entry of content) {
      if (!entry || typeof entry !== "object") {
        continue;
      }

      const contentItem = entry as Record<string, unknown>;
      if (typeof contentItem.text === "string" && contentItem.text.trim().length > 0) {
        return contentItem.text;
      }
    }
  }

  throw new OcrProviderExecutionError("External OCR provider did not return extractable JSON text.");
}

export function parseProviderJsonText(jsonText: string): OcrParsedInvoiceResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new OcrProviderExecutionError("External OCR provider returned invalid JSON.");
  }

  return normalizeProviderInvoice(parsed);
}

export function normalizeProviderInvoice(payload: unknown): OcrParsedInvoiceResult {
  if (!payload || typeof payload !== "object") {
    throw new OcrProviderExecutionError("External OCR provider returned invalid invoice data.");
  }

  const invoice = payload as ProviderExtractedInvoice;
  const warnings = getWarningList(invoice.warnings);
  const lines = Array.isArray(invoice.lines)
    ? invoice.lines.map((line) => normalizeLine((line ?? {}) as ProviderExtractedLine))
    : [];

  if (!Array.isArray(invoice.lines)) {
    warnings.push("Provider output did not include a valid line array.");
  }

  const supplierName = getString(invoice.supplierName);
  if (!supplierName) {
    warnings.push("Provider did not detect a supplier name.");
  }

  const invoiceDate = normalizeDate(invoice.invoiceDate, warnings);

  return {
    supplierName: supplierName || undefined,
    invoiceNumber: getString(invoice.invoiceNumber) || undefined,
    invoiceDate,
    totalAmountCents: normalizeMoneyToCents(invoice.totalAmountCents, "Invoice total", warnings),
    confidence: normalizeConfidence(invoice.confidence),
    warnings: [...new Set(warnings)],
    lines
  };
}

export function buildExternalProviderRuntimeConfig(
  env: ExternalOcrProviderEnv = process.env
): ExternalOcrProviderRuntimeConfig | null {
  const provider = getString(env.OCR_PROVIDER);
  const apiKey = getString(env.OCR_PROVIDER_API_KEY);
  const model = getString(env.OCR_PROVIDER_MODEL);
  const endpoint = getString(env.OCR_PROVIDER_ENDPOINT) || defaultEndpoint;
  const timeoutMs = Math.max(1_000, Math.round(getFiniteNumber(env.OCR_PROVIDER_TIMEOUT_MS) ?? defaultTimeoutMs));
  const maxRetries = Math.max(0, Math.round(getFiniteNumber(env.OCR_PROVIDER_MAX_RETRIES) ?? defaultMaxRetries));

  if (provider !== "external_env" || !apiKey || !model) {
    return null;
  }

  return {
    apiKey,
    endpoint,
    maxRetries,
    model,
    timeoutMs
  };
}

export function buildExternalProviderConfig(
  env: ExternalOcrProviderEnv = process.env
): OcrProviderConfig {
  const runtimeConfig = buildExternalProviderRuntimeConfig(env);

  return {
    id: "external_env",
    displayName: "External OCR provider",
    isConfigured: runtimeConfig !== null,
    isDefault: false,
    modelConfigured: getString(env.OCR_PROVIDER_MODEL).length > 0,
    supportsMimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    maxFileSizeBytes: 10 * 1024 * 1024,
    mode: "external"
  };
}

function getProviderErrorMessage(response: Response) {
  if (response.status === 401 || response.status === 403) {
    return "External OCR provider rejected the API credentials.";
  }

  if (response.status === 408 || response.status === 504) {
    return "External OCR provider timed out.";
  }

  if (response.status === 429) {
    return "External OCR provider rate-limited the request.";
  }

  if (response.status >= 500) {
    return "External OCR provider failed while processing the invoice.";
  }

  return `External OCR provider request failed with status ${response.status}.`;
}

async function requestProviderParse(
  payload: OcrUploadPayload,
  config: ExternalOcrProviderRuntimeConfig,
  fetchImpl: typeof fetch
): Promise<unknown> {
  const base64File = payload.buffer.toString("base64");
  const dataUrl = `data:${payload.mimeType};base64,${base64File}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetchImpl(config.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json"
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: config.model,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: [
                  "Extract a restaurant supplier invoice from this image.",
                  "Return strict JSON only.",
                  "Money fields must be integer cents when readable.",
                  "Units must be one of: kg, g, l, ml, pcs, pack.",
                  "Confidence must be one of: high, medium, low, none.",
                  "Use null for missing fields instead of inventing values."
                ].join(" ")
              },
              {
                type: "input_image",
                image_url: dataUrl
              }
            ]
          }
        ],
        max_output_tokens: 2_500,
        text: {
          format: {
            type: "json_schema",
            name: "invoice_extraction",
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                supplierName: { type: ["string", "null"] },
                invoiceNumber: { type: ["string", "null"] },
                invoiceDate: { type: ["string", "null"] },
                totalAmountCents: { type: ["number", "null"] },
                confidence: {
                  type: "string",
                  enum: ["high", "medium", "low", "none"]
                },
                warnings: {
                  type: "array",
                  items: { type: "string" }
                },
                lines: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      rawProductName: { type: "string" },
                      quantity: { type: ["number", "null"] },
                      unit: {
                        type: ["string", "null"],
                        enum: ["kg", "g", "l", "ml", "pcs", "pack", null]
                      },
                      unitPriceCents: { type: ["number", "null"] },
                      lineTotalCents: { type: ["number", "null"] },
                      confidence: {
                        type: "string",
                        enum: ["high", "medium", "low", "none"]
                      },
                      warnings: {
                        type: "array",
                        items: { type: "string" }
                      }
                    },
                    required: [
                      "rawProductName",
                      "quantity",
                      "unit",
                      "unitPriceCents",
                      "lineTotalCents",
                      "confidence",
                      "warnings"
                    ]
                  }
                }
              },
              required: [
                "supplierName",
                "invoiceNumber",
                "invoiceDate",
                "totalAmountCents",
                "confidence",
                "warnings",
                "lines"
              ]
            },
            strict: true
          }
        }
      })
    });

    if (!response.ok) {
      throw new OcrProviderExecutionError(getProviderErrorMessage(response));
    }

    return (await response.json()) as unknown;
  } catch (error) {
    if (
      error instanceof DOMException &&
      (error.name === "AbortError" || error.name === "TimeoutError")
    ) {
      throw new OcrProviderExecutionError("External OCR provider timed out.");
    }

    if (error instanceof OcrProviderExecutionError) {
      throw error;
    }

    throw new OcrProviderExecutionError("External OCR provider request failed.");
  } finally {
    clearTimeout(timeout);
  }
}

export function createExternalOcrProviderAdapter(
  options: CreateExternalOcrProviderOptions = {}
) {
  const env = options.env ?? process.env;
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    config: buildExternalProviderConfig(env),
    async parse(input: OcrUploadPayload): Promise<OcrParsedInvoiceResult> {
      const runtimeConfig = buildExternalProviderRuntimeConfig(env);

      if (!runtimeConfig) {
        throw new OcrProviderNotConfiguredError("external_env");
      }

      let lastError: OcrProviderExecutionError | null = null;

      for (let attempt = 0; attempt <= runtimeConfig.maxRetries; attempt += 1) {
        try {
          const providerResponse = await requestProviderParse(input, runtimeConfig, fetchImpl);
          const jsonText = extractJsonText(providerResponse);
          return parseProviderJsonText(jsonText);
        } catch (error) {
          if (error instanceof OcrProviderExecutionError) {
            lastError = error;
            if (attempt < runtimeConfig.maxRetries) {
              continue;
            }
            throw error;
          }

          throw new OcrProviderExecutionError("External OCR provider request failed.");
        }
      }

      throw lastError ?? new OcrProviderExecutionError("External OCR provider request failed.");
    }
  };
}
