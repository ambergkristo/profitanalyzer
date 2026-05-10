import { Prisma, PrismaClient } from "@prisma/client";

import {
  getDefaultPlans,
  getDemoDataset,
  type AffectedDishImpact,
  type DemoDatasetDefinition,
  type Ingredient,
  type IngredientCostHistory,
  type OcrInvoiceJob,
  type OcrParsedInvoiceResult,
  type OcrQualityReport,
  type PriceChangeAlert,
  type PurchaseInvoice,
  type PurchaseInvoiceLine,
  type StoredInvoiceView,
  type Supplier,
  type SupplierProductMatch,
  type UploadStorageObject
} from "../../../../packages/core/src/index.js";
import { createDataStore } from "../data.js";
import type {
  AppMode,
  DatasetExportPayload,
  OnboardingState,
  RestaurantProfile,
  StorageInfo,
  StoreContext
} from "./types.js";
import { createPilotWorkspaceDefinition } from "./seedStore.js";

const defaultUserId = "default-owner-user";
const defaultUserEmail = "owner@profitanalyzer.local";
const defaultUserName = "Default Owner";

type RestaurantWithRelations = Prisma.RestaurantGetPayload<{
  include: {
    ingredients: true;
    recipes: {
      include: {
        ingredients: true;
      };
    };
    dishes: true;
    suppliers: true;
    supplierMatches: true;
    costHistory: true;
    alerts: {
      include: {
        ingredient: true;
        supplier: true;
        invoice: true;
      };
    };
    invoices: {
      include: {
        supplier: true;
        lines: true;
      };
    };
    ocrJobs: true;
  };
}>;

function toIsoString(value: Date | string | null | undefined) {
  if (!value) {
    return undefined;
  }

  return value instanceof Date ? value.toISOString() : value;
}

function parseDate(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  return new Date(value);
}

function cloneJson<T>(value: unknown): T | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

function toInputJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (value === null || value === undefined) {
    return Prisma.JsonNull;
  }

  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function buildWorkspaceId(datasetId: string) {
  return `workspace-${datasetId}`;
}

export function buildStoreContext(datasetId: string, actorUserId?: string): StoreContext {
  return {
    workspaceId: buildWorkspaceId(datasetId),
    restaurantId: datasetId,
    actorUserId
  };
}

function buildSeedDefinitions(appMode: AppMode): DemoDatasetDefinition[] {
  const mixedRestaurant = getDemoDataset("mixed-restaurant");
  const seeded = mixedRestaurant ? [mixedRestaurant] : [];

  if (appMode === "pilot") {
    return [...seeded, createPilotWorkspaceDefinition()];
  }

  return seeded;
}

function buildSeedPayloads(appMode: AppMode, exportedFromAppVersion: string): DatasetExportPayload[] {
  const extraDatasets = appMode === "pilot" ? [createPilotWorkspaceDefinition()] : [];
  const seedStore = createDataStore({
    extraDatasets,
    exportedFromAppVersion
  });

  return buildSeedDefinitions(appMode)
    .map((dataset) => seedStore.exportDataset(dataset.id))
    .filter((payload): payload is DatasetExportPayload => payload !== null);
}

function buildDatasetMeta(dataset: DemoDatasetDefinition) {
  return {
    description: dataset.description,
    profile: dataset.profile,
    ownerDiagnosis: dataset.ownerDiagnosis,
    expectedBehavior: dataset.expectedBehavior,
    demoNarrative: dataset.demoNarrative,
    validationStatus: dataset.validationStatus
  };
}

