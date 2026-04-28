import cors from "cors";
import express from "express";
import multer from "multer";

import {
  simulateDishPriceChange,
  type InvoiceUnit
} from "../../../packages/core/src/index.js";
import { buildAppConfig, buildDeepHealth } from "./config.js";
import {
  createOcrProviderRegistry,
  isAllowedMimeType,
  type OcrProviderRegistry,
  sanitizeUploadedFileName
} from "./ocr/providerRegistry.js";
import {
  OcrProviderExecutionError,
  OcrProviderNotConfiguredError
} from "./ocr/shared.js";
import { createStore } from "./store/storeFactory.js";
import { isValidDatasetImportPayload, sanitizeImportedPayload } from "./store/exportImport.js";
import type { AppStore } from "./store/types.js";

function isPositivePrice(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function parseDatasetId(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function resolveDatasetOrRespond(
  datasetId: string | undefined,
  response: express.Response,
  dataStore: AppStore
) {
  const dataset = dataStore.getResolvedDataset(datasetId);

  if (!dataset) {
    response.status(404).json({ message: `Unknown dataset "${datasetId}".` });
    return null;
  }

  return dataset;
}

function isInvoiceUnit(value: unknown): value is InvoiceUnit {
  return typeof value === "string" && ["g", "ml", "piece", "kg", "l", "pcs", "pack"].includes(value);
}

export interface CreateAppOptions {
  env?: NodeJS.ProcessEnv;
  ocrRegistry?: OcrProviderRegistry;
  store?: AppStore;
}

export function createApp(options: CreateAppOptions = {}) {
  const app = express();
  const dataStore = options.store ?? createStore();
  const ocrRegistry = options.ocrRegistry ?? createOcrProviderRegistry({ env: options.env });
  const defaultOcrProvider = ocrRegistry.getDefaultProvider();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: defaultOcrProvider.maxFileSizeBytes
    }
  });

  app.use(cors());
  app.use(express.json());

  app.get("/health", (_request, response) => {
    response.json({ ok: true, service: "profit-analyzer-api" });
  });

  app.get("/api/health/deep", (_request, response) => {
    response.json(buildDeepHealth(dataStore, ocrRegistry, options.env));
  });

  app.get("/api/app/config", (_request, response) => {
    response.json(buildAppConfig(dataStore, ocrRegistry, options.env));
  });

  app.get("/api/demo/datasets", (_request, response) => {
    response.json(dataStore.getDemoDatasets());
  });

  app.get("/api/ocr/providers", (_request, response) => {
    response.json(ocrRegistry.getProviders());
  });

  app.get("/api/ingredients", (request, response) => {
    const datasetId = parseDatasetId(request.query.dataset);
    if (!resolveDatasetOrRespond(datasetId, response, dataStore)) {
      return;
    }

    response.json(dataStore.getIngredients(datasetId));
  });

  app.get("/api/ingredients/:id/cost-history", (request, response) => {
    const datasetId = parseDatasetId(request.query.dataset);
    if (!resolveDatasetOrRespond(datasetId, response, dataStore)) {
      return;
    }

    const history = dataStore.getIngredientCostHistory(request.params.id, datasetId);
    if (!history) {
      response.status(404).json({ message: "Ingredient not found." });
      return;
    }

    response.json(history);
  });

  app.get("/api/recipes", (request, response) => {
    const datasetId = parseDatasetId(request.query.dataset);
    if (!resolveDatasetOrRespond(datasetId, response, dataStore)) {
      return;
    }

    response.json(dataStore.getRecipes(datasetId));
  });

  app.get("/api/dishes", (request, response) => {
    const datasetId = parseDatasetId(request.query.dataset);
    if (!resolveDatasetOrRespond(datasetId, response, dataStore)) {
      return;
    }

    response.json(dataStore.getDishes(datasetId));
  });

  app.get("/api/suppliers", (request, response) => {
    const datasetId = parseDatasetId(request.query.dataset);
    if (!resolveDatasetOrRespond(datasetId, response, dataStore)) {
      return;
    }

    response.json(dataStore.getSuppliers(datasetId));
  });

  app.get("/api/invoices/samples", (_request, response) => {
    response.json(dataStore.getMockInvoiceSampleSummaries());
  });

  app.get("/api/export", (request, response) => {
    const datasetId = parseDatasetId(request.query.dataset);
    const dataset = resolveDatasetOrRespond(datasetId, response, dataStore);

    if (!dataset) {
      return;
    }

    response.json(dataStore.exportDataset(dataset.id));
  });

  app.post("/api/import", (request, response) => {
    const datasetId = parseDatasetId(request.query.dataset);
    const body = request.body as unknown;
    const seededDatasetIds = new Set(dataStore.listDatasets().map((dataset) => dataset.id));
    const targetDatasetId =
      datasetId ||
      (typeof body === "object" &&
      body !== null &&
      "dataset" in body &&
      typeof body.dataset === "object" &&
      body.dataset !== null &&
      "id" in body.dataset &&
      typeof body.dataset.id === "string"
        ? body.dataset.id
        : undefined);

    if (!isValidDatasetImportPayload(body)) {
      response.status(400).json({ message: "Import payload shape is invalid." });
      return;
    }

    if (targetDatasetId && seededDatasetIds.has(targetDatasetId)) {
      response.status(400).json({
        message: "Import can only target a pilot workspace, not a seeded demo dataset."
      });
      return;
    }

    const sanitizedPayload = sanitizeImportedPayload(body, targetDatasetId);
    response.status(201).json(dataStore.importDataset(sanitizedPayload, targetDatasetId));
  });

  app.post("/api/datasets/:id/reset", (request, response) => {
    const datasetId = request.params.id;
    const summary = dataStore.resetDataset(datasetId);

    if (!summary) {
      response.status(404).json({ message: `Unknown dataset "${datasetId}".` });
      return;
    }

    response.json(summary);
  });

  app.post("/api/invoices/parse-mock", (request, response) => {
    const body = request.body as {
      dataset?: unknown;
      sampleInvoiceId?: unknown;
    };
    const datasetId = parseDatasetId(request.query.dataset ?? body.dataset);
    if (!resolveDatasetOrRespond(datasetId, response, dataStore)) {
      return;
    }

    const sampleInvoiceId = typeof body.sampleInvoiceId === "string" ? body.sampleInvoiceId : undefined;

    if (!sampleInvoiceId) {
      response.status(400).json({ message: "sampleInvoiceId is required." });
      return;
    }

    const parsed = dataStore.parseMockInvoice(sampleInvoiceId, datasetId);

    if (parsed === undefined) {
      response.status(404).json({ message: `Unknown sample invoice "${sampleInvoiceId}".` });
      return;
    }

    response.json(parsed);
  });

  app.post("/api/invoices/manual-draft", (request, response) => {
    const body = request.body as {
      dataset?: unknown;
      supplierName?: unknown;
      invoiceNumber?: unknown;
      invoiceDate?: unknown;
      lines?: unknown;
    };
    const datasetId = parseDatasetId(request.query.dataset ?? body.dataset);
    if (!resolveDatasetOrRespond(datasetId, response, dataStore)) {
      return;
    }

    if (typeof body.supplierName !== "string" || body.supplierName.trim().length === 0) {
      response.status(400).json({ message: "supplierName is required." });
      return;
    }

    if (typeof body.invoiceDate !== "string" || body.invoiceDate.trim().length === 0) {
      response.status(400).json({ message: "invoiceDate is required." });
      return;
    }

    if (!Array.isArray(body.lines) || body.lines.length === 0) {
      response.status(400).json({ message: "At least one invoice line is required." });
      return;
    }

    for (const line of body.lines) {
      const typedLine = line as {
        rawProductName?: unknown;
        parsedQuantity?: unknown;
        parsedUnit?: unknown;
        parsedUnitPriceCents?: unknown;
        parsedLineTotalCents?: unknown;
        matchedIngredientId?: unknown;
      };

      if (
        typeof typedLine.rawProductName !== "string" ||
        typedLine.rawProductName.trim().length === 0 ||
        typeof typedLine.parsedQuantity !== "number" ||
        !Number.isFinite(typedLine.parsedQuantity) ||
        typedLine.parsedQuantity <= 0 ||
        !isInvoiceUnit(typedLine.parsedUnit)
      ) {
        response.status(400).json({
          message: "Each manual invoice line must include product name, quantity, and a valid unit."
        });
        return;
      }

      if (
        typedLine.parsedUnitPriceCents !== undefined &&
        !isPositivePrice(typedLine.parsedUnitPriceCents)
      ) {
        response.status(400).json({ message: "parsedUnitPriceCents must be positive when provided." });
        return;
      }

      if (
        typedLine.parsedLineTotalCents !== undefined &&
        !isPositivePrice(typedLine.parsedLineTotalCents)
      ) {
        response.status(400).json({ message: "parsedLineTotalCents must be positive when provided." });
        return;
      }
    }

    const draft = dataStore.createManualInvoiceDraft(
      {
        supplierName: body.supplierName,
        invoiceNumber: typeof body.invoiceNumber === "string" ? body.invoiceNumber : undefined,
        invoiceDate: body.invoiceDate,
        lines: (body.lines as Array<{
          rawProductName: string;
          parsedQuantity: number;
          parsedUnit: InvoiceUnit;
          parsedUnitPriceCents?: number;
          parsedLineTotalCents?: number;
          matchedIngredientId?: string;
        }>).map((line) => ({
          rawProductName: line.rawProductName,
          parsedQuantity: line.parsedQuantity,
          parsedUnit: line.parsedUnit,
          parsedUnitPriceCents: line.parsedUnitPriceCents,
          parsedLineTotalCents: line.parsedLineTotalCents,
          matchedIngredientId: line.matchedIngredientId
        }))
      },
      datasetId
    );

    if (!draft) {
      response.status(404).json({ message: `Unknown dataset "${datasetId}".` });
      return;
    }

    response.json(draft);
  });

  app.post("/api/ocr/invoices/upload", upload.single("file"), (request, response) => {
    const body = request.body as { dataset?: unknown; provider?: unknown };
    const datasetId = parseDatasetId(request.query.dataset ?? body.dataset);
    if (!resolveDatasetOrRespond(datasetId, response, dataStore)) {
      return;
    }

    const selectedProviderId =
      typeof request.query.provider === "string"
        ? request.query.provider
        : typeof body.provider === "string"
          ? body.provider
          : undefined;
    const provider = ocrRegistry.getProvider(selectedProviderId);

    if (!provider) {
      response.status(400).json({ message: `Unknown OCR provider "${selectedProviderId}".` });
      return;
    }

    const file = request.file;

    if (!file) {
      response.status(400).json({ message: "file is required." });
      return;
    }

    if (!isAllowedMimeType(provider.config, file.mimetype)) {
      response.status(415).json({
        message: `Unsupported file type for ${provider.config.displayName}.`
      });
      return;
    }

    const sanitizedFileName = sanitizeUploadedFileName(file.originalname);

    void ocrRegistry
      .parse(provider.config.id, {
        fileName: sanitizedFileName,
        mimeType: file.mimetype,
        fileSizeBytes: file.size,
        buffer: file.buffer
      })
      .then(({ provider: resolvedProvider, result }) => {
        const draft = dataStore.createOcrDraft(
          {
            providerConfig: resolvedProvider,
            parsedResult: result,
            fileName: sanitizedFileName,
            mimeType: file.mimetype,
            fileSizeBytes: file.size
          },
          datasetId
        );

        if (!draft) {
          response.status(404).json({ message: `Unknown dataset "${datasetId}".` });
          return;
        }

        response.json(draft);
      })
      .catch((error: unknown) => {
        const failureReason =
          error instanceof Error ? error.message : "OCR parse failed.";
        const failedJob = dataStore.createFailedOcrJob(
          {
            providerConfig: provider.config,
            fileName: sanitizedFileName,
            mimeType: file.mimetype,
            fileSizeBytes: file.size,
            failureReason
          },
          datasetId
        );

        if (error instanceof OcrProviderNotConfiguredError) {
          response.status(503).json({
            message: failureReason,
            ocrJob: failedJob
          });
          return;
        }

        if (error instanceof OcrProviderExecutionError) {
          response.status(422).json({
            message: failureReason,
            ocrJob: failedJob
          });
          return;
        }

        response.status(500).json({
          message: failureReason,
          ocrJob: failedJob
        });
      });
  });

  app.get("/api/ocr/jobs", (request, response) => {
    const datasetId = parseDatasetId(request.query.dataset);
    if (!resolveDatasetOrRespond(datasetId, response, dataStore)) {
      return;
    }

    response.json(dataStore.listOcrJobs(datasetId));
  });

  app.get("/api/ocr/jobs/:id", (request, response) => {
    const datasetId = parseDatasetId(request.query.dataset);
    if (!resolveDatasetOrRespond(datasetId, response, dataStore)) {
      return;
    }

    const ocrJob = dataStore.getOcrJob(request.params.id, datasetId);

    if (!ocrJob) {
      response.status(404).json({ message: "OCR job not found." });
      return;
    }

    response.json(ocrJob);
  });

  app.get("/api/invoices/:id", (request, response) => {
    const datasetId = parseDatasetId(request.query.dataset);
    if (!resolveDatasetOrRespond(datasetId, response, dataStore)) {
      return;
    }

    const invoice = dataStore.getInvoice(request.params.id, datasetId);

    if (!invoice) {
      response.status(404).json({ message: "Invoice not found." });
      return;
    }

    response.json(invoice);
  });

  app.post("/api/invoices/:id/review-confirm", (request, response) => {
    const body = request.body as {
      dataset?: unknown;
      supplierId?: unknown;
      invoiceDate?: unknown;
      invoiceNumber?: unknown;
      lines?: unknown;
    };
    const datasetId = parseDatasetId(request.query.dataset ?? body.dataset);
    if (!resolveDatasetOrRespond(datasetId, response, dataStore)) {
      return;
    }

    if (!Array.isArray(body.lines) || body.lines.length === 0) {
      response.status(400).json({ message: "Reviewed invoice lines are required." });
      return;
    }

    for (const line of body.lines) {
      const typedLine = line as {
        lineId?: unknown;
        reviewStatus?: unknown;
        matchedIngredientId?: unknown;
        parsedQuantity?: unknown;
        parsedUnit?: unknown;
        parsedUnitPriceCents?: unknown;
        parsedLineTotalCents?: unknown;
      };

      if (
        typeof typedLine.lineId !== "string" ||
        !["confirmed", "ignored"].includes(String(typedLine.reviewStatus)) ||
        typeof typedLine.parsedQuantity !== "number" ||
        !Number.isFinite(typedLine.parsedQuantity) ||
        typedLine.parsedQuantity <= 0 ||
        !isInvoiceUnit(typedLine.parsedUnit) ||
        !isPositivePrice(typedLine.parsedUnitPriceCents)
      ) {
        response.status(400).json({ message: "Each reviewed line must include valid id, status, quantity, unit, and unit price." });
        return;
      }

      if (
        typedLine.reviewStatus === "confirmed" &&
        (typeof typedLine.matchedIngredientId !== "string" || typedLine.matchedIngredientId.trim().length === 0)
      ) {
        response.status(400).json({ message: "Confirmed lines require matchedIngredientId." });
        return;
      }
    }

    try {
      const result = dataStore.confirmInvoice(request.params.id, datasetId, {
        supplierId: typeof body.supplierId === "string" ? body.supplierId : undefined,
        invoiceDate: typeof body.invoiceDate === "string" ? body.invoiceDate : undefined,
        invoiceNumber: typeof body.invoiceNumber === "string" ? body.invoiceNumber : undefined,
        lines: body.lines as {
          lineId: string;
          reviewStatus: "confirmed" | "ignored";
          matchedIngredientId?: string;
          parsedQuantity: number;
          parsedUnit: InvoiceUnit;
          parsedUnitPriceCents: number;
          parsedLineTotalCents?: number;
        }[]
      });

      if (result === undefined) {
        response.status(404).json({ message: "Invoice not found." });
        return;
      }

      if (result === null) {
        response.status(404).json({ message: `Unknown dataset "${datasetId}".` });
        return;
      }

      response.json({
        confirmationSummary: result.confirmationSummary,
        costHistory: result.costHistory,
        alerts: result.alerts,
        affectedDishes: result.affectedDishes,
        updatedIngredients: result.updatedIngredients
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invoice confirmation failed.";
      const status = message.includes("already been confirmed") ? 409 : 400;
      response.status(status).json({ message });
    }
  });

  app.get("/api/alerts/price-changes", (request, response) => {
    const datasetId = parseDatasetId(request.query.dataset);
    if (!resolveDatasetOrRespond(datasetId, response, dataStore)) {
      return;
    }

    response.json(dataStore.getPriceChangeAlerts(datasetId));
  });

  app.get("/api/analytics/dishes", (request, response) => {
    const datasetId = parseDatasetId(request.query.dataset);
    if (!resolveDatasetOrRespond(datasetId, response, dataStore)) {
      return;
    }

    response.json(dataStore.getCalculatedDishes(datasetId));
  });

  app.get("/api/analytics/overview", (request, response) => {
    const datasetId = parseDatasetId(request.query.dataset);
    if (!resolveDatasetOrRespond(datasetId, response, dataStore)) {
      return;
    }

    response.json(dataStore.getOverview(datasetId));
  });

  app.get("/api/analytics/actions", (request, response) => {
    const datasetId = parseDatasetId(request.query.dataset);
    if (!resolveDatasetOrRespond(datasetId, response, dataStore)) {
      return;
    }

    response.json(dataStore.getAllActions(datasetId));
  });

  app.get("/api/analytics/dish/:id", (request, response) => {
    const datasetId = parseDatasetId(request.query.dataset);
    if (!resolveDatasetOrRespond(datasetId, response, dataStore)) {
      return;
    }

    const detail = dataStore.getDishDetail(request.params.id, datasetId);
    if (!detail) {
      response.status(404).json({ message: "Dish not found." });
      return;
    }

    response.json(detail);
  });

  app.post("/api/simulate/price", (request, response) => {
    const datasetId = parseDatasetId(request.query.dataset);
    const dataset = resolveDatasetOrRespond(datasetId, response, dataStore);

    if (!dataset) {
      return;
    }

    const { dishId, newPriceCents } = request.body as { dishId?: unknown; newPriceCents?: unknown };

    if (typeof dishId !== "string" || dishId.trim().length === 0 || !isPositivePrice(newPriceCents)) {
      response.status(400).json({ message: "dishId is required and newPriceCents must be a positive number." });
      return;
    }

    const ingredients = dataStore.getIngredients(datasetId);
    const recipes = dataStore.getRecipes(datasetId);
    const dishes = dataStore.getDishes(datasetId);

    const dish = dishes?.find((item) => item.id === dishId);
    if (!dish) {
      response.status(404).json({ message: "Dish not found." });
      return;
    }

    const recipe = recipes?.find((item) => item.id === dish.recipeId);
    if (!recipe || !ingredients) {
      response.status(404).json({ message: "Recipe not found." });
      return;
    }

    response.json(simulateDishPriceChange(dish, recipe, ingredients, newPriceCents));
  });

  app.use((error: unknown, _request: express.Request, response: express.Response, next: express.NextFunction) => {
    void next;
    if (isMulterLimitError(error)) {
      response.status(413).json({
        message: "Uploaded file is too large. Keep OCR fixture uploads under 10MB."
      });
      return;
    }

    const message = error instanceof Error ? error.message : "Request failed.";
    response.status(500).json({ message });
  });

  return app;
}

export function isMulterLimitError(error: unknown) {
  return error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE";
}
