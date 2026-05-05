import cors from "cors";
import express from "express";
import multer from "multer";

import {
  listDemoDatasets,
  simulateDishPriceChange,
  type IngredientUnit,
  type InvoiceUnit,
  type UploadStorageObject
} from "../../../packages/core/src/index.js";
import { buildAppConfig, buildDeepHealth, buildReadiness } from "./config.js";
import { createAuditService } from "./audit/service.js";
import { createBillingProvider } from "./billing/provider.js";
import { createAuthService, DevAuthUnavailableError } from "./auth/service.js";
import {
  getRequestAuthContext,
  requireAccess,
  resolveScopedDatasetId,
  readBearerToken
} from "./auth/middleware.js";
import { normalizeErrorBody } from "./http/errors.js";
import {
  attachRequestId,
  createLogger,
  createRequestLogger,
  getRequestId,
  logApiError
} from "./logging/logger.js";
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
import {
  sanitizeImportedPayload,
  validateDatasetImportPayload
} from "./store/exportImport.js";
import { getCorsOrigin, getNodeEnv } from "./runtime/profile.js";
import { normalizeRecipeIngredientEntries } from "./store/validation.js";
import { createUploadStorage } from "./uploads/storage.js";
import type { AppStore, OnboardingStepId } from "./store/types.js";
import type { AuthService } from "./auth/service.js";