function normalizeSupplierName(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function coerceDatasetMeta(
  datasetId: string,
  restaurantName: string,
  datasetMetaJson: unknown,
  payloadData: DemoDatasetDefinition["data"]
): DemoDatasetDefinition {
  const meta = cloneJson<Partial<DemoDatasetDefinition>>(datasetMetaJson) ?? {};
  const profile =
    meta.profile === "high-margin" || meta.profile === "low-margin" || meta.profile === "mixed"
      ? meta.profile
      : "mixed";
  const validationStatus = meta.validationStatus === "pass" ? "pass" : "pass";

  return {
    id: datasetId,
    name: restaurantName,
    description: typeof meta.description === "string" ? meta.description : `${restaurantName} workspace`,
    profile,
    ownerDiagnosis:
      typeof meta.ownerDiagnosis === "string"
        ? meta.ownerDiagnosis
        : "Restaurant workspace is ready for dashboard and cost analysis.",
    expectedBehavior:
      typeof meta.expectedBehavior === "string"
        ? meta.expectedBehavior
        : "This workspace should support menu, invoice, and cost review flows.",
    demoNarrative:
      typeof meta.demoNarrative === "string"
        ? meta.demoNarrative
        : "Workspace data loaded from the persistent application store.",
    validationStatus,
    data: payloadData
  };
}

function mapIngredients(ingredients: RestaurantWithRelations["ingredients"]): Ingredient[] {
  return ingredients.map((ingredient) => ({
    id: ingredient.id,
    name: ingredient.name,
    costPerUnitCents: ingredient.costPerUnitCents,
    unit: ingredient.unit as Ingredient["unit"]
  }));
}

function mapSuppliers(suppliers: RestaurantWithRelations["suppliers"]): Supplier[] {
  return suppliers.map((supplier) => ({
    id: supplier.id,
    restaurantId: supplier.restaurantId,
    name: supplier.name,
    normalizedName: supplier.normalizedName,
    contactLabel: supplier.contactLabel ?? undefined,
    createdAt: toIsoString(supplier.createdAt)
  }));
}

function mapSupplierMatches(
  matches: RestaurantWithRelations["supplierMatches"]
): SupplierProductMatch[] {
  return matches.map((match) => ({
    id: match.id,
    restaurantId: match.restaurantId,
    supplierId: match.supplierId,
    rawProductName: match.rawProductName,
    normalizedProductName: match.normalizedProductName,
    ingredientId: match.ingredientId,
    confidence: match.confidence,
    lastConfirmedAt: match.lastConfirmedAt.toISOString()
  }));
}

function mapCostHistory(entries: RestaurantWithRelations["costHistory"]): IngredientCostHistory[] {
  return entries.map((entry) => ({
    id: entry.id,
    ingredientId: entry.ingredientId,
    supplierId: entry.supplierId ?? "",
    invoiceLineId: entry.invoiceLineId ?? "",
    previousCostPerUnitCents: entry.previousCostPerUnitCents ?? undefined,
    newCostPerUnitCents: entry.newCostPerUnitCents,
    unit: entry.unit as IngredientCostHistory["unit"],
    effectiveDate: entry.effectiveDate.toISOString(),
    createdAt: entry.createdAt.toISOString()
  }));
}

function mapAlerts(
  alerts: RestaurantWithRelations["alerts"],
  dishesById: Map<string, { name: string }>
): PriceChangeAlert[] {
  return alerts.map((alert) => {
    const affectedDishIds = cloneJson<string[]>(alert.affectedDishIdsJson) ?? [];

    return {
      id: alert.id,
      type: alert.type,
      severity: alert.severity,
      ingredientId: alert.ingredientId,
      ingredientName: alert.ingredient.name,
      supplierId: alert.supplierId ?? undefined,
      supplierName: alert.supplier?.name ?? undefined,
      invoiceId: alert.invoiceId ?? undefined,
      invoiceLineId: alert.invoiceLineId ?? undefined,
      sourceInvoiceNumber: alert.invoice?.invoiceNumber ?? undefined,
      sourceInvoiceDate: toIsoString(alert.invoice?.invoiceDate),
      sourceType: alert.invoice?.sourceType ?? undefined,
      previousCostPerUnitCents: alert.previousCostPerUnitCents ?? undefined,
      newCostPerUnitCents: alert.newCostPerUnitCents,
      deltaPercent: alert.deltaPercent ?? undefined,
      affectedDishIds,
      affectedDishNames: affectedDishIds
        .map((dishId) => dishesById.get(dishId)?.name)
        .filter((name): name is string => Boolean(name)),
      estimatedMarginImpactCents: alert.estimatedMarginImpactCents ?? undefined,
      message: alert.message,
      recommendedAction: alert.recommendedAction,
      createdAt: alert.createdAt.toISOString(),
      status: alert.status
    };
  });
}

function mapInvoice(invoice: RestaurantWithRelations["invoices"][number]): PurchaseInvoice {
  return {
    id: invoice.id,
    restaurantId: invoice.restaurantId,
    supplierId: invoice.supplierId,
    invoiceNumber: invoice.invoiceNumber ?? undefined,
    invoiceDate: invoice.invoiceDate.toISOString().slice(0, 10),
    sourceType: invoice.sourceType,
    sourceImageUrl: invoice.sourceImageUrl ?? undefined,
    parseStatus: invoice.parseStatus,
    totalAmountCents: invoice.totalAmountCents ?? undefined,
    createdAt: invoice.createdAt.toISOString()
  };
}

function mapInvoiceLines(
  lines: RestaurantWithRelations["invoices"][number]["lines"]
): PurchaseInvoiceLine[] {
  return lines.map((line) => ({
    id: line.id,
    invoiceId: line.invoiceId,
    rawProductName: line.rawProductName,
    parsedQuantity: line.parsedQuantity,
    parsedUnit: line.parsedUnit as PurchaseInvoiceLine["parsedUnit"],
    parsedUnitPriceCents: line.parsedUnitPriceCents ?? undefined,
    parsedLineTotalCents: line.parsedLineTotalCents ?? undefined,
    matchedIngredientId: line.matchedIngredientId ?? undefined,
    matchConfidence: line.matchConfidence,
    reviewStatus: line.reviewStatus,
    previousCostPerUnitCents: line.previousCostPerUnitCents ?? undefined,
    newCostPerUnitCents: line.newCostPerUnitCents ?? undefined,
    priceDeltaPercent: line.priceDeltaPercent ?? undefined,
    warnings: cloneJson<string[]>(line.warningsJson) ?? []
  }));
}

function buildInvoiceViews(
  invoices: RestaurantWithRelations["invoices"],
  alerts: PriceChangeAlert[],
  ocrJobs: OcrInvoiceJob[]
): StoredInvoiceView[] {
  const ocrJobsByInvoiceId = new Map(ocrJobs.filter((job) => job.invoiceDraftId).map((job) => [job.invoiceDraftId!, job]));

  return invoices.map((invoice) => ({
    invoice: mapInvoice(invoice),
    supplierSuggestion:
      cloneJson<StoredInvoiceView["supplierSuggestion"]>(invoice.supplierSuggestionJson) ?? {
        supplierId: invoice.supplierId,
        supplierName: invoice.supplier.name,
        confidence: "high"
      },
    lines: mapInvoiceLines(invoice.lines),
    summary:
      cloneJson<StoredInvoiceView["summary"]>(invoice.summaryJson) ?? {
        totalLines: invoice.lines.length,
        readyLineCount: invoice.lines.filter((line) => line.reviewStatus === "ready").length,
        needsReviewLineCount: invoice.lines.filter((line) => line.reviewStatus === "needs_review").length,
        ignoredLineCount: invoice.lines.filter((line) => line.reviewStatus === "ignored").length,
        highConfidenceCount: invoice.lines.filter((line) => line.matchConfidence === "high").length,
        lowConfidenceCount: invoice.lines.filter((line) =>
          line.matchConfidence === "low" || line.matchConfidence === "none"
        ).length
      },
    confirmationSummary: cloneJson<StoredInvoiceView["confirmationSummary"]>(invoice.confirmationSummaryJson),
    affectedDishes: cloneJson<AffectedDishImpact[]>(invoice.affectedDishesJson),
    alerts: alerts.filter((alert) => alert.invoiceId === invoice.id),
    ocrJob: ocrJobsByInvoiceId.get(invoice.id),
    ocrResult: cloneJson<OcrParsedInvoiceResult>(invoice.ocrResultJson),
    qualityReport: cloneJson<OcrQualityReport>(invoice.qualityReportJson)
  }));
}

function mapOcrJobs(jobs: RestaurantWithRelations["ocrJobs"]): OcrInvoiceJob[] {
  return jobs.map((job) => ({
    id: job.id,
    datasetId: job.restaurantId,
    provider: job.provider as OcrInvoiceJob["provider"],
    status: job.status,
    originalFileName: job.originalFileName,
    sanitizedFileName: job.sanitizedFileName ?? undefined,
    mimeType: job.mimeType,
    fileSizeBytes: job.fileSizeBytes,
    uploadObjectId: job.uploadObjectId ?? undefined,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    parsedAt: toIsoString(job.parsedAt),
    providerAttemptCount: job.providerAttemptCount ?? undefined,
    lastAttemptAt: toIsoString(job.lastAttemptAt),
    nextRetryAt: toIsoString(job.nextRetryAt),
    failureCode: job.failureCode ?? undefined,
    failureReason: job.failureReason ?? undefined,
    invoiceDraftId: job.invoiceDraftId ?? undefined,
    qualityReport: cloneJson<OcrQualityReport>(job.qualityReportJson),
    uploadObject: cloneJson<UploadStorageObject>(job.uploadObjectJson)
  }));
}

function exportRestaurantDataset(
  restaurant: RestaurantWithRelations,
  exportedFromAppVersion: string
): { current: DatasetExportPayload; baseline: DatasetExportPayload } {
  const ingredients = mapIngredients(restaurant.ingredients);
  const recipes = restaurant.recipes.map((recipe) => ({
    id: recipe.id,
    name: recipe.name,
    yield: recipe.yield,
    ingredients: recipe.ingredients.map((ingredient) => ({
      ingredientId: ingredient.ingredientId,
      quantity: ingredient.quantity,
      unit: ingredient.unit as "g" | "ml" | "piece"
    }))
  }));
  const dishes = restaurant.dishes.map((dish) => ({
    id: dish.id,
    name: dish.name,
    recipeId: dish.recipeId,
    priceCents: dish.priceCents,
    salesVolume: dish.salesVolume
  }));
  const dataset = coerceDatasetMeta(restaurant.id, restaurant.name, restaurant.datasetMetaJson, {
    ingredients,
    recipes,
    dishes
  });
  const dishesById = new Map(dishes.map((dish) => [dish.id, { name: dish.name }]));
  const alerts = mapAlerts(restaurant.alerts, dishesById);
  const ocrJobs = mapOcrJobs(restaurant.ocrJobs);
  const current: DatasetExportPayload = {
    schemaVersion: 1,
    datasetId: restaurant.id,
    exportedFromAppVersion,
    dataset,
    ingredients,
    recipes,
    dishes,
    suppliers: mapSuppliers(restaurant.suppliers),
    supplierProductMatches: mapSupplierMatches(restaurant.supplierMatches),
    costHistory: mapCostHistory(restaurant.costHistory),
    alerts,
    invoices: buildInvoiceViews(restaurant.invoices, alerts, ocrJobs),
    ocrJobs,
    onboardingState: cloneJson<OnboardingState>(restaurant.onboardingStateJson),
    restaurantProfile: cloneJson<RestaurantProfile>(restaurant.restaurantProfileJson)
  };

  const baseline = cloneJson<DatasetExportPayload>(restaurant.baselineSnapshotJson) ?? current;

  return { current, baseline };
}

async function replaceRestaurantDataset(
  prisma: Prisma.TransactionClient,
  payload: DatasetExportPayload,
  baselinePayload: DatasetExportPayload
) {
  const workspaceId = buildWorkspaceId(payload.dataset.id);
  const restaurantId = payload.dataset.id;
  const workspaceName = payload.dataset.name;

  for (const plan of getDefaultPlans()) {
    await prisma.plan.upsert({
      where: { code: plan.code },
      update: {
        name: plan.name,
        monthlyPriceCents: plan.monthlyPriceCents,
        currency: plan.currency,
        includedRestaurants: plan.includedRestaurants,
        includedUsers: plan.includedUsers,
        includedInvoicesPerMonth: plan.includedInvoicesPerMonth ?? null,
        featuresJson: plan.features,
        isPublic: plan.isPublic
      },
      create: {
        id: plan.id,
        code: plan.code,
        name: plan.name,
        monthlyPriceCents: plan.monthlyPriceCents,
        currency: plan.currency,
        includedRestaurants: plan.includedRestaurants,
        includedUsers: plan.includedUsers,
        includedInvoicesPerMonth: plan.includedInvoicesPerMonth ?? null,
        featuresJson: plan.features,
        isPublic: plan.isPublic
      }
    });
  }

  await prisma.user.upsert({
    where: { id: defaultUserId },
    update: {
      email: defaultUserEmail,
      name: defaultUserName
    },
    create: {
      id: defaultUserId,
      email: defaultUserEmail,
      name: defaultUserName
    }
  });

  await prisma.workspace.upsert({
    where: { id: workspaceId },
    update: {
      name: workspaceName,
      slug: payload.dataset.id
    },
    create: {
      id: workspaceId,
      name: workspaceName,
      slug: payload.dataset.id
    }
  });

  await prisma.workspaceMembership.upsert({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: defaultUserId
      }
    },
    update: {
      role: "owner"
    },
    create: {
      id: `membership-${payload.dataset.id}`,
      workspaceId,
      userId: defaultUserId,
      role: "owner"
    }
  });

  await prisma.restaurant.upsert({
    where: { id: restaurantId },
    update: {
      workspaceId,
      name: payload.dataset.name,
      currency: "EUR",
      datasetMetaJson: toInputJson(buildDatasetMeta(payload.dataset)),
      baselineSnapshotJson: toInputJson(baselinePayload),
      onboardingStateJson: toInputJson(payload.onboardingState),
      restaurantProfileJson: toInputJson(payload.restaurantProfile)
    },
    create: {
      id: restaurantId,
      workspaceId,
      name: payload.dataset.name,
      currency: "EUR",
      datasetMetaJson: toInputJson(buildDatasetMeta(payload.dataset)),
      baselineSnapshotJson: toInputJson(baselinePayload),
      onboardingStateJson: toInputJson(payload.onboardingState),
      restaurantProfileJson: toInputJson(payload.restaurantProfile)
    }
  });

  await prisma.auditLog.deleteMany({ where: { restaurantId, workspaceId } });
  await prisma.priceChangeAlert.deleteMany({ where: { restaurantId, workspaceId } });
  await prisma.ingredientCostHistory.deleteMany({ where: { restaurantId, workspaceId } });
  await prisma.supplierProductMatch.deleteMany({ where: { restaurantId, workspaceId } });
  await prisma.purchaseInvoiceLine.deleteMany({ where: { restaurantId, workspaceId } });
  await prisma.purchaseInvoice.deleteMany({ where: { restaurantId, workspaceId } });
  await prisma.ocrJob.deleteMany({ where: { restaurantId, workspaceId } });
  await prisma.dish.deleteMany({ where: { restaurantId, workspaceId } });
  await prisma.recipeIngredient.deleteMany({ where: { restaurantId, workspaceId } });
  await prisma.recipe.deleteMany({ where: { restaurantId, workspaceId } });
  await prisma.ingredient.deleteMany({ where: { restaurantId, workspaceId } });
  await prisma.supplier.deleteMany({ where: { restaurantId, workspaceId } });

  if (payload.ingredients.length > 0) {
    await prisma.ingredient.createMany({
      data: payload.ingredients.map((ingredient) => ({
        id: ingredient.id,
        workspaceId,
        restaurantId,
        name: ingredient.name,
        costPerUnitCents: ingredient.costPerUnitCents,
        unit: ingredient.unit
      }))
    });
  }

  if (payload.recipes.length > 0) {
    await prisma.recipe.createMany({
      data: payload.recipes.map((recipe) => ({
        id: recipe.id,
        workspaceId,
        restaurantId,
        name: recipe.name,
        yield: recipe.yield
      }))
    });

    const ingredientIds = new Set(payload.ingredients.map((ingredient) => ingredient.id));
    const recipeIngredients = payload.recipes.flatMap((recipe) =>
      recipe.ingredients
        .filter((ingredient) => ingredientIds.has(ingredient.ingredientId))
        .map((ingredient) => ({
          id: `${recipe.id}:${ingredient.ingredientId}`,
          workspaceId,
          restaurantId,
          recipeId: recipe.id,
          ingredientId: ingredient.ingredientId,
          quantity: ingredient.quantity,
          unit: ingredient.unit
        }))
    );

    if (recipeIngredients.length > 0) {
      await prisma.recipeIngredient.createMany({
        data: recipeIngredients
      });
    }
  }

  if (payload.dishes.length > 0) {
    await prisma.dish.createMany({
      data: payload.dishes.map((dish) => ({
        id: dish.id,
        workspaceId,
        restaurantId,
        recipeId: dish.recipeId,
        name: dish.name,
        priceCents: dish.priceCents,
        salesVolume: dish.salesVolume
      }))
    });
  }

  const suppliersById = new Map(payload.suppliers.map((supplier) => [supplier.id, supplier]));
  for (const invoiceView of payload.invoices) {
    if (!suppliersById.has(invoiceView.invoice.supplierId)) {
      const fallbackName =
        invoiceView.supplierSuggestion?.supplierName?.trim() ||
        invoiceView.invoice.supplierId.replace(/^supplier-/u, "").replace(/[-_]+/g, " ");
      suppliersById.set(invoiceView.invoice.supplierId, {
        id: invoiceView.invoice.supplierId,
        restaurantId,
        name: fallbackName,
        normalizedName: normalizeSupplierName(fallbackName),
        createdAt: invoiceView.invoice.createdAt
      });
    }
  }
  const supplierRows = [...suppliersById.values()];

  if (supplierRows.length > 0) {
    await prisma.supplier.createMany({
      data: supplierRows.map((supplier) => ({
        id: supplier.id,
        workspaceId,
        restaurantId,
        name: supplier.name,
        normalizedName: supplier.normalizedName,
        contactLabel: supplier.contactLabel ?? null,
        createdAt: parseDate(supplier.createdAt) ?? new Date("2026-04-01T00:00:00.000Z")
      }))
    });
  }

  if (payload.invoices.length > 0) {
    await prisma.purchaseInvoice.createMany({
      data: payload.invoices.map((invoiceView) => ({
        id: invoiceView.invoice.id,
        workspaceId,
        restaurantId,
        supplierId: invoiceView.invoice.supplierId,
        invoiceNumber: invoiceView.invoice.invoiceNumber ?? null,
        invoiceDate: new Date(invoiceView.invoice.invoiceDate),
        sourceType: invoiceView.invoice.sourceType,
        sourceImageUrl: invoiceView.invoice.sourceImageUrl ?? null,
        parseStatus: invoiceView.invoice.parseStatus,
        totalAmountCents: invoiceView.invoice.totalAmountCents ?? null,
        supplierSuggestionJson: toInputJson(invoiceView.supplierSuggestion),
        summaryJson: toInputJson(invoiceView.summary),
        confirmationSummaryJson: toInputJson(invoiceView.confirmationSummary),
        affectedDishesJson: toInputJson(invoiceView.affectedDishes),
        ocrResultJson: toInputJson(invoiceView.ocrResult),
        qualityReportJson: toInputJson(invoiceView.qualityReport),
        createdAt: new Date(invoiceView.invoice.createdAt),
        updatedAt: new Date(invoiceView.invoice.createdAt)
      }))
    });

    const invoiceLines = payload.invoices.flatMap((invoiceView) =>
      invoiceView.lines.map((line) => ({
        id: line.id,
        workspaceId,
        restaurantId,
        invoiceId: invoiceView.invoice.id,
        rawProductName: line.rawProductName,
        parsedQuantity: line.parsedQuantity,
        parsedUnit: line.parsedUnit,
        parsedUnitPriceCents: line.parsedUnitPriceCents ?? null,
        parsedLineTotalCents: line.parsedLineTotalCents ?? null,
        matchedIngredientId: line.matchedIngredientId ?? null,
        matchConfidence: line.matchConfidence,
        reviewStatus: line.reviewStatus,
        previousCostPerUnitCents: line.previousCostPerUnitCents ?? null,
        newCostPerUnitCents: line.newCostPerUnitCents ?? null,
        priceDeltaPercent: line.priceDeltaPercent ?? null,
        warningsJson: line.warnings
      }))
    );

    if (invoiceLines.length > 0) {
      await prisma.purchaseInvoiceLine.createMany({
        data: invoiceLines
      });
    }
  }

  if (payload.costHistory.length > 0) {
    await prisma.ingredientCostHistory.createMany({
      data: payload.costHistory.map((entry) => ({
        id: entry.id,
        workspaceId,
        restaurantId,
        ingredientId: entry.ingredientId,
        supplierId: entry.supplierId || null,
        invoiceLineId: entry.invoiceLineId || null,
        previousCostPerUnitCents: entry.previousCostPerUnitCents ?? null,
        newCostPerUnitCents: entry.newCostPerUnitCents,
        unit: entry.unit,
        effectiveDate: new Date(entry.effectiveDate),
        createdAt: new Date(entry.createdAt)
      }))
    });
  }

  if (payload.supplierProductMatches.length > 0) {
    await prisma.supplierProductMatch.createMany({
      data: payload.supplierProductMatches.map((match) => ({
        id: match.id,
        workspaceId,
        restaurantId,
        supplierId: match.supplierId,
        rawProductName: match.rawProductName,
        normalizedProductName: match.normalizedProductName,
        ingredientId: match.ingredientId,
        confidence: match.confidence,
        lastConfirmedAt: new Date(match.lastConfirmedAt)
      }))
    });
  }

  if (payload.alerts.length > 0) {
    await prisma.priceChangeAlert.createMany({
      data: payload.alerts.map((alert) => ({
        id: alert.id,
        workspaceId,
        restaurantId,
        type: alert.type,
        severity: alert.severity,
        ingredientId: alert.ingredientId,
        supplierId: alert.supplierId ?? null,
        invoiceId: alert.invoiceId ?? null,
        invoiceLineId: alert.invoiceLineId ?? null,
        previousCostPerUnitCents: alert.previousCostPerUnitCents ?? null,
        newCostPerUnitCents: alert.newCostPerUnitCents,
        deltaPercent: alert.deltaPercent ?? null,
        affectedDishIdsJson: alert.affectedDishIds,
        estimatedMarginImpactCents: alert.estimatedMarginImpactCents ?? null,
        message: alert.message,
        recommendedAction: alert.recommendedAction,
        status: alert.status,
        createdAt: new Date(alert.createdAt),
        updatedAt: new Date(alert.createdAt)
      }))
    });
  }

  if (payload.ocrJobs.length > 0) {
    await prisma.ocrJob.createMany({
      data: payload.ocrJobs.map((job) => {
        const linkedInvoice = payload.invoices.find((invoice) => invoice.ocrJob?.id === job.id);
        return {
          id: job.id,
          workspaceId,
          restaurantId,
          provider: job.provider,
          status: job.status,
          originalFileName: job.originalFileName,
          sanitizedFileName: job.sanitizedFileName ?? null,
          mimeType: job.mimeType,
          fileSizeBytes: job.fileSizeBytes,
          uploadObjectId: job.uploadObjectId ?? null,
          providerAttemptCount: job.providerAttemptCount ?? null,
          lastAttemptAt: parseDate(job.lastAttemptAt) ?? null,
          nextRetryAt: parseDate(job.nextRetryAt) ?? null,
          createdAt: new Date(job.createdAt),
          updatedAt: parseDate(job.updatedAt) ?? new Date(job.createdAt),
          parsedAt: parseDate(job.parsedAt) ?? null,
          failureCode: job.failureCode ?? null,
          failureReason: job.failureReason ?? null,
          invoiceDraftId: job.invoiceDraftId ?? null,
          qualityReportJson: toInputJson(job.qualityReport),
          uploadObjectJson: toInputJson(job.uploadObject),
          resultJson: toInputJson(linkedInvoice?.ocrResult)
        };
      })
    });
  }

  await prisma.auditLog.create({
    data: {
      id: `audit-sync-${restaurantId}`,
      workspaceId,
      restaurantId,
      actorUserId: defaultUserId,
      action: "dataset_sync",
      entityType: "restaurant_dataset",
      entityId: restaurantId,
      metadataJson: {
        datasetId: payload.dataset.id,
        invoiceCount: payload.invoices.length,
        alertCount: payload.alerts.length
      }
    }
  });
}

export async function persistDatasetPayload(
  prisma: PrismaClient,
  payload: DatasetExportPayload,
  baselinePayload: DatasetExportPayload
) {
  await prisma.$transaction(async (transaction) => {
    await replaceRestaurantDataset(transaction, payload, baselinePayload);
  });
}

export async function loadDatabaseDatasets(
  prisma: PrismaClient,
  exportedFromAppVersion: string
): Promise<Array<{ current: DatasetExportPayload; baseline: DatasetExportPayload }>> {
  const restaurants = await prisma.restaurant.findMany({
    orderBy: {
      createdAt: "asc"
    },
    include: {
      ingredients: true,
      recipes: {
        include: {
          ingredients: true
        }
      },
      dishes: true,
      suppliers: true,
      supplierMatches: true,
      costHistory: true,
      alerts: {
        include: {
          ingredient: true,
          supplier: true,
          invoice: true
        }
      },
      invoices: {
        include: {
          supplier: true,
          lines: true
        }
      },
      ocrJobs: true
    }
  });

  return restaurants.map((restaurant) => exportRestaurantDataset(restaurant, exportedFromAppVersion));
}

export async function seedDatabaseDatasetsIfEmpty(
  prisma: PrismaClient,
  options: {
    appMode: AppMode;
    exportedFromAppVersion: string;
  }
) {
  const restaurantCount = await prisma.restaurant.count();

  if (restaurantCount > 0) {
    return;
  }

  const seedPayloads = buildSeedPayloads(options.appMode, options.exportedFromAppVersion);

  for (const payload of seedPayloads) {
    await persistDatasetPayload(prisma, payload, payload);
  }
}

export function buildDatabaseStorageInfo(
  databaseConfigured: boolean,
  isConnected: boolean,
  warning: string | null
): StorageInfo {
  return {
    driver: "database",
    dataDirConfigured: false,
    readable: isConnected,
    writable: isConnected,
    databaseConfigured,
    persistenceWarning: warning
  };
}