function isPositivePrice(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function parseDatasetId(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function getRouteParam(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  if (Array.isArray(value)) {
    const first = value.find((item) => item.trim().length > 0);
    return first;
  }

  return undefined;
}

function getScopedDatasetId(
  request: express.Request,
  requestedDatasetId: string | undefined,
  response: express.Response
) {
  const scoped = resolveScopedDatasetId(request, requestedDatasetId);
  if (scoped === "forbidden") {
    response.status(403).json({ message: "You do not have access to that workspace context." });
    return null;
  }

  return scoped;
}

function resolveDatasetOrRespond(
  requestOrDatasetId: express.Request | string | undefined,
  datasetIdOrResponse: string | express.Response | undefined,
  responseOrStore: express.Response | AppStore,
  maybeStore?: AppStore
) {
  const request =
    typeof requestOrDatasetId === "object" && requestOrDatasetId !== null && "path" in requestOrDatasetId
      ? requestOrDatasetId
      : undefined;
  const datasetId = request ? (datasetIdOrResponse as string | undefined) : (requestOrDatasetId as string | undefined);
  const response = (request ? responseOrStore : datasetIdOrResponse) as express.Response;
  const dataStore = (request ? maybeStore : responseOrStore) as AppStore;
  const scopedDatasetId = request ? getScopedDatasetId(request, datasetId, response) : datasetId;
  if (scopedDatasetId === null) {
    return null;
  }

  const dataset = dataStore.getResolvedDataset(scopedDatasetId);

  if (!dataset) {
    response.status(404).json({ message: `Unknown dataset "${scopedDatasetId}".` });
    return null;
  }

  return dataset;
}

function isInvoiceUnit(value: unknown): value is InvoiceUnit {
  return typeof value === "string" && ["g", "ml", "piece", "kg", "l", "pcs", "pack"].includes(value);
}

function isIngredientUnit(value: unknown): value is IngredientUnit {
  return typeof value === "string" && ["g", "ml", "piece"].includes(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isOnboardingStep(value: unknown): value is OnboardingStepId {
  return (
    typeof value === "string" &&
    [
      "restaurant_profile",
      "ingredients",
      "recipes",
      "dishes",
      "suppliers",
      "first_invoice",
      "dashboard_review"
    ].includes(value)
  );
}

function isManualLicenseType(
  value: unknown
): value is "founding_partner_lifetime" | "manual_comp" | "internal_demo" {
  return (
    typeof value === "string" &&
    ["founding_partner_lifetime", "manual_comp", "internal_demo"].includes(value)
  );
}

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isFinitePositive(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function buildCorsOptions(environment: NodeJS.ProcessEnv | undefined) {
  const configuredOrigin = getCorsOrigin(environment);
  const nodeEnv = getNodeEnv(environment);

  if (!configuredOrigin) {
    return {
      origin: nodeEnv === "production" ? false : true
    };
  }

  const origins = configuredOrigin
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  return {
    origin: origins.length <= 1 ? origins[0] : origins
  };
}

async function recordAudit(
  auditService: ReturnType<typeof createAuditService>,
  dataStore: AppStore,
  request: express.Request,
  datasetId: string,
  action: string,
  entityType: string,
  entityId?: string,
  metadata?: Record<string, unknown>
) {
  const authContext = getRequestAuthContext(request);
  const storeContext = dataStore.getStoreContext(datasetId);
  if (!storeContext) {
    return;
  }

  await auditService.record({
    workspaceId: authContext?.activeWorkspaceId ?? storeContext.workspaceId,
    restaurantId: authContext?.activeRestaurantId ?? storeContext.restaurantId,
    actorUserId: authContext?.actorUserId ?? storeContext.actorUserId,
    action,
    entityType,
    entityId,
    metadata
  });
}

export interface CreateAppOptions {
  env?: NodeJS.ProcessEnv;
  ocrRegistry?: OcrProviderRegistry;
  store?: AppStore;
  authService?: AuthService;
}

function isStoreBootstrapExempt(pathname: string) {
  return (
    pathname === "/health/deep" ||
    pathname === "/health/readiness" ||
    pathname === "/app/config" ||
    pathname === "/ocr/providers" ||
    pathname.startsWith("/auth/")
  );
}

export function createApp(options: CreateAppOptions = {}) {
  const app = express();
  const logger = createLogger(options.env);
  const dataStore = options.store ?? createStore({ env: options.env });
  const authService = options.authService ?? createAuthService({ env: options.env, store: dataStore });
  const auditService = createAuditService(options.env);
  const billingProvider = createBillingProvider(options.env);
  const ocrRegistry = options.ocrRegistry ?? createOcrProviderRegistry({ env: options.env });
  const uploadStorage = createUploadStorage(options.env);
  const defaultOcrProvider = ocrRegistry.getDefaultProvider();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: Math.min(defaultOcrProvider.maxFileSizeBytes, uploadStorage.getConfig().maxFileSizeBytes)
    }
  });

  app.use(cors(buildCorsOptions(options.env)));
  app.use(attachRequestId);
  app.use(createRequestLogger(logger));
  app.use((request, response, next) => {
    const originalJson = response.json.bind(response);

    response.json = ((body: unknown) => {
      const normalizedBody = normalizeErrorBody(body, response.statusCode, getRequestId(request));
      return originalJson(normalizedBody);
    }) as typeof response.json;

    next();
  });
  app.use(express.json());

  const memberAccess = requireAccess(authService, dataStore, options.env, {
    minimumRole: "member"
  });
  const adminAccess = requireAccess(authService, dataStore, options.env, {
    minimumRole: "admin"
  });

  app.use("/api", async (request, response, next) => {
    if (isStoreBootstrapExempt(request.path)) {
      next();
      return;
    }

    try {
      await dataStore.initialize();
      next();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Store initialization failed.";
      logApiError(logger, request, 503, "service_unavailable", message);
      response.status(503).json({ message });
    }
  });

  app.get("/health", (_request, response) => {
    response.json({ ok: true, service: "profit-analyzer-api" });
  });

  app.get("/api/health/deep", (_request, response) => {
    response.json(buildDeepHealth(dataStore, authService, ocrRegistry, options.env));
  });

  app.get("/api/health/readiness", (_request, response) => {
    response.json(buildReadiness(dataStore, authService, ocrRegistry, options.env));
  });

  app.get("/api/app/config", (_request, response) => {
    response.json(buildAppConfig(dataStore, authService, ocrRegistry, options.env));
  });

  app.post("/api/auth/dev-login", async (request, response) => {
    const body = request.body as { email?: unknown; workspaceId?: unknown; role?: unknown };

    if (!isNonEmptyString(body.email)) {
      response.status(400).json({ message: "email is required." });
      return;
    }

    try {
      const result = await authService.devLogin({
        email: body.email,
        workspaceId: isNonEmptyString(body.workspaceId) ? body.workspaceId : undefined,
        role:
          body.role === "owner" || body.role === "admin" || body.role === "member"
            ? body.role
            : undefined
      });

      response.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed.";
      response.status(error instanceof DevAuthUnavailableError ? 503 : 400).json({ message });
    }
  });

  app.get("/api/auth/me", async (request, response) => {
    const token = readBearerToken(request);
    if (!token) {
      response.status(401).json({ message: "Authentication is required." });
      return;
    }

    const me = await authService.getMe(token);
    if (!me) {
      response.status(401).json({ message: "Session is invalid or expired." });
      return;
    }

    response.json(me);
  });

  app.post("/api/auth/logout", async (request, response) => {
    const token = readBearerToken(request);
    if (token) {
      await authService.logout(token);
    }

    response.json({ ok: true });
  });

  app.post("/api/auth/context", async (request, response) => {
    const token = readBearerToken(request);
    if (!token) {
      response.status(401).json({ message: "Authentication is required." });
      return;
    }

    const body = request.body as { workspaceId?: unknown; restaurantId?: unknown };
    if (!isNonEmptyString(body.workspaceId) || !isNonEmptyString(body.restaurantId)) {
      response.status(400).json({ message: "workspaceId and restaurantId are required." });
      return;
    }

    const me = await authService.setActiveContext(token, {
      workspaceId: body.workspaceId,
      restaurantId: body.restaurantId
    });

    if (!me) {
      response.status(403).json({ message: "You do not have access to that workspace context." });
      return;
    }

    response.json(me);
  });

  app.get("/api/demo/datasets", (_request, response) => {
    response.json(dataStore.getDemoDatasets());
  });

  app.get("/api/ocr/providers", (_request, response) => {
    response.json(ocrRegistry.getProviders());
  });

  app.get("/api/restaurant/profile", memberAccess, (request, response) => {
    const datasetId = parseDatasetId(request.query.dataset);
    const dataset = resolveDatasetOrRespond(request, datasetId, response, dataStore);
    if (!dataset) {
      return;
    }

    response.json(dataStore.getRestaurantProfile(dataset.id));
  });

  app.patch("/api/restaurant/profile", adminAccess, async (request, response) => {
    const body = request.body as {
      dataset?: unknown;
      name?: unknown;
      currency?: unknown;
      country?: unknown;
      concept?: unknown;
      averageMonthlyDishSalesEstimate?: unknown;
    };
    const datasetId = parseDatasetId(body.dataset ?? request.query.dataset);
    const dataset = resolveDatasetOrRespond(request, datasetId, response, dataStore);
    if (!dataset) {
      return;
    }

    if (body.name !== undefined && !isNonEmptyString(body.name)) {
      response.status(400).json({ message: "name must be a non-empty string." });
      return;
    }

    if (body.currency !== undefined && !isNonEmptyString(body.currency)) {
      response.status(400).json({ message: "currency must be a non-empty string." });
      return;
    }

    if (
      body.averageMonthlyDishSalesEstimate !== undefined &&
      !isFiniteNonNegative(body.averageMonthlyDishSalesEstimate)
    ) {
      response.status(400).json({ message: "averageMonthlyDishSalesEstimate must be non-negative." });
      return;
    }

    const profile = dataStore.updateRestaurantProfile(
      {
        name: typeof body.name === "string" ? body.name : undefined,
        currency: typeof body.currency === "string" ? body.currency : undefined,
        country: typeof body.country === "string" ? body.country : undefined,
        concept: typeof body.concept === "string" ? body.concept : undefined,
        averageMonthlyDishSalesEstimate:
          typeof body.averageMonthlyDishSalesEstimate === "number"
            ? body.averageMonthlyDishSalesEstimate
            : undefined
      },
      dataset.id
    );

    if (!profile) {
      response.status(404).json({ message: `Unknown dataset "${datasetId}".` });
      return;
    }

    dataStore.completeOnboardingStep("restaurant_profile", dataset.id);
    await dataStore.flushDatasetAsync(dataset.id);
    await recordAudit(auditService, dataStore, request, dataset.id, "restaurant_profile_update", "restaurant", dataset.id, {
      name: profile.name
    });
    response.json(profile);
  });

  app.get("/api/onboarding/status", memberAccess, (request, response) => {
    const datasetId = parseDatasetId(request.query.dataset);
    const dataset = resolveDatasetOrRespond(request, datasetId, response, dataStore);
    if (!dataset) {
      return;
    }

    response.json(dataStore.getOnboardingState(dataset.id));
  });

  app.patch("/api/onboarding/status", adminAccess, async (request, response) => {
    const body = request.body as {
      dataset?: unknown;
      currentStep?: unknown;
      completedSteps?: unknown;
      skippedSteps?: unknown;
    };
    const datasetId = parseDatasetId(body.dataset ?? request.query.dataset);
    const dataset = resolveDatasetOrRespond(request, datasetId, response, dataStore);
    if (!dataset) {
      return;
    }

    if (body.currentStep !== undefined && !isOnboardingStep(body.currentStep)) {
      response.status(400).json({ message: "currentStep is invalid." });
      return;
    }

    if (
      (body.completedSteps !== undefined &&
        (!Array.isArray(body.completedSteps) || body.completedSteps.some((step) => !isOnboardingStep(step)))) ||
      (body.skippedSteps !== undefined &&
        (!Array.isArray(body.skippedSteps) || body.skippedSteps.some((step) => !isOnboardingStep(step))))
    ) {
      response.status(400).json({ message: "completedSteps and skippedSteps must contain valid onboarding steps." });
      return;
    }

    const state = dataStore.updateOnboardingState(
      {
        currentStep: body.currentStep,
        completedSteps: body.completedSteps as OnboardingStepId[] | undefined,
        skippedSteps: body.skippedSteps as OnboardingStepId[] | undefined
      },
      dataset.id
    );

    if (!state) {
      response.status(404).json({ message: `Unknown dataset "${datasetId}".` });
      return;
    }

    await dataStore.flushDatasetAsync(dataset.id);
    response.json(state);
  });

  app.post("/api/onboarding/complete-step", adminAccess, async (request, response) => {
    const body = request.body as { dataset?: unknown; step?: unknown };
    const datasetId = parseDatasetId(body.dataset ?? request.query.dataset);
    const dataset = resolveDatasetOrRespond(request, datasetId, response, dataStore);
    if (!dataset) {
      return;
    }

    if (!isOnboardingStep(body.step)) {
      response.status(400).json({ message: "step is required." });
      return;
    }

    const state = dataStore.completeOnboardingStep(body.step, dataset.id);
    if (!state) {
      response.status(404).json({ message: `Unknown dataset "${datasetId}".` });
      return;
    }

    await dataStore.flushDatasetAsync(dataset.id);
    await recordAudit(auditService, dataStore, request, dataset.id, "onboarding_complete_step", "onboarding", body.step);
    response.json(state);
  });

  app.post("/api/onboarding/skip-step", adminAccess, async (request, response) => {
    const body = request.body as { dataset?: unknown; step?: unknown };
    const datasetId = parseDatasetId(body.dataset ?? request.query.dataset);
    const dataset = resolveDatasetOrRespond(request, datasetId, response, dataStore);
    if (!dataset) {
      return;
    }

    if (!isOnboardingStep(body.step)) {
      response.status(400).json({ message: "step is required." });
      return;
    }

    const state = dataStore.skipOnboardingStep(body.step, dataset.id);
    if (!state) {
      response.status(404).json({ message: `Unknown dataset "${datasetId}".` });
      return;
    }

    await dataStore.flushDatasetAsync(dataset.id);
    await recordAudit(auditService, dataStore, request, dataset.id, "onboarding_skip_step", "onboarding", body.step);
    response.json(state);
  });

  app.get("/api/onboarding/checklist", memberAccess, (request, response) => {
    const datasetId = parseDatasetId(request.query.dataset);
    const dataset = resolveDatasetOrRespond(request, datasetId, response, dataStore);
    if (!dataset) {
      return;
    }

    response.json(dataStore.getOnboardingChecklist(dataset.id));
  });

  app.get("/api/billing/plans", (_request, response) => {
    const includeInternalPlans = (options.env?.APP_MODE ?? "demo") !== "production";
    response.json(dataStore.getBillingPlans(includeInternalPlans));
  });

  app.get("/api/billing/status", memberAccess, (request, response) => {
    const datasetId = parseDatasetId(request.query.dataset);
    const dataset = resolveDatasetOrRespond(request, datasetId, response, dataStore);
    if (!dataset) {
      return;
    }

    const status = dataStore.getBillingStatus(dataset.id, billingProvider.getProviderStatus());
    if (!status) {
      response.status(404).json({ message: "Billing status is not available for this workspace." });
      return;
    }

    response.json(status);
  });

  app.get("/api/billing/usage", memberAccess, (request, response) => {
    const datasetId = parseDatasetId(request.query.dataset);
    const dataset = resolveDatasetOrRespond(request, datasetId, response, dataStore);
    if (!dataset) {
      return;
    }

    const usage = dataStore.getBillingUsage(dataset.id);
    if (!usage) {
      response.status(404).json({ message: "Billing usage is not available for this workspace." });
      return;
    }

    response.json(usage);
  });

  app.post("/api/billing/start-trial", adminAccess, async (request, response) => {
    const body = request.body as { dataset?: unknown };
    const datasetId = parseDatasetId(request.query.dataset) ?? parseDatasetId(body.dataset);
    const dataset = resolveDatasetOrRespond(request, datasetId, response, dataStore);
    if (!dataset) {
      return;
    }

    const status = dataStore.startTrial(dataset.id);
    if (!status) {
      response.status(404).json({ message: "Billing status is not available for this workspace." });
      return;
    }

    await recordAudit(auditService, dataStore, request, dataset.id, "billing_trial_started", "workspace", status.workspaceId);
    await dataStore.flushDatasetAsync(dataset.id);
    response.status(201).json(status);
  });

  app.post("/api/billing/manual-license", adminAccess, async (request, response) => {
    const body = request.body as {
      dataset?: unknown;
      workspaceId?: unknown;
      type?: unknown;
      notes?: unknown;
    };
    const datasetId = parseDatasetId(request.query.dataset) ?? parseDatasetId(body.dataset);
    const dataset = resolveDatasetOrRespond(request, datasetId, response, dataStore);
    if (!dataset) {
      return;
    }

    if (!isManualLicenseType(body.type)) {
      response.status(400).json({
        message: "type must be founding_partner_lifetime, manual_comp, or internal_demo."
      });
      return;
    }

    const status = dataStore.grantManualLicense(
      {
        workspaceId: isNonEmptyString(body.workspaceId) ? body.workspaceId : undefined,
        type: body.type,
        notes: isNonEmptyString(body.notes) ? body.notes : undefined
      },
      dataset.id
    );

    if (status === undefined) {
      response.status(403).json({ message: "Manual license workspace must match the active workspace." });
      return;
    }

    if (!status) {
      response.status(404).json({ message: "Billing status is not available for this workspace." });
      return;
    }

    await recordAudit(
      auditService,
      dataStore,
      request,
      dataset.id,
      "billing_manual_license_granted",
      "workspace",
      status.workspaceId,
      { type: body.type }
    );
    await dataStore.flushDatasetAsync(dataset.id);
    response.status(201).json(status);
  });

  app.get("/api/ingredients", memberAccess, (request, response) => {
    const datasetId = parseDatasetId(request.query.dataset);
    const dataset = resolveDatasetOrRespond(request, datasetId, response, dataStore);
    if (!dataset) {
      return;
    }

    response.json(dataStore.getIngredients(dataset.id));
  });

  app.post("/api/ingredients", adminAccess, async (request, response) => {
    const body = request.body as {
      dataset?: unknown;
      name?: unknown;
      costPerUnitCents?: unknown;
      unit?: unknown;
      id?: unknown;
    };
    const datasetId = parseDatasetId(body.dataset ?? request.query.dataset);
    const dataset = resolveDatasetOrRespond(request, datasetId, response, dataStore);
    if (!dataset) {
      return;
    }

    if (
      !isNonEmptyString(body.name) ||
      !isFiniteNonNegative(body.costPerUnitCents) ||
      !isIngredientUnit(body.unit)
    ) {
      response.status(400).json({
        message: "Ingredient requires name, unit, and non-negative costPerUnitCents."
      });
      return;
    }

    const ingredientName = body.name.trim();
    const existingIngredients = dataStore.getIngredients(dataset.id) ?? [];
    if (
      existingIngredients.some(
        (ingredient) => ingredient.name.trim().toLowerCase() === ingredientName.toLowerCase()
      )
    ) {
      response.status(409).json({ message: "Ingredient name already exists in this restaurant." });
      return;
    }

    const ingredient = dataStore.createIngredient(
      {
        id: typeof body.id === "string" ? body.id : undefined,
        name: ingredientName,
        costPerUnitCents: body.costPerUnitCents,
        unit: body.unit
      },
      dataset.id
    );

    if (!ingredient) {
      response.status(404).json({ message: `Unknown dataset "${datasetId}".` });
      return;
    }

    await dataStore.flushDatasetAsync(dataset.id);
    await recordAudit(auditService, dataStore, request, dataset.id, "ingredient_create", "ingredient", ingredient.id, {
      name: ingredient.name
    });
    if ((dataStore.getIngredients(dataset.id)?.length ?? 0) >= 5) {
      dataStore.completeOnboardingStep("ingredients", dataset.id);
      await dataStore.flushDatasetAsync(dataset.id);
    }
    response.status(201).json(ingredient);
  });

  app.patch("/api/ingredients/:id", adminAccess, async (request, response) => {
    const ingredientId = getRouteParam(request.params.id);
    const body = request.body as {
      dataset?: unknown;
      name?: unknown;
      costPerUnitCents?: unknown;
      unit?: unknown;
    };
    const datasetId = parseDatasetId(body.dataset ?? request.query.dataset);
    const dataset = resolveDatasetOrRespond(request, datasetId, response, dataStore);
    if (!dataset) {
      return;
    }

    if (
      body.name === undefined &&
      body.costPerUnitCents === undefined &&
      body.unit === undefined
    ) {
      response.status(400).json({ message: "At least one ingredient field must be provided." });
      return;
    }

    if (body.name !== undefined && !isNonEmptyString(body.name)) {
      response.status(400).json({ message: "name must be a non-empty string." });
      return;
    }

    if (body.costPerUnitCents !== undefined && !isFiniteNonNegative(body.costPerUnitCents)) {
      response.status(400).json({ message: "costPerUnitCents must be non-negative." });
      return;
    }

    if (body.unit !== undefined && !isIngredientUnit(body.unit)) {
      response.status(400).json({ message: "unit must be g, ml, or piece." });
      return;
    }

    if (!ingredientId) {
      response.status(400).json({ message: "Ingredient id is required." });
      return;
    }

    const ingredient = dataStore.updateIngredient(
      ingredientId,
      {
        name: body.name,
        costPerUnitCents: body.costPerUnitCents,
        unit: body.unit
      },
      dataset.id
    );

    if (ingredient === null) {
      response.status(404).json({ message: `Unknown dataset "${datasetId}".` });
      return;
    }

    if (ingredient === undefined) {
      response.status(404).json({ message: "Ingredient not found." });
      return;
    }

    await dataStore.flushDatasetAsync(dataset.id);
    await recordAudit(auditService, dataStore, request, dataset.id, "ingredient_update", "ingredient", ingredient.id, {
      name: ingredient.name
    });
    response.json(ingredient);
  });

  app.get("/api/ingredients/:id/cost-history", memberAccess, (request, response) => {
    const ingredientId = getRouteParam(request.params.id);
    const datasetId = parseDatasetId(request.query.dataset);
    const dataset = resolveDatasetOrRespond(request, datasetId, response, dataStore);
    if (!dataset) {
      return;
    }

    if (!ingredientId) {
      response.status(400).json({ message: "Ingredient id is required." });
      return;
    }

    const history = dataStore.getIngredientCostHistory(ingredientId, dataset.id);
    if (!history) {
      response.status(404).json({ message: "Ingredient not found." });
      return;
    }

    response.json(history);
  });

  app.get("/api/recipes", memberAccess, (request, response) => {
    const datasetId = parseDatasetId(request.query.dataset);
    const dataset = resolveDatasetOrRespond(request, datasetId, response, dataStore);
    if (!dataset) {
      return;
    }

    response.json(dataStore.getRecipes(dataset.id));
  });

  app.post("/api/recipes", adminAccess, async (request, response) => {
    const body = request.body as {
      dataset?: unknown;
      id?: unknown;
      name?: unknown;
      yield?: unknown;
      ingredients?: unknown;
    };
    const datasetId = parseDatasetId(body.dataset ?? request.query.dataset);
    const dataset = resolveDatasetOrRespond(request, datasetId, response, dataStore);
    if (!dataset) {
      return;
    }

    if (!isNonEmptyString(body.name) || !isFinitePositive(body.yield) || !Array.isArray(body.ingredients)) {
      response.status(400).json({
        message: "Recipe requires name, positive yield, and an ingredients array."
      });
      return;
    }

    const recipeIngredients = body.ingredients as Array<{
      ingredientId?: unknown;
      quantity?: unknown;
      unit?: unknown;
    }>;

    if (
      recipeIngredients.some(
        (ingredient) =>
          !isNonEmptyString(ingredient.ingredientId) ||
          !isFinitePositive(ingredient.quantity) ||
          !isInvoiceUnit(ingredient.unit)
      )
    ) {
      response.status(400).json({
        message: "Recipe ingredients require ingredientId, positive quantity, and a valid unit."
      });
      return;
    }

    const normalizedIngredients = normalizeRecipeIngredientEntries(
      recipeIngredients.map((ingredient) => ({
        ingredientId: ingredient.ingredientId as string,
        quantity: ingredient.quantity as number,
        unit: ingredient.unit as InvoiceUnit
      }))
    );

    if (normalizedIngredients.errors.length > 0 || !normalizedIngredients.normalized) {
      response.status(400).json({
        message: normalizedIngredients.errors.join(" ")
      });
      return;
    }

    const recipe = dataStore.createRecipe(
      {
        id: typeof body.id === "string" ? body.id : undefined,
        name: body.name,
        yield: body.yield,
        ingredients: normalizedIngredients.normalized
      },
      dataset.id
    );

    if (recipe === null) {
      response.status(404).json({ message: `Unknown dataset "${datasetId}".` });
      return;
    }

    if (recipe === undefined) {
      response.status(400).json({ message: "Recipe references unknown ingredients." });
      return;
    }

    await dataStore.flushDatasetAsync(dataset.id);
    await recordAudit(auditService, dataStore, request, dataset.id, "recipe_create", "recipe", recipe.id, {
      name: recipe.name
    });
    if ((dataStore.getRecipes(dataset.id)?.length ?? 0) >= 2) {
      dataStore.completeOnboardingStep("recipes", dataset.id);
      await dataStore.flushDatasetAsync(dataset.id);
    }
    response.status(201).json(recipe);
  });

  app.patch("/api/recipes/:id", adminAccess, async (request, response) => {
    const recipeId = getRouteParam(request.params.id);
    const body = request.body as {
      dataset?: unknown;
      name?: unknown;
      yield?: unknown;
      ingredients?: unknown;
    };
    const datasetId = parseDatasetId(body.dataset ?? request.query.dataset);
    const dataset = resolveDatasetOrRespond(request, datasetId, response, dataStore);
    if (!dataset) {
      return;
    }

    if (body.name === undefined && body.yield === undefined && body.ingredients === undefined) {
      response.status(400).json({ message: "At least one recipe field must be provided." });
      return;
    }

    if (body.name !== undefined && !isNonEmptyString(body.name)) {
      response.status(400).json({ message: "name must be a non-empty string." });
      return;
    }

    if (body.yield !== undefined && !isFinitePositive(body.yield)) {
      response.status(400).json({ message: "yield must be positive." });
      return;
    }

    let recipeIngredients:
      | Array<{ ingredientId: string; quantity: number; unit: IngredientUnit }>
      | undefined;

    if (body.ingredients !== undefined) {
      if (!Array.isArray(body.ingredients)) {
        response.status(400).json({ message: "ingredients must be an array." });
        return;
      }

      const typedIngredients = body.ingredients as Array<{
        ingredientId?: unknown;
        quantity?: unknown;
        unit?: unknown;
      }>;

      if (
        typedIngredients.some(
          (ingredient) =>
            !isNonEmptyString(ingredient.ingredientId) ||
            !isFinitePositive(ingredient.quantity) ||
            !isInvoiceUnit(ingredient.unit)
        )
      ) {
        response.status(400).json({
          message: "Recipe ingredients require ingredientId, positive quantity, and a valid unit."
        });
        return;
      }

      const normalizedIngredients = normalizeRecipeIngredientEntries(
        typedIngredients.map((ingredient) => ({
          ingredientId: ingredient.ingredientId as string,
          quantity: ingredient.quantity as number,
          unit: ingredient.unit as InvoiceUnit
        }))
      );

      if (normalizedIngredients.errors.length > 0 || !normalizedIngredients.normalized) {
        response.status(400).json({
          message: normalizedIngredients.errors.join(" ")
        });
        return;
      }

      recipeIngredients = normalizedIngredients.normalized.map((ingredient) => ({
        ingredientId: ingredient.ingredientId,
        quantity: ingredient.quantity,
        unit: ingredient.unit
      }));
    }

    if (!recipeId) {
      response.status(400).json({ message: "Recipe id is required." });
      return;
    }

    const recipe = dataStore.updateRecipe(
      recipeId,
      {
        name: body.name,
        yield: body.yield,
        ingredients: recipeIngredients
      },
      dataset.id
    );

    if (recipe === null) {
      response.status(404).json({ message: `Unknown dataset "${datasetId}".` });
      return;
    }

    if (recipe === undefined) {
      response.status(400).json({ message: "Recipe not found or ingredient references are invalid." });
      return;
    }

    await dataStore.flushDatasetAsync(dataset.id);
    await recordAudit(auditService, dataStore, request, dataset.id, "recipe_update", "recipe", recipe.id, {
      name: recipe.name
    });
    response.json(recipe);
  });

  app.get("/api/dishes", memberAccess, (request, response) => {
    const datasetId = parseDatasetId(request.query.dataset);
    const dataset = resolveDatasetOrRespond(request, datasetId, response, dataStore);
    if (!dataset) {
      return;
    }

    response.json(dataStore.getDishes(dataset.id));
  });

  app.post("/api/dishes", adminAccess, async (request, response) => {
    const body = request.body as {
      dataset?: unknown;
      id?: unknown;
      name?: unknown;
      recipeId?: unknown;
      priceCents?: unknown;
      salesVolume?: unknown;
    };
    const datasetId = parseDatasetId(body.dataset ?? request.query.dataset);
    const dataset = resolveDatasetOrRespond(request, datasetId, response, dataStore);
    if (!dataset) {
      return;
    }

    if (
      !isNonEmptyString(body.name) ||
      !isNonEmptyString(body.recipeId) ||
      !isFiniteNonNegative(body.priceCents) ||
      !isFiniteNonNegative(body.salesVolume)
    ) {
      response.status(400).json({
        message: "Dish requires name, recipeId, non-negative priceCents, and non-negative salesVolume."
      });
      return;
    }

    const dish = dataStore.createDish(
      {
        id: typeof body.id === "string" ? body.id : undefined,
        name: body.name,
        recipeId: body.recipeId,
        priceCents: body.priceCents,
        salesVolume: body.salesVolume
      },
      dataset.id
    );

    if (dish === null) {
      response.status(404).json({ message: `Unknown dataset "${datasetId}".` });
      return;
    }

    if (dish === undefined) {
      response.status(400).json({ message: "Dish recipeId must reference an existing recipe." });
      return;
    }

    await dataStore.flushDatasetAsync(dataset.id);
    await recordAudit(auditService, dataStore, request, dataset.id, "dish_create", "dish", dish.id, {
      name: dish.name
    });
    if ((dataStore.getDishes(dataset.id)?.length ?? 0) >= 2) {
      dataStore.completeOnboardingStep("dishes", dataset.id);
      await dataStore.flushDatasetAsync(dataset.id);
    }
    response.status(201).json(dish);
  });

  app.patch("/api/dishes/:id", adminAccess, async (request, response) => {
    const dishId = getRouteParam(request.params.id);
    const body = request.body as {
      dataset?: unknown;
      name?: unknown;
      recipeId?: unknown;
      priceCents?: unknown;
      salesVolume?: unknown;
    };
    const datasetId = parseDatasetId(body.dataset ?? request.query.dataset);
    const dataset = resolveDatasetOrRespond(request, datasetId, response, dataStore);
    if (!dataset) {
      return;
    }

    if (
      body.name === undefined &&
      body.recipeId === undefined &&
      body.priceCents === undefined &&
      body.salesVolume === undefined
    ) {
      response.status(400).json({ message: "At least one dish field must be provided." });
      return;
    }

    if (body.name !== undefined && !isNonEmptyString(body.name)) {
      response.status(400).json({ message: "name must be a non-empty string." });
      return;
    }

    if (body.recipeId !== undefined && !isNonEmptyString(body.recipeId)) {
      response.status(400).json({ message: "recipeId must be a non-empty string." });
      return;
    }

    if (body.priceCents !== undefined && !isFiniteNonNegative(body.priceCents)) {
      response.status(400).json({ message: "priceCents must be non-negative." });
      return;
    }

    if (body.salesVolume !== undefined && !isFiniteNonNegative(body.salesVolume)) {
      response.status(400).json({ message: "salesVolume must be non-negative." });
      return;
    }

    if (!dishId) {
      response.status(400).json({ message: "Dish id is required." });
      return;
    }

    const dish = dataStore.updateDish(
      dishId,
      {
        name: body.name,
        recipeId: body.recipeId,
        priceCents: body.priceCents,
        salesVolume: body.salesVolume
      },
      dataset.id
    );

    if (dish === null) {
      response.status(404).json({ message: `Unknown dataset "${datasetId}".` });
      return;
    }

    if (dish === undefined) {
      response.status(400).json({ message: "Dish not found or recipeId is invalid." });
      return;
    }

    await dataStore.flushDatasetAsync(dataset.id);
    await recordAudit(auditService, dataStore, request, dataset.id, "dish_update", "dish", dish.id, {
      name: dish.name
    });
    response.json(dish);
  });

  app.get("/api/suppliers", memberAccess, (request, response) => {
    const datasetId = parseDatasetId(request.query.dataset);
    const dataset = resolveDatasetOrRespond(request, datasetId, response, dataStore);
    if (!dataset) {
      return;
    }

    response.json(dataStore.getSuppliers(dataset.id));
  });

  app.post("/api/suppliers", adminAccess, async (request, response) => {
    const body = request.body as { dataset?: unknown; id?: unknown; name?: unknown; contactLabel?: unknown };
    const datasetId = parseDatasetId(body.dataset ?? request.query.dataset);
    const dataset = resolveDatasetOrRespond(request, datasetId, response, dataStore);
    if (!dataset) {
      return;
    }

    if (!isNonEmptyString(body.name)) {
      response.status(400).json({ message: "Supplier name is required." });
      return;
    }

    const supplierName = body.name.trim();
    const existingSuppliers = dataStore.getSuppliers(dataset.id) ?? [];
    if (existingSuppliers.some((supplier) => supplier.name.trim().toLowerCase() === supplierName.toLowerCase())) {
      response.status(409).json({ message: "Supplier name already exists in this restaurant." });
      return;
    }

    const supplier = dataStore.createSupplier(
      {
        id: typeof body.id === "string" ? body.id : undefined,
        name: supplierName,
        contactLabel: typeof body.contactLabel === "string" ? body.contactLabel : undefined
      },
      dataset.id
    );

    if (!supplier) {
      response.status(404).json({ message: `Unknown dataset "${datasetId}".` });
      return;
    }

    dataStore.completeOnboardingStep("suppliers", dataset.id);
    await dataStore.flushDatasetAsync(dataset.id);
    await recordAudit(auditService, dataStore, request, dataset.id, "supplier_create", "supplier", supplier.id, {
      name: supplier.name
    });
    response.status(201).json(supplier);
  });

  app.patch("/api/suppliers/:id", adminAccess, async (request, response) => {
    const supplierId = getRouteParam(request.params.id);
    const body = request.body as { dataset?: unknown; name?: unknown; contactLabel?: unknown };
    const datasetId = parseDatasetId(body.dataset ?? request.query.dataset);
    const dataset = resolveDatasetOrRespond(request, datasetId, response, dataStore);
    if (!dataset) {
      return;
    }

    if (!supplierId) {
      response.status(400).json({ message: "Supplier id is required." });
      return;
    }

    if (body.name !== undefined && !isNonEmptyString(body.name)) {
      response.status(400).json({ message: "Supplier name must be a non-empty string." });
      return;
    }

    const supplier = dataStore.updateSupplier(
      supplierId,
      {
        name: typeof body.name === "string" ? body.name : undefined,
        contactLabel: typeof body.contactLabel === "string" ? body.contactLabel : undefined
      },
      dataset.id
    );

    if (supplier === null) {
      response.status(404).json({ message: `Unknown dataset "${datasetId}".` });
      return;
    }

    if (supplier === undefined) {
      response.status(404).json({ message: "Supplier not found." });
      return;
    }

    await dataStore.flushDatasetAsync(dataset.id);
    await recordAudit(auditService, dataStore, request, dataset.id, "supplier_update", "supplier", supplier.id, {
      name: supplier.name
    });
    response.json(supplier);
  });

  app.get("/api/invoices/samples", (_request, response) => {
    response.json(dataStore.getMockInvoiceSampleSummaries());
  });

  app.get("/api/export", adminAccess, (request, response) => {
    const datasetId = parseDatasetId(request.query.dataset);
    const dataset = resolveDatasetOrRespond(request, datasetId, response, dataStore);

    if (!dataset) {
      return;
    }

    response.json(dataStore.exportDataset(dataset.id));
  });

  app.post("/api/import", adminAccess, async (request, response) => {
    const datasetId = parseDatasetId(request.query.dataset);
    const body = request.body as unknown;
    const protectedSeededDatasetIds = new Set(listDemoDatasets().map((dataset) => dataset.id));
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

    const validation = validateDatasetImportPayload(body);

    if (!validation.valid) {
      response.status(400).json({
        message: "Import payload failed validation.",
        ...validation
      });
      return;
    }

    if (targetDatasetId && protectedSeededDatasetIds.has(targetDatasetId)) {
      response.status(400).json({
        message: "Import can only target a pilot workspace, not a seeded demo dataset.",
        ...validation
      });
      return;
    }

    const sanitizedPayload = sanitizeImportedPayload(
      body as Parameters<typeof sanitizeImportedPayload>[0],
      targetDatasetId
    );
    const scopedDatasetId = getScopedDatasetId(request, targetDatasetId, response);
    if (scopedDatasetId === null) {
      return;
    }

    const imported = dataStore.importDataset(sanitizedPayload, scopedDatasetId);
    await dataStore.flushDatasetAsync(imported.datasetId);
    await recordAudit(auditService, dataStore, request, imported.datasetId, "dataset_import", "dataset", imported.datasetId, {
      ingredientCount: imported.ingredientCount,
      recipeCount: imported.recipeCount,
      dishCount: imported.dishCount
    });
    response.status(201).json(imported);
  });

  app.post("/api/import/validate", adminAccess, (request, response) => {
    const datasetId = parseDatasetId(request.query.dataset);
    const body = request.body as unknown;
    const protectedSeededDatasetIds = new Set(listDemoDatasets().map((dataset) => dataset.id));
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
    const scopedDatasetId = getScopedDatasetId(request, targetDatasetId, response);
    if (scopedDatasetId === null) {
      return;
    }

    const validation = validateDatasetImportPayload(body);

    if (scopedDatasetId && protectedSeededDatasetIds.has(scopedDatasetId)) {
      validation.valid = false;
      validation.errors = [
        ...validation.errors,
        "Import can only target a pilot workspace, not a seeded demo dataset."
      ];
    }

    response.status(validation.valid ? 200 : 400).json(validation);
  });

  app.post("/api/datasets/:id/reset", adminAccess, async (request, response) => {
    const targetDatasetId = getRouteParam(request.params.id);
    const datasetId = getScopedDatasetId(request, targetDatasetId, response);
    if (!datasetId) {
      return;
    }
    const summary = dataStore.resetDataset(datasetId);

    if (!summary) {
      response.status(404).json({ message: `Unknown dataset "${datasetId}".` });
      return;
    }

    await dataStore.flushDatasetAsync(datasetId);
    await recordAudit(auditService, dataStore, request, datasetId, "dataset_reset", "dataset", datasetId, {
      clearedInvoices: summary.clearedInvoices,
      clearedCostHistory: summary.clearedCostHistory,
      clearedAlerts: summary.clearedAlerts,
      clearedOcrJobs: summary.clearedOcrJobs,
      restoredDishCount: summary.restoredDishCount
    });
    response.json(summary);
  });

  app.post("/api/invoices/parse-mock", adminAccess, async (request, response) => {
    const body = request.body as {
      dataset?: unknown;
      sampleInvoiceId?: unknown;
    };
    const datasetId = parseDatasetId(request.query.dataset ?? body.dataset);
    const dataset = resolveDatasetOrRespond(request, datasetId, response, dataStore);
    if (!dataset) {
      return;
    }

    const sampleInvoiceId = typeof body.sampleInvoiceId === "string" ? body.sampleInvoiceId : undefined;

    if (!sampleInvoiceId) {
      response.status(400).json({ message: "sampleInvoiceId is required." });
      return;
    }

    const parsed = dataStore.parseMockInvoice(sampleInvoiceId, dataset.id);

    if (!parsed) {
      response.status(404).json({ message: `Unknown sample invoice "${sampleInvoiceId}".` });
      return;
    }

    await dataStore.flushDatasetAsync(dataset.id);
    await recordAudit(
      auditService,
      dataStore,
      request,
      dataset.id,
      "invoice_parse_mock",
      "invoice",
      parsed.invoiceDraft.id,
      { sourceType: parsed.invoiceDraft.sourceType }
    );
    response.json(parsed);
  });

  app.post("/api/invoices/manual-draft", adminAccess, async (request, response) => {
    const body = request.body as {
      dataset?: unknown;
      supplierName?: unknown;
      invoiceNumber?: unknown;
      invoiceDate?: unknown;
      lines?: unknown;
    };
    const datasetId = parseDatasetId(request.query.dataset ?? body.dataset);
    const dataset = resolveDatasetOrRespond(request, datasetId, response, dataStore);
    if (!dataset) {
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
      dataset.id
    );

    if (!draft) {
      response.status(404).json({ message: `Unknown dataset "${datasetId}".` });
      return;
    }

    await dataStore.flushDatasetAsync(dataset.id);
    await recordAudit(
      auditService,
      dataStore,
      request,
      dataset.id,
      "invoice_manual_draft",
      "invoice",
      draft.invoiceDraft.id,
      { sourceType: draft.invoiceDraft.sourceType }
    );
    response.json(draft);
  });

  app.post("/api/ocr/invoices/upload", adminAccess, upload.single("file"), async (request, response) => {
    const body = request.body as { dataset?: unknown; provider?: unknown };
    const datasetId = parseDatasetId(request.query.dataset ?? body.dataset);
    const dataset = resolveDatasetOrRespond(request, datasetId, response, dataStore);
    if (!dataset) {
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
    const storeContext = dataStore.getStoreContext(dataset.id);
    if (!storeContext) {
      response.status(500).json({ message: "Workspace context is unavailable for upload storage." });
      return;
    }
    let uploadObject: UploadStorageObject;
    try {
      uploadObject = uploadStorage.save({
        context: storeContext,
        originalFileName: file.originalname,
        sanitizedFileName,
        mimeType: file.mimetype,
        fileSizeBytes: file.size,
        buffer: file.buffer,
        createdAt: "2026-04-28T10:00:00.000Z"
      });
    } catch (error) {
      response.status(500).json({
        message: error instanceof Error ? error.message : "Upload storage failed."
      });
      return;
    }

    await recordAudit(
      auditService,
      dataStore,
      request,
      dataset.id,
      "ocr_upload_created",
      "upload_object",
      uploadObject.id,
      {
        provider: provider.config.id,
        storageProvider: uploadObject.storageProvider,
        mimeType: uploadObject.mimeType,
        fileSizeBytes: uploadObject.fileSizeBytes
      }
    );

    try {
      const { provider: resolvedProvider, result } = await ocrRegistry.parse(provider.config.id, {
        fileName: sanitizedFileName,
        mimeType: file.mimetype,
        fileSizeBytes: file.size,
        buffer: file.buffer
      });
      const draft = dataStore.createOcrDraft(
        {
          providerConfig: resolvedProvider,
          parsedResult: result,
          fileName: sanitizedFileName,
          mimeType: file.mimetype,
          fileSizeBytes: file.size,
          uploadObject
        },
        dataset.id
      );

      if (!draft) {
        response.status(404).json({ message: `Unknown dataset "${datasetId}".` });
        return;
      }

      await dataStore.flushDatasetAsync(dataset.id);
      dataStore.completeOnboardingStep("first_invoice", dataset.id);
      await dataStore.flushDatasetAsync(dataset.id);
      await recordAudit(
        auditService,
        dataStore,
        request,
        dataset.id,
        "ocr_upload_parse",
        "ocr_job",
        draft.ocrJob.id,
        { provider: resolvedProvider.id, invoiceDraftId: draft.invoiceDraft.id }
      );
      await recordAudit(
        auditService,
        dataStore,
        request,
        dataset.id,
        "invoice_draft_created",
        "invoice",
        draft.invoiceDraft.id,
        { sourceType: draft.invoiceDraft.sourceType, ocrJobId: draft.ocrJob.id }
      );
      response.json(draft);
    } catch (error: unknown) {
      const failureReason = error instanceof Error ? error.message : "OCR parse failed.";
      const failedJob = dataStore.createFailedOcrJob(
        {
          providerConfig: provider.config,
          fileName: sanitizedFileName,
          mimeType: file.mimetype,
          fileSizeBytes: file.size,
          failureReason,
          failureCode:
            error instanceof OcrProviderNotConfiguredError
              ? "provider_not_configured"
              : error instanceof OcrProviderExecutionError
                ? "provider_execution_error"
                : "ocr_parse_failed",
          uploadObject
        },
        dataset.id
      );

      await dataStore.flushDatasetAsync(dataset.id);
      if (failedJob) {
        await recordAudit(
          auditService,
          dataStore,
          request,
          dataset.id,
          "ocr_upload_failed",
          "ocr_job",
          failedJob.id,
          { provider: provider.config.id, failureReason }
        );
        await recordAudit(
          auditService,
          dataStore,
          request,
          dataset.id,
          "ocr_parse_failed",
          "ocr_job",
          failedJob.id,
          { provider: provider.config.id, failureCode: failedJob.failureCode }
        );
      }

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
    }
  });

  app.get("/api/ocr/jobs", memberAccess, (request, response) => {
    const datasetId = parseDatasetId(request.query.dataset);
    const dataset = resolveDatasetOrRespond(request, datasetId, response, dataStore);
    if (!dataset) {
      return;
    }

    response.json(dataStore.listOcrJobs(dataset.id));
  });

  app.get("/api/ocr/jobs/:id", memberAccess, (request, response) => {
    const jobId = getRouteParam(request.params.id);
    const datasetId = parseDatasetId(request.query.dataset);
    const dataset = resolveDatasetOrRespond(request, datasetId, response, dataStore);
    if (!dataset) {
      return;
    }

    if (!jobId) {
      response.status(400).json({ message: "OCR job id is required." });
      return;
    }

    const ocrJob = dataStore.getOcrJob(jobId, dataset.id);

    if (!ocrJob) {
      response.status(404).json({ message: "OCR job not found." });
      return;
    }

    response.json(ocrJob);
  });

  app.post("/api/ocr/jobs/:id/retry", adminAccess, async (request, response) => {
    const jobId = getRouteParam(request.params.id);
    const datasetId = parseDatasetId(request.query.dataset);
    const dataset = resolveDatasetOrRespond(request, datasetId, response, dataStore);
    if (!dataset) {
      return;
    }

    if (!jobId) {
      response.status(400).json({ message: "OCR job id is required." });
      return;
    }

    const existing = dataStore.getOcrJob(jobId, dataset.id);
    if (!existing) {
      response.status(404).json({ message: "OCR job not found." });
      return;
    }

    if (existing.ocrJob.status !== "failed") {
      response.status(409).json({ message: "Only failed OCR jobs can be retried." });
      return;
    }

    const provider = ocrRegistry.getProvider(existing.ocrJob.provider);
    if (!provider) {
      response.status(400).json({ message: `Unknown OCR provider "${existing.ocrJob.provider}".` });
      return;
    }

    const attemptCount = (existing.ocrJob.providerAttemptCount ?? 1) + 1;
    await recordAudit(
      auditService,
      dataStore,
      request,
      dataset.id,
      "ocr_retry_requested",
      "ocr_job",
      existing.ocrJob.id,
      { provider: existing.ocrJob.provider, attemptCount }
    );

    try {
      const { provider: resolvedProvider, result } = await ocrRegistry.parse(provider.config.id, {
        fileName: existing.ocrJob.sanitizedFileName ?? sanitizeUploadedFileName(existing.ocrJob.originalFileName),
        mimeType: existing.ocrJob.mimeType,
        fileSizeBytes: existing.ocrJob.fileSizeBytes,
        buffer: Buffer.alloc(0)
      });
      const draft = dataStore.createOcrDraft(
        {
          providerConfig: resolvedProvider,
          parsedResult: result,
          fileName: existing.ocrJob.sanitizedFileName ?? existing.ocrJob.originalFileName,
          mimeType: existing.ocrJob.mimeType,
          fileSizeBytes: existing.ocrJob.fileSizeBytes,
          uploadObject: existing.ocrJob.uploadObject,
          providerAttemptCount: attemptCount
        },
        dataset.id
      );

      if (!draft) {
        response.status(404).json({ message: `Unknown dataset "${datasetId}".` });
        return;
      }

      await dataStore.flushDatasetAsync(dataset.id);
      response.json(draft);
    } catch (error) {
      const failureReason = error instanceof Error ? error.message : "OCR retry failed.";
      const failedJob = dataStore.createFailedOcrJob(
        {
          providerConfig: provider.config,
          fileName: existing.ocrJob.sanitizedFileName ?? existing.ocrJob.originalFileName,
          mimeType: existing.ocrJob.mimeType,
          fileSizeBytes: existing.ocrJob.fileSizeBytes,
          failureReason,
          failureCode: "ocr_retry_failed",
          uploadObject: existing.ocrJob.uploadObject,
          providerAttemptCount: attemptCount
        },
        dataset.id
      );
      await dataStore.flushDatasetAsync(dataset.id);
      response.status(422).json({ message: failureReason, ocrJob: failedJob });
    }
  });

  app.post("/api/ocr/jobs/:id/cancel", adminAccess, async (request, response) => {
    const jobId = getRouteParam(request.params.id);
    const datasetId = parseDatasetId(request.query.dataset);
    const dataset = resolveDatasetOrRespond(request, datasetId, response, dataStore);
    if (!dataset) {
      return;
    }

    if (!jobId) {
      response.status(400).json({ message: "OCR job id is required." });
      return;
    }

    const cancelled = dataStore.cancelOcrJob(jobId, dataset.id);
    if (cancelled === null) {
      response.status(404).json({ message: `Unknown dataset "${datasetId}".` });
      return;
    }
    if (cancelled === undefined) {
      response.status(409).json({ message: "OCR job cannot be cancelled." });
      return;
    }

    await dataStore.flushDatasetAsync(dataset.id);
    await recordAudit(
      auditService,
      dataStore,
      request,
      dataset.id,
      "ocr_job_cancelled",
      "ocr_job",
      cancelled.id,
      { provider: cancelled.provider }
    );
    response.json({ ocrJob: cancelled });
  });

  app.get("/api/invoices/:id", memberAccess, (request, response) => {
    const invoiceId = getRouteParam(request.params.id);
    const datasetId = parseDatasetId(request.query.dataset);
    const dataset = resolveDatasetOrRespond(request, datasetId, response, dataStore);
    if (!dataset) {
      return;
    }

    if (!invoiceId) {
      response.status(400).json({ message: "Invoice id is required." });
      return;
    }

    const invoice = dataStore.getInvoice(invoiceId, dataset.id);

    if (!invoice) {
      response.status(404).json({ message: "Invoice not found." });
      return;
    }

    response.json(invoice);
  });

  app.post("/api/invoices/:id/review-confirm", adminAccess, async (request, response) => {
    const invoiceId = getRouteParam(request.params.id);
    const body = request.body as {
      dataset?: unknown;
      supplierId?: unknown;
      invoiceDate?: unknown;
      invoiceNumber?: unknown;
      lines?: unknown;
    };
    const datasetId = parseDatasetId(request.query.dataset ?? body.dataset);
    const dataset = resolveDatasetOrRespond(request, datasetId, response, dataStore);
    if (!dataset) {
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
        !isInvoiceUnit(typedLine.parsedUnit)
      ) {
        response.status(400).json({ message: "Each reviewed line must include valid id, status, quantity, unit, and unit price." });
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

      if (
        typedLine.parsedUnitPriceCents === undefined &&
        typedLine.parsedLineTotalCents === undefined
      ) {
        response.status(400).json({
          message: "Each reviewed line must include unit price or line total."
        });
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

    if (!invoiceId) {
      response.status(400).json({ message: "Invoice id is required." });
      return;
    }

    try {
      const result = dataStore.confirmInvoice(invoiceId, dataset.id, {
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

      await dataStore.flushDatasetAsync(dataset.id);
      await recordAudit(
        auditService,
        dataStore,
        request,
        dataset.id,
        "invoice_review_confirm",
        "invoice",
        result.confirmedInvoice.id,
        {
          confirmedLineCount: result.confirmationSummary?.confirmedLineCount ?? 0,
          ignoredLineCount: result.confirmationSummary?.ignoredLineCount ?? 0,
          alertCount: result.confirmationSummary?.alertCount ?? 0
        }
      );
      await recordAudit(
        auditService,
        dataStore,
        request,
        dataset.id,
        "invoice_confirmed",
        "invoice",
        result.confirmedInvoice.id,
        { confirmedLineCount: result.confirmationSummary?.confirmedLineCount ?? 0 }
      );
      for (const line of result.confirmedLines) {
        await recordAudit(
          auditService,
          dataStore,
          request,
          dataset.id,
          "invoice_line_reviewed",
          "invoice_line",
          line.id,
          { reviewStatus: line.reviewStatus, matchedIngredientId: line.matchedIngredientId }
        );
      }
      for (const history of result.costHistory) {
        await recordAudit(
          auditService,
          dataStore,
          request,
          dataset.id,
          "ingredient_cost_updated",
          "ingredient",
          history.ingredientId,
          { invoiceLineId: history.invoiceLineId, newCostPerUnitCents: history.newCostPerUnitCents }
        );
      }
      for (const alert of result.alerts) {
        await recordAudit(
          auditService,
          dataStore,
          request,
          dataset.id,
          "price_alert_created",
          "price_change_alert",
          alert.id,
          { severity: alert.severity, ingredientId: alert.ingredientId }
        );
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

  app.get("/api/alerts/price-changes", memberAccess, (request, response) => {
    const datasetId = parseDatasetId(request.query.dataset);
    const dataset = resolveDatasetOrRespond(request, datasetId, response, dataStore);
    if (!dataset) {
      return;
    }

    response.json(dataStore.getPriceChangeAlerts(dataset.id));
  });

  app.get("/api/analytics/dishes", memberAccess, (request, response) => {
    const datasetId = parseDatasetId(request.query.dataset);
    const dataset = resolveDatasetOrRespond(request, datasetId, response, dataStore);
    if (!dataset) {
      return;
    }

    response.json(dataStore.getCalculatedDishes(dataset.id));
  });

  app.get("/api/analytics/overview", memberAccess, (request, response) => {
    const datasetId = parseDatasetId(request.query.dataset);
    const dataset = resolveDatasetOrRespond(request, datasetId, response, dataStore);
    if (!dataset) {
      return;
    }

    response.json(dataStore.getOverview(dataset.id));
  });

  app.get("/api/analytics/actions", memberAccess, (request, response) => {
    const datasetId = parseDatasetId(request.query.dataset);
    const dataset = resolveDatasetOrRespond(request, datasetId, response, dataStore);
    if (!dataset) {
      return;
    }

    response.json(dataStore.getAllActions(dataset.id));
  });

  app.get("/api/analytics/dish/:id", memberAccess, (request, response) => {
    const dishId = getRouteParam(request.params.id);
    const datasetId = parseDatasetId(request.query.dataset);
    const dataset = resolveDatasetOrRespond(request, datasetId, response, dataStore);
    if (!dataset) {
      return;
    }

    if (!dishId) {
      response.status(400).json({ message: "Dish id is required." });
      return;
    }

    const detail = dataStore.getDishDetail(dishId, dataset.id);
    if (!detail) {
      response.status(404).json({ message: "Dish not found." });
      return;
    }

    response.json(detail);
  });

  app.post("/api/simulate/price", memberAccess, (request, response) => {
    const datasetId = parseDatasetId(request.query.dataset);
    const dataset = resolveDatasetOrRespond(request, datasetId, response, dataStore);

    if (!dataset) {
      return;
    }

    const { dishId, newPriceCents } = request.body as { dishId?: unknown; newPriceCents?: unknown };

    if (typeof dishId !== "string" || dishId.trim().length === 0 || !isPositivePrice(newPriceCents)) {
      response.status(400).json({ message: "dishId is required and newPriceCents must be a positive number." });
      return;
    }

    const ingredients = dataStore.getIngredients(dataset.id);
    const recipes = dataStore.getRecipes(dataset.id);
    const dishes = dataStore.getDishes(dataset.id);

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

  app.use("/api", (request, response) => {
    response.status(404).json({
      message: `Route ${request.method} ${request.originalUrl} was not found.`
    });
  });

  app.use((error: unknown, _request: express.Request, response: express.Response, next: express.NextFunction) => {
    void next;
    const request = _request;
    if (isMulterLimitError(error)) {
      logApiError(logger, request, 413, "payload_too_large", "Uploaded file is too large.");
      response.status(413).json({
        message: "Uploaded file is too large. Keep OCR fixture uploads under 10MB."
      });
      return;
    }

    const safeMessage =
      error instanceof Error && getNodeEnv(options.env) !== "production"
        ? error.message
        : "The request could not be completed safely.";
    logApiError(logger, request, 500, "internal_error", safeMessage);
    response.status(500).json({ message: safeMessage });
  });

  return app;
}

export function isMulterLimitError(error: unknown) {
  return error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE";
}
