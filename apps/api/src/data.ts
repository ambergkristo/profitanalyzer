import {
  calculateCalculatedDishes,
  calculateOverview,
  calculateRecipeCost,
  buildBillingStatus,
  confirmInvoiceReview,
  createDefaultSupplierProductMatches,
  createDefaultSuppliers,
  createDefaultSubscription,
  createDefaultUsageCounter,
  createInternalDemoEntitlement,
  createInvoiceDraftFromOcrResult,
  getDefaultPlans,
  evaluateOcrQuality,
  applyOcrConfidencePolicy,
  explainDishPerformance,
  getCostDriverInsight,
  getDemoDataset,
  getMockInvoiceSamples,
  listDemoDatasets,
  listMockInvoiceSampleSummaries,
  normalizeName,
  parseManualInvoice,
  parseMockInvoice,
  rankCombinedActions,
  sampleRestaurantData,
  suggestPriceForTargetMargin,
  type AffectedDishImpact,
  type BillingProviderStatus,
  type BillingStatus,
  type CalculatedDish,
  type DemoDatasetDefinition,
  type DemoDatasetSummary,
  type DishAction,
  type DishDetailAnalytics,
  type Ingredient,
  type IngredientCostHistory,
  type IngredientCostHistoryView,
  type LicenseEntitlement,
  type ManualInvoiceDraftInput,
  type MockInvoiceSampleSummary,
  type OcrDraftResponse,
  type OcrInvoiceJob,
  type OcrParsedInvoiceResult,
  type OcrProviderConfig,
  type OcrQualityReport,
  type ParsedInvoiceDraft,
  type PriceChangeAlert,
  type PurchaseInvoice,
  type PurchaseInvoiceLine,
  type ReviewedInvoiceLineInput,
  type SimulationTargetAction,
  type StoredInvoiceView,
  type Supplier,
  type SupplierProductMatch,
  type UsageCounter,
  type WorkspaceSubscription
} from "../../../packages/core/src/index.js";
import type {
  AnalyticsInputSnapshot,
  AppStore,
  DishCreateInput,
  DishUpdateInput,
  DatasetExportPayload,
  IngredientCreateInput,
  IngredientUpdateInput,
  ImportDatasetSummary,
  OnboardingChecklist,
  OnboardingStepId,
  OnboardingStepStatus,
  OnboardingState,
  OnboardingUpdateInput,
  RecipeCreateInput,
  RecipeUpdateInput,
  RestaurantProfile,
  RestaurantProfileUpdateInput,
  ResetDatasetSummary,
  SupplierCreateInput,
  SupplierUpdateInput,
  ManualLicenseInput
} from "./store/types.js";

interface StoredInvoiceRecord {
  draft: ParsedInvoiceDraft;
  confirmedInvoice?: PurchaseInvoice;
  confirmedLines?: PurchaseInvoiceLine[];
  confirmationSummary?: StoredInvoiceView["confirmationSummary"];
  affectedDishes?: AffectedDishImpact[];
  alerts?: PriceChangeAlert[];
  ocrJob?: OcrInvoiceJob;
  ocrResult?: OcrParsedInvoiceResult;
  qualityReport?: OcrQualityReport;
}

interface StoredOcrJobRecord {
  job: OcrInvoiceJob;
  result?: OcrParsedInvoiceResult;
  invoiceDraftId?: string;
}

interface DatasetSession {
  dataset: DemoDatasetDefinition;
  ingredients: Ingredient[];
  recipes: DemoDatasetDefinition["data"]["recipes"];
  dishes: DemoDatasetDefinition["data"]["dishes"];
  suppliers: Supplier[];
  supplierProductMatches: SupplierProductMatch[];
  costHistory: IngredientCostHistory[];
  alerts: PriceChangeAlert[];
  invoices: Map<string, StoredInvoiceRecord>;
  invoiceCounter: number;
  ocrJobs: Map<string, StoredOcrJobRecord>;
  ocrJobCounter: number;
  onboardingState: OnboardingState;
  restaurantProfile: RestaurantProfile;
  subscription: WorkspaceSubscription;
  entitlements: LicenseEntitlement[];
  usage: UsageCounter;
  baseline: DatasetExportPayload;
}

const severityOrder = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1
} as const;

const defaultMemoryStorageInfo = {
  driver: "memory",
  dataDirConfigured: false,
  readable: true,
  writable: true,
  persistenceWarning: "This build uses memory storage. Restarting the API resets data."
} as const;

const onboardingSteps: OnboardingStepId[] = [
  "restaurant_profile",
  "ingredients",
  "recipes",
  "dishes",
  "suppliers",
  "first_invoice",
  "dashboard_review"
];

const onboardingStepLabels: Record<OnboardingStepId, string> = {
  restaurant_profile: "Restaurant profile",
  ingredients: "Ingredients",
  recipes: "Recipes",
  dishes: "Dishes",
  suppliers: "Suppliers",
  first_invoice: "First invoice",
  dashboard_review: "Dashboard review"
};

const deterministicOnboardingCreatedAt = "2026-04-30T00:00:00.000Z";
const deterministicBillingUpdatedAt = "2026-05-05T00:00:00.000Z";

function toDatasetSummary(dataset: DemoDatasetDefinition): DemoDatasetSummary {
  return {
    id: dataset.id,
    name: dataset.name,
    description: dataset.description,
    profile: dataset.profile,
    ownerDiagnosis: dataset.ownerDiagnosis,
    expectedBehavior: dataset.expectedBehavior,
    demoNarrative: dataset.demoNarrative,
    validationStatus: dataset.validationStatus
  };
}

function cloneDatasetDefinition(dataset: DemoDatasetDefinition): DemoDatasetDefinition {
  return {
    ...dataset,
    data: {
      ingredients: dataset.data.ingredients.map((ingredient) => ({ ...ingredient })),
      recipes: dataset.data.recipes.map((recipe) => ({
        ...recipe,
        ingredients: recipe.ingredients.map((ingredient) => ({ ...ingredient }))
      })),
      dishes: dataset.data.dishes.map((dish) => ({ ...dish }))
    }
  };
}

function cloneExportPayload(payload: DatasetExportPayload): DatasetExportPayload {
  return JSON.parse(JSON.stringify(payload)) as DatasetExportPayload;
}

function cloneStoredInvoiceView(record: StoredInvoiceView): StoredInvoiceView {
  return JSON.parse(JSON.stringify(record)) as StoredInvoiceView;
}

function buildTargetMarginActions(
  priceCents: number,
  costCents: number
): SimulationTargetAction[] {
  const targets = [50, 60]
    .map((targetMarginPercent) => {
      const targetPriceCents = suggestPriceForTargetMargin(costCents, targetMarginPercent);
      const increasePercent =
        priceCents <= 0 ? 0 : ((targetPriceCents - priceCents) / priceCents) * 100;

      return {
        label: `Reach ${targetMarginPercent}% margin`,
        targetMarginPercent,
        priceCents: targetPriceCents,
        isAggressive: increasePercent > 25
      };
    })
    .filter((target) => target.priceCents > priceCents)
    .filter((target) => target.targetMarginPercent === 50 || !target.isAggressive);

  return targets;
}

export interface CreateDataStoreOptions {
  extraDatasets?: DemoDatasetDefinition[];
  storageInfo?: Partial<AppStore["getStorageInfo"] extends () => infer T ? T : never>;
  exportedFromAppVersion?: string;
}

function resolveDatasetDefinition(
  datasetId: string | undefined,
  extraDatasets: DemoDatasetDefinition[]
): DemoDatasetDefinition | undefined {
  return extraDatasets.find((dataset) => dataset.id === datasetId) ?? getDemoDataset(datasetId);
}

function createDatasetSession(
  datasetId: string | undefined,
  extraDatasets: DemoDatasetDefinition[]
): DatasetSession | null {
  const baseDataset = resolveDatasetDefinition(datasetId, extraDatasets);

  if (!baseDataset) {
    return null;
  }

  const dataset = cloneDatasetDefinition(baseDataset);
  const restaurantId = dataset.id;

  const session: DatasetSession = {
    dataset,
    ingredients: dataset.data.ingredients,
    recipes: dataset.data.recipes,
    dishes: dataset.data.dishes,
    suppliers: createDefaultSuppliers(restaurantId),
    supplierProductMatches: createDefaultSupplierProductMatches(restaurantId),
    costHistory: [],
    alerts: [],
    invoices: new Map<string, StoredInvoiceRecord>(),
    invoiceCounter: 0,
    ocrJobs: new Map<string, StoredOcrJobRecord>(),
    ocrJobCounter: 0,
    onboardingState: createOnboardingState(dataset.id),
    restaurantProfile: createRestaurantProfile(dataset),
    ...createDefaultBillingState(dataset.id),
    baseline: {} as DatasetExportPayload
  };

  session.baseline = serializeDatasetSession(session, "0.1.0");

  return session;
}

function syncDatasetData(session: DatasetSession) {
  session.dataset = {
    ...session.dataset,
    data: {
      ingredients: session.ingredients,
      recipes: session.recipes,
      dishes: session.dishes
    }
  };
}

function createUniqueId(prefix: string, name: string, existingIds: Set<string>) {
  const base =
    normalizeName(name)
      .replaceAll(" ", "-")
      .replace(/[^a-z0-9-]+/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || prefix;
  let candidate = `${prefix}-${base}`;
  let index = 2;

  while (existingIds.has(candidate)) {
    candidate = `${prefix}-${base}-${index}`;
    index += 1;
  }

  return candidate;
}

function buildWorkspaceId(datasetId: string) {
  return `workspace-${datasetId}`;
}

function uniqueOnboardingSteps(steps: OnboardingStepId[] | undefined) {
  return onboardingSteps.filter((step) => steps?.includes(step));
}

function calculateOnboardingProgress(completedSteps: OnboardingStepId[], skippedSteps: OnboardingStepId[]) {
  const done = new Set([...completedSteps, ...skippedSteps]);
  return Math.round((done.size / onboardingSteps.length) * 100);
}

function createOnboardingState(datasetId: string): OnboardingState {
  return {
    workspaceId: buildWorkspaceId(datasetId),
    restaurantId: datasetId,
    currentStep: "restaurant_profile",
    completedSteps: [],
    skippedSteps: [],
    progressPercent: 0,
    createdAt: deterministicOnboardingCreatedAt,
    updatedAt: deterministicOnboardingCreatedAt
  };
}

function normalizeOnboardingState(datasetId: string, state?: OnboardingState): OnboardingState {
  const completedSteps = uniqueOnboardingSteps(state?.completedSteps);
  const skippedSteps = uniqueOnboardingSteps(state?.skippedSteps).filter(
    (step) => !completedSteps.includes(step)
  );
  const currentStep =
    state?.currentStep && onboardingSteps.includes(state.currentStep)
      ? state.currentStep
      : onboardingSteps.find((step) => !completedSteps.includes(step) && !skippedSteps.includes(step)) ??
        "dashboard_review";

  return {
    workspaceId: buildWorkspaceId(datasetId),
    restaurantId: datasetId,
    currentStep,
    completedSteps,
    skippedSteps,
    progressPercent: calculateOnboardingProgress(completedSteps, skippedSteps),
    createdAt: state?.createdAt ?? deterministicOnboardingCreatedAt,
    updatedAt: state?.updatedAt ?? deterministicOnboardingCreatedAt
  };
}

function createRestaurantProfile(dataset: DemoDatasetDefinition, profile?: RestaurantProfile): RestaurantProfile {
  return {
    workspaceId: buildWorkspaceId(dataset.id),
    restaurantId: dataset.id,
    name: profile?.name?.trim() || dataset.name,
    currency: profile?.currency?.trim() || "EUR",
    country: profile?.country,
    concept: profile?.concept,
    averageMonthlyDishSalesEstimate: profile?.averageMonthlyDishSalesEstimate,
    updatedAt: profile?.updatedAt ?? deterministicOnboardingCreatedAt
  };
}

function createDefaultBillingState(datasetId: string) {
  const workspaceId = buildWorkspaceId(datasetId);
  return {
    subscription: createDefaultSubscription(workspaceId),
    entitlements: [createInternalDemoEntitlement(workspaceId)],
    usage: createDefaultUsageCounter(workspaceId)
  };
}

function cloneSubscription(subscription: WorkspaceSubscription): WorkspaceSubscription {
  return { ...subscription };
}

function cloneEntitlements(entitlements: LicenseEntitlement[]): LicenseEntitlement[] {
  return entitlements.map((entitlement) => ({ ...entitlement }));
}

function cloneUsage(usage: UsageCounter): UsageCounter {
  return { ...usage };
}

function defaultBillingProviderStatus(): BillingProviderStatus {
  return {
    id: "none",
    displayName: "No payment provider",
    isConfigured: true,
    mode: "none",
    supportsCheckout: false,
    message: "Billing is tracked manually; no payment provider is connected."
  };
}

function buildOnboardingChecklist(session: DatasetSession): OnboardingChecklist {
  const confirmedInvoiceCount = [...session.invoices.values()].filter((record) => record.confirmedInvoice).length;
  const dashboardReady = session.ingredients.length >= 5 && session.recipes.length >= 2 && session.dishes.length >= 2;
  const state = session.onboardingState;
  const statusFor = (step: OnboardingStepId, condition: boolean): "not_started" | "in_progress" | "complete" | "skipped" => {
    if (state.completedSteps.includes(step) || condition) {
      return "complete";
    }

    if (state.skippedSteps.includes(step)) {
      return "skipped";
    }

    return state.currentStep === step ? "in_progress" : "not_started";
  };

  const createItem = (
    step: OnboardingStepId,
    label: string,
    status: OnboardingStepStatus,
    required: boolean,
    detail: string,
    message: string,
    count?: number,
    minimum?: number
  ): OnboardingChecklist["items"][number] => ({
    id: step,
    step,
    label,
    status,
    complete: status === "complete" || status === "skipped",
    required,
    detail,
    message,
    count,
    minimum
  });

  const items = [
    createItem(
      "restaurant_profile",
      onboardingStepLabels.restaurant_profile,
      statusFor("restaurant_profile", session.restaurantProfile.name.trim().length > 0),
      true,
      session.restaurantProfile.name,
      session.restaurantProfile.name.trim().length > 0
        ? "Restaurant profile is saved."
        : "Save the restaurant name and operating basics."
    ),
    createItem(
      "ingredients",
      onboardingStepLabels.ingredients,
      statusFor("ingredients", session.ingredients.length >= 5),
      true,
      `${session.ingredients.length} ingredients`,
      session.ingredients.length >= 5
        ? "Enough key ingredients exist for first margin calculations."
        : "Add at least 5 key ingredients to start useful dish costing.",
      session.ingredients.length,
      5
    ),
    createItem(
      "recipes",
      onboardingStepLabels.recipes,
      statusFor("recipes", session.recipes.length >= 2),
      true,
      `${session.recipes.length} recipes`,
      session.recipes.length >= 2
        ? "Recipe setup is ready for initial dish costing."
        : "Create at least 2 recipes that connect ingredients to dishes.",
      session.recipes.length,
      2
    ),
    createItem(
      "dishes",
      onboardingStepLabels.dishes,
      statusFor("dishes", session.dishes.length >= 2),
      true,
      `${session.dishes.length} dishes`,
      session.dishes.length >= 2
        ? "Dish setup can feed dashboard and simulator views."
        : "Add at least 2 priced dishes linked to recipes.",
      session.dishes.length,
      2
    ),
    createItem(
      "suppliers",
      onboardingStepLabels.suppliers,
      statusFor("suppliers", session.suppliers.length >= 1),
      false,
      `${session.suppliers.length} suppliers`,
      session.suppliers.length >= 1
        ? "Supplier setup is ready for invoice cost intake."
        : "Add at least one supplier for invoice cost updates and alerts.",
      session.suppliers.length,
      1
    ),
    createItem(
      "first_invoice",
      onboardingStepLabels.first_invoice,
      statusFor("first_invoice", confirmedInvoiceCount >= 1),
      false,
      `${confirmedInvoiceCount} confirmed invoices`,
      confirmedInvoiceCount >= 1
        ? "First invoice has been confirmed through review-confirm."
        : "Confirm a first invoice or skip this step for menu-only setup.",
      confirmedInvoiceCount,
      1
    ),
    createItem(
      "dashboard_review",
      onboardingStepLabels.dashboard_review,
      statusFor("dashboard_review", dashboardReady && session.alerts.length + session.dishes.length > 0),
      true,
      dashboardReady ? "Dashboard has enough menu data" : "Needs minimum setup data",
      dashboardReady
        ? "Dashboard can compute first useful actions."
        : "Complete the minimum menu setup before dashboard review."
    )
  ];
  const completed = items.filter((item) => item.status === "complete" || item.status === "skipped").length;

  return {
    workspaceId: state.workspaceId,
    restaurantId: state.restaurantId,
    progressPercent: Math.round((completed / onboardingSteps.length) * 100),
    minimumUsefulDataReady: dashboardReady,
    dashboardReady,
    items,
    summary: {
      ingredientCount: session.ingredients.length,
      recipeCount: session.recipes.length,
      dishCount: session.dishes.length,
      supplierCount: session.suppliers.length,
      confirmedInvoiceCount,
      alertCount: session.alerts.length
    }
  };
}

function serializeDatasetSession(
  session: DatasetSession,
  exportedFromAppVersion: string
): DatasetExportPayload {
  return {
    schemaVersion: 1,
    datasetId: session.dataset.id,
    exportedFromAppVersion,
    dataset: cloneDatasetDefinition(session.dataset),
    ingredients: session.ingredients.map((ingredient) => ({ ...ingredient })),
    recipes: session.recipes.map((recipe) => ({
      ...recipe,
      ingredients: recipe.ingredients.map((ingredient) => ({ ...ingredient }))
    })),
    dishes: session.dishes.map((dish) => ({ ...dish })),
    suppliers: session.suppliers.map((supplier) => ({ ...supplier })),
    supplierProductMatches: session.supplierProductMatches.map((match) => ({ ...match })),
    costHistory: session.costHistory.map((entry) => ({ ...entry })),
    alerts: session.alerts.map((alert) => ({ ...alert })),
    invoices: [...session.invoices.values()].map((record) =>
      cloneStoredInvoiceView({
        invoice: record.confirmedInvoice ?? record.draft.invoiceDraft,
        supplierSuggestion: record.draft.supplierSuggestion,
        lines: record.confirmedLines ?? record.draft.lines,
        summary: record.draft.summary,
        confirmationSummary: record.confirmationSummary,
        affectedDishes: record.affectedDishes,
        alerts: record.alerts,
        ocrJob: record.ocrJob,
        ocrResult: record.ocrResult,
        qualityReport: record.qualityReport
      })
    ),
    ocrJobs: [...session.ocrJobs.values()].map((record) => ({
      ...record.job,
      qualityReport: record.job.qualityReport
        ? {
            ...record.job.qualityReport,
            warnings: [...record.job.qualityReport.warnings]
          }
        : undefined
    })),
    onboardingState: { ...session.onboardingState },
    restaurantProfile: { ...session.restaurantProfile },
    plans: getDefaultPlans(),
    subscription: cloneSubscription(session.subscription),
    entitlements: cloneEntitlements(session.entitlements),
    usage: cloneUsage(session.usage)
  };
}

function createSessionFromExportPayload(
  payload: DatasetExportPayload,
  datasetId?: string
): DatasetSession {
  const imported = cloneExportPayload(payload);
  const targetDatasetId = datasetId ?? imported.dataset.id;
  const dataset: DemoDatasetDefinition = {
    ...imported.dataset,
    id: targetDatasetId,
    data: {
      ingredients: imported.ingredients.map((ingredient) => ({ ...ingredient })),
      recipes: imported.recipes.map((recipe) => ({
        ...recipe,
        ingredients: recipe.ingredients.map((ingredient) => ({ ...ingredient }))
      })),
      dishes: imported.dishes.map((dish) => ({ ...dish }))
    }
  };

  const invoices = new Map<string, StoredInvoiceRecord>();
  for (const invoice of imported.invoices) {
    invoices.set(invoice.invoice.id, {
      draft: {
        invoiceDraft: {
          ...invoice.invoice
        },
        supplierSuggestion: { ...invoice.supplierSuggestion },
        lines: invoice.lines.map((line) => ({ ...line })),
        summary: { ...invoice.summary }
      },
      confirmedInvoice:
        invoice.confirmationSummary || invoice.invoice.parseStatus === "confirmed"
          ? { ...invoice.invoice }
          : undefined,
      confirmedLines:
        invoice.confirmationSummary || invoice.invoice.parseStatus === "confirmed"
          ? invoice.lines.map((line) => ({ ...line }))
          : undefined,
      confirmationSummary: invoice.confirmationSummary
        ? {
            ...invoice.confirmationSummary,
            topAffectedDishes: invoice.confirmationSummary.topAffectedDishes.map((dish) => ({
              ...dish
            }))
          }
        : undefined,
      affectedDishes: invoice.affectedDishes?.map((dish) => ({ ...dish })),
      alerts: invoice.alerts?.map((alert) => ({ ...alert })),
      ocrJob: invoice.ocrJob ? { ...invoice.ocrJob } : undefined,
      ocrResult: invoice.ocrResult
        ? {
            ...invoice.ocrResult,
            warnings: [...invoice.ocrResult.warnings],
            lines: invoice.ocrResult.lines.map((line) => ({
              ...line,
              warnings: [...line.warnings]
            }))
          }
        : undefined,
      qualityReport: invoice.qualityReport
        ? {
            ...invoice.qualityReport,
            warnings: [...invoice.qualityReport.warnings]
          }
        : undefined
    });
  }

  const ocrJobs = new Map<string, StoredOcrJobRecord>();
  for (const job of imported.ocrJobs) {
    ocrJobs.set(job.id, {
      job: {
        ...job,
        qualityReport: job.qualityReport
          ? {
              ...job.qualityReport,
              warnings: [...job.qualityReport.warnings]
            }
          : undefined
      },
      invoiceDraftId: job.invoiceDraftId
    });
  }

  const session: DatasetSession = {
    dataset,
    ingredients: dataset.data.ingredients,
    recipes: dataset.data.recipes,
    dishes: dataset.data.dishes,
    suppliers: imported.suppliers.map((supplier) => ({ ...supplier, restaurantId: targetDatasetId })),
    supplierProductMatches: imported.supplierProductMatches.map((match) => ({
      ...match,
      restaurantId: targetDatasetId
    })),
    costHistory: imported.costHistory.map((entry) => ({ ...entry })),
    alerts: imported.alerts.map((alert) => ({ ...alert })),
    invoices,
    invoiceCounter: imported.invoices.length,
    ocrJobs,
    ocrJobCounter: imported.ocrJobs.length,
    onboardingState: normalizeOnboardingState(targetDatasetId, imported.onboardingState),
    restaurantProfile: createRestaurantProfile(dataset, imported.restaurantProfile),
    subscription: imported.subscription
      ? { ...imported.subscription, workspaceId: buildWorkspaceId(targetDatasetId) }
      : createDefaultBillingState(targetDatasetId).subscription,
    entitlements: imported.entitlements
      ? imported.entitlements.map((entitlement) => ({
          ...entitlement,
          workspaceId: buildWorkspaceId(targetDatasetId)
        }))
      : createDefaultBillingState(targetDatasetId).entitlements,
    usage: imported.usage
      ? { ...imported.usage, workspaceId: buildWorkspaceId(targetDatasetId) }
      : createDefaultBillingState(targetDatasetId).usage,
    baseline: {} as DatasetExportPayload
  };

  session.baseline = cloneExportPayload(imported);

  return session;
}

export function createDataStore(options: CreateDataStoreOptions = {}): AppStore {
  const sessions = new Map<string, DatasetSession>();
  const sampleInvoices = getMockInvoiceSamples();
  const extraDatasets = options.extraDatasets ?? [];
  const storageInfo = {
    ...defaultMemoryStorageInfo,
    ...(options.storageInfo ?? {})
  };
  const exportedFromAppVersion = options.exportedFromAppVersion ?? "0.1.0";
  const defaultDatasetId = resolveDatasetDefinition(undefined, extraDatasets)?.id;
  const seededDatasetSummaries = [
    ...listDemoDatasets(),
    ...extraDatasets
      .filter((dataset) => !listDemoDatasets().some((candidate) => candidate.id === dataset.id))
      .map((dataset) => toDatasetSummary(dataset))
  ];

  function getSession(datasetId?: string) {
    const resolvedId = datasetId ?? defaultDatasetId;

    if (!resolvedId) {
      return null;
    }

    if (!sessions.has(resolvedId)) {
      const session = createDatasetSession(resolvedId, extraDatasets);

      if (!session) {
        return null;
      }

      session.baseline = serializeDatasetSession(session, exportedFromAppVersion);

      sessions.set(resolvedId, session);
    }

    return sessions.get(resolvedId) ?? null;
  }

  function buildDatasetSummaries() {
    const knownDatasets = new Map(
      seededDatasetSummaries.map((dataset) => [dataset.id, { ...dataset } satisfies DemoDatasetSummary])
    );

    for (const session of sessions.values()) {
      if (!knownDatasets.has(session.dataset.id)) {
        knownDatasets.set(session.dataset.id, toDatasetSummary(session.dataset));
      }
    }

    return [...knownDatasets.values()];
  }

  function ensureSupplier(session: DatasetSession, supplierName: string) {
    const normalizedName = normalizeName(supplierName);
    const existing = session.suppliers.find(
      (supplier) => supplier.normalizedName === normalizedName
    );

    if (existing) {
      return existing;
    }

    const supplier: Supplier = {
      id: `supplier-manual-${normalizedName.replaceAll(" ", "-")}`,
      restaurantId: session.dataset.id,
      name: supplierName.trim(),
      normalizedName,
      createdAt: "2026-04-01T00:00:00.000Z"
    };

    session.suppliers = [...session.suppliers, supplier];
    return supplier;
  }

  function getInvoiceByLineId(session: DatasetSession, invoiceLineId: string) {
    for (const record of session.invoices.values()) {
      const lines = record.confirmedLines ?? record.draft.lines;
      if (lines.some((line) => line.id === invoiceLineId)) {
        return record.confirmedInvoice ?? record.draft.invoiceDraft;
      }
    }

    return null;
  }

  function getAnalyticsSnapshot(datasetId?: string) {
    const session = getSession(datasetId);

    if (!session) {
      return null;
    }

    const calculatedDishes = calculateCalculatedDishes({
      ingredients: session.ingredients,
      recipes: session.recipes,
      dishes: session.dishes
    });
    const actions = rankCombinedActions({
      calculatedDishes,
      invoiceAlerts: session.alerts
    });

    return {
      session,
      calculatedDishes,
      actions,
      overview: calculateOverview(calculatedDishes, session.alerts)
    };
  }

  return {
    restaurantData: sampleRestaurantData,
    initialize() {
      return Promise.resolve();
    },
    getStoreContext(datasetId?: string) {
      const session = getSession(datasetId);

      if (!session) {
        return null;
      }

      return {
        workspaceId: `workspace-${session.dataset.id}`,
        restaurantId: session.dataset.id
      };
    },
    getStorageType() {
      return storageInfo.driver;
    },
    getStorageInfo() {
      return { ...storageInfo };
    },
    getResolvedDataset(datasetId?: string): DemoDatasetDefinition | null {
      return getSession(datasetId)?.dataset ?? null;
    },
    flushDataset(datasetId: string) {
      return getSession(datasetId) !== null;
    },
    flushDatasetAsync(datasetId: string) {
      return Promise.resolve(getSession(datasetId) !== null);
    },
    listDatasets(): DemoDatasetSummary[] {
      return buildDatasetSummaries().map((dataset) => ({ ...dataset }));
    },
    getDemoDatasets(): DemoDatasetSummary[] {
      return buildDatasetSummaries().map((dataset) => ({ ...dataset }));
    },
    getBillingPlans(includeInternal = false) {
      return getDefaultPlans()
        .filter((plan) => includeInternal || plan.isPublic)
        .map((plan) => ({ ...plan, features: [...plan.features] }));
    },
    getBillingStatus(datasetId?: string, providerStatus = defaultBillingProviderStatus()): BillingStatus | null {
      const session = getSession(datasetId);

      if (!session) {
        return null;
      }

      return buildBillingStatus({
        workspaceId: buildWorkspaceId(session.dataset.id),
        plans: getDefaultPlans(),
        subscription: session.subscription,
        entitlements: session.entitlements,
        usage: {
          ...session.usage,
          usersCount: 1,
          restaurantsCount: 1
        },
        billingProviderStatus: providerStatus
      });
    },
    grantManualLicense(input: ManualLicenseInput, datasetId?: string): BillingStatus | null | undefined {
      const session = getSession(datasetId);

      if (!session) {
        return null;
      }

      const workspaceId = buildWorkspaceId(session.dataset.id);
      if (input.workspaceId && input.workspaceId !== workspaceId) {
        return undefined;
      }

      const entitlement: LicenseEntitlement = {
        id: `entitlement-${workspaceId}-${input.type}`,
        workspaceId,
        type: input.type,
        status: "active",
        startsAt: deterministicBillingUpdatedAt,
        notes: input.notes?.trim() || undefined,
        createdAt: deterministicBillingUpdatedAt,
        updatedAt: deterministicBillingUpdatedAt
      };

      session.entitlements = [
        ...session.entitlements.filter((candidate) => candidate.id !== entitlement.id),
        entitlement
      ];

      if (input.type === "founding_partner_lifetime") {
        session.subscription = {
          ...session.subscription,
          planCode: "founding_partner",
          status: "lifetime",
          billingProvider: "manual",
          lifetimeAccessReason: input.notes?.trim() || "Founding partner lifetime access.",
          updatedAt: deterministicBillingUpdatedAt
        };
      } else if (input.type === "manual_comp") {
        session.subscription = {
          ...session.subscription,
          status: "active",
          billingProvider: "manual",
          updatedAt: deterministicBillingUpdatedAt
        };
      } else {
        session.subscription = {
          ...session.subscription,
          planCode: "internal_demo",
          status: "internal",
          billingProvider: "none",
          updatedAt: deterministicBillingUpdatedAt
        };
      }

      return this.getBillingStatus(session.dataset.id);
    },
    startTrial(datasetId?: string): BillingStatus | null {
      const session = getSession(datasetId);

      if (!session) {
        return null;
      }

      session.subscription = {
        ...session.subscription,
        planCode: "starter",
        status: "trialing",
        billingProvider: "none",
        trialEndsAt: "2026-06-05T00:00:00.000Z",
        updatedAt: deterministicBillingUpdatedAt
      };

      return this.getBillingStatus(session.dataset.id);
    },
    getBillingUsage(datasetId?: string) {
      const session = getSession(datasetId);
      return session
        ? {
            ...session.usage,
            usersCount: 1,
            restaurantsCount: 1
          }
        : null;
    },
    getMockInvoiceSampleSummaries(): MockInvoiceSampleSummary[] {
      return listMockInvoiceSampleSummaries();
    },
    getIngredients(datasetId?: string) {
      return getSession(datasetId)?.ingredients ?? null;
    },
    getAnalyticsInput(datasetId?: string): AnalyticsInputSnapshot | null {
      const snapshot = getAnalyticsSnapshot(datasetId);

      if (!snapshot) {
        return null;
      }

      return {
        ingredients: snapshot.session.ingredients.map((ingredient) => ({ ...ingredient })),
        recipes: snapshot.session.recipes.map((recipe) => ({
          ...recipe,
          ingredients: recipe.ingredients.map((ingredient) => ({ ...ingredient }))
        })),
        dishes: snapshot.session.dishes.map((dish) => ({ ...dish })),
        alerts: snapshot.session.alerts.map((alert) => ({ ...alert }))
      };
    },
    getRecipes(datasetId?: string) {
      return getSession(datasetId)?.recipes ?? null;
    },
    getDishes(datasetId?: string) {
      return getSession(datasetId)?.dishes ?? null;
    },
    getSuppliers(datasetId?: string) {
      return getSession(datasetId)?.suppliers ?? null;
    },
    createSupplier(input: SupplierCreateInput, datasetId?: string) {
      const session = getSession(datasetId);

      if (!session) {
        return null;
      }

      const normalizedName = normalizeName(input.name);
      if (!normalizedName) {
        return undefined;
      }

      const existingIds = new Set(session.suppliers.map((supplier) => supplier.id));
      const supplier: Supplier = {
        id: input.id && !existingIds.has(input.id)
          ? input.id
          : createUniqueId("supplier", input.name, existingIds),
        restaurantId: session.dataset.id,
        name: input.name.trim(),
        normalizedName,
        contactLabel: input.contactLabel?.trim() || undefined,
        createdAt: "2026-04-01T00:00:00.000Z"
      };

      session.suppliers = [...session.suppliers, supplier];
      return supplier;
    },
    updateSupplier(supplierId: string, input: SupplierUpdateInput, datasetId?: string) {
      const session = getSession(datasetId);

      if (!session) {
        return null;
      }

      const currentSupplier = session.suppliers.find((supplier) => supplier.id === supplierId);
      if (!currentSupplier) {
        return undefined;
      }

      const nextName = input.name?.trim() || currentSupplier.name;
      const supplier: Supplier = {
        ...currentSupplier,
        name: nextName,
        normalizedName: normalizeName(nextName),
        contactLabel:
          input.contactLabel === undefined
            ? currentSupplier.contactLabel
            : input.contactLabel.trim() || undefined
      };

      session.suppliers = session.suppliers.map((candidate) =>
        candidate.id === supplierId ? supplier : candidate
      );
      return supplier;
    },
    getRestaurantProfile(datasetId?: string) {
      const session = getSession(datasetId);
      return session ? { ...session.restaurantProfile } : null;
    },
    updateRestaurantProfile(input: RestaurantProfileUpdateInput, datasetId?: string) {
      const session = getSession(datasetId);

      if (!session) {
        return null;
      }

      const nextProfile: RestaurantProfile = {
        ...session.restaurantProfile,
        name: input.name?.trim() || session.restaurantProfile.name,
        currency: input.currency?.trim() || session.restaurantProfile.currency,
        country: input.country === undefined ? session.restaurantProfile.country : input.country.trim() || undefined,
        concept: input.concept === undefined ? session.restaurantProfile.concept : input.concept.trim() || undefined,
        averageMonthlyDishSalesEstimate:
          input.averageMonthlyDishSalesEstimate ?? session.restaurantProfile.averageMonthlyDishSalesEstimate,
        updatedAt: deterministicOnboardingCreatedAt
      };

      session.restaurantProfile = nextProfile;
      session.dataset = {
        ...session.dataset,
        name: nextProfile.name
      };

      return { ...nextProfile };
    },
    getOnboardingState(datasetId?: string) {
      const session = getSession(datasetId);
      return session ? { ...session.onboardingState } : null;
    },
    updateOnboardingState(input: OnboardingUpdateInput, datasetId?: string) {
      const session = getSession(datasetId);

      if (!session) {
        return null;
      }

      const completedSteps = uniqueOnboardingSteps(input.completedSteps ?? session.onboardingState.completedSteps);
      const skippedSteps = uniqueOnboardingSteps(input.skippedSteps ?? session.onboardingState.skippedSteps).filter(
        (step) => !completedSteps.includes(step)
      );
      const currentStep =
        input.currentStep && onboardingSteps.includes(input.currentStep)
          ? input.currentStep
          : session.onboardingState.currentStep;

      session.onboardingState = normalizeOnboardingState(session.dataset.id, {
        ...session.onboardingState,
        currentStep,
        completedSteps,
        skippedSteps,
        updatedAt: deterministicOnboardingCreatedAt
      });

      return { ...session.onboardingState };
    },
    completeOnboardingStep(step: OnboardingStepId, datasetId?: string) {
      const session = getSession(datasetId);

      if (!session) {
        return null;
      }

      if (!onboardingSteps.includes(step)) {
        return null;
      }

      const completedSteps = uniqueOnboardingSteps([...session.onboardingState.completedSteps, step]);
      const skippedSteps = session.onboardingState.skippedSteps.filter((candidate) => candidate !== step);
      const currentStep = onboardingSteps.find((candidate) => !completedSteps.includes(candidate) && !skippedSteps.includes(candidate)) ?? step;

      return this.updateOnboardingState({ currentStep, completedSteps, skippedSteps }, session.dataset.id);
    },
    skipOnboardingStep(step: OnboardingStepId, datasetId?: string) {
      const session = getSession(datasetId);

      if (!session) {
        return null;
      }

      if (!onboardingSteps.includes(step)) {
        return null;
      }

      const completedSteps = session.onboardingState.completedSteps.filter((candidate) => candidate !== step);
      const skippedSteps = uniqueOnboardingSteps([...session.onboardingState.skippedSteps, step]);
      const currentStep = onboardingSteps.find((candidate) => !completedSteps.includes(candidate) && !skippedSteps.includes(candidate)) ?? step;

      return this.updateOnboardingState({ currentStep, completedSteps, skippedSteps }, session.dataset.id);
    },
    getOnboardingChecklist(datasetId?: string) {
      const session = getSession(datasetId);
      return session ? buildOnboardingChecklist(session) : null;
    },
    getCalculatedDishes(datasetId?: string): CalculatedDish[] | null {
      return getAnalyticsSnapshot(datasetId)?.calculatedDishes ?? null;
    },
    getAllActions(datasetId?: string): DishAction[] | null {
      return getAnalyticsSnapshot(datasetId)?.actions ?? null;
    },
    getOverview(datasetId?: string) {
      return getAnalyticsSnapshot(datasetId)?.overview ?? null;
    },
    getPriceChangeAlerts(datasetId?: string) {
      const session = getSession(datasetId);

      if (!session) {
        return null;
      }

      return [...session.alerts].sort((left, right) => {
        const severityDifference = severityOrder[right.severity] - severityOrder[left.severity];

        if (severityDifference !== 0) {
          return severityDifference;
        }

        return right.createdAt.localeCompare(left.createdAt);
      });
    },
    getIngredientCostHistory(ingredientId: string, datasetId?: string) {
      const session = getSession(datasetId);

      if (!session) {
        return null;
      }

      const ingredient = session.ingredients.find((item) => item.id === ingredientId);

      if (!ingredient) {
        return undefined;
      }

      const history = session.costHistory
        .filter((entry) => entry.ingredientId === ingredientId)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .map((entry) => {
          const invoice = getInvoiceByLineId(session, entry.invoiceLineId);
          const supplier = session.suppliers.find((item) => item.id === entry.supplierId);
          const deltaPercent =
            typeof entry.previousCostPerUnitCents === "number" && entry.previousCostPerUnitCents > 0
              ? Number(
                  (
                    ((entry.newCostPerUnitCents - entry.previousCostPerUnitCents) /
                      entry.previousCostPerUnitCents) *
                    100
                  ).toFixed(2)
                )
              : undefined;

          return {
            id: entry.id,
            supplierName: supplier?.name ?? "Unknown supplier",
            invoiceNumber: invoice?.invoiceNumber,
            invoiceDate: invoice?.invoiceDate ?? entry.effectiveDate,
            previousCostPerUnitCents: entry.previousCostPerUnitCents,
            newCostPerUnitCents: entry.newCostPerUnitCents,
            deltaPercent,
            source: invoice?.sourceType ?? "manual",
            createdAt: entry.createdAt
          };
        });

      return {
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        currentCostPerUnitCents: ingredient.costPerUnitCents,
        unit: ingredient.unit,
        history
      } satisfies IngredientCostHistoryView;
    },
    getDishDetail(dishId: string, datasetId?: string): DishDetailAnalytics | null {
      const snapshot = getAnalyticsSnapshot(datasetId);

      if (!snapshot) {
        return null;
      }

      const dish = snapshot.session.dishes.find((item) => item.id === dishId);
      if (!dish) {
        return null;
      }

      const recipe = snapshot.session.recipes.find((item) => item.id === dish.recipeId);
      if (!recipe) {
        return null;
      }

      const metrics = snapshot.calculatedDishes.find((item) => item.dishId === dishId);

      if (!metrics) {
        return null;
      }

      const recipeCost = calculateRecipeCost(recipe, snapshot.session.ingredients);
      const recommendedActionsForDish = snapshot.actions.filter((action) => action.dishId === dishId);
      const simulationAction = recommendedActionsForDish.find(
        (action) => action.recommendedPriceCents !== undefined
      );
      const costDriverInsight = getCostDriverInsight(recipeCost.breakdown);

      return {
        dish,
        recipe,
        metrics,
        ingredientBreakdown: recipeCost.breakdown,
        costDriverInsight,
        explanation: explainDishPerformance(metrics),
        recommendedActionsForDish,
        simulationHints: {
          currentPriceCents: dish.priceCents,
          quickAdjustmentsCents: [50, 100, 200],
          targetMarginActions: buildTargetMarginActions(dish.priceCents, metrics.costCents),
          recommendedPriceCents: simulationAction?.recommendedPriceCents,
          recommendedTargetMarginPercent: simulationAction?.targetMarginPercent,
          note: simulationAction?.recommendedPriceCents
            ? "Use the suggested price as a decision test, then compare the new margin before touching the live menu."
            : "Start with a small price move and compare the simulated status change before updating the live menu."
        }
      };
    },
    parseMockInvoice(sampleInvoiceId: string, datasetId?: string) {
      const session = getSession(datasetId);

      if (!session) {
        return null;
      }

      const sampleInvoice = sampleInvoices.find((candidate) => candidate.id === sampleInvoiceId);

      if (!sampleInvoice) {
        return undefined;
      }

      session.invoiceCounter += 1;
      const draft = parseMockInvoice(
        sampleInvoice,
        session.suppliers,
        session.ingredients,
        session.supplierProductMatches,
        {
          restaurantId: session.dataset.id,
          invoiceId: `${sampleInvoice.id}-${session.invoiceCounter.toString().padStart(2, "0")}`
        }
      );

      session.invoices.set(draft.invoiceDraft.id, { draft });

      return draft;
    },
    createManualInvoiceDraft(input: ManualInvoiceDraftInput, datasetId?: string) {
      const session = getSession(datasetId);

      if (!session) {
        return null;
      }

      const supplier = ensureSupplier(session, input.supplierName);

      session.invoiceCounter += 1;
      const draft = parseManualInvoice(
        input,
        session.suppliers,
        session.ingredients,
        session.supplierProductMatches,
        {
          restaurantId: session.dataset.id,
          supplierId: supplier.id,
          invoiceId: `manual-invoice-${session.invoiceCounter.toString().padStart(2, "0")}`
        }
      );

      session.invoices.set(draft.invoiceDraft.id, { draft });

      return draft;
    },
    createOcrDraft(
      input: {
        providerConfig: OcrProviderConfig;
        parsedResult: OcrParsedInvoiceResult;
        fileName: string;
        mimeType: string;
        fileSizeBytes: number;
        uploadObject?: import("./store/types.js").UploadStorageObject;
        providerAttemptCount?: number;
      },
      datasetId?: string
    ): OcrDraftResponse | null {
      const session = getSession(datasetId);

      if (!session) {
        return null;
      }

      session.usage = {
        ...session.usage,
        ocrUploads: session.usage.ocrUploads + 1,
        updatedAt: deterministicBillingUpdatedAt
      };
      session.ocrJobCounter += 1;
      session.invoiceCounter += 1;
      const jobId = `ocr-job-${session.ocrJobCounter.toString().padStart(2, "0")}`;
      const createdAt = `2026-04-28T10:${session.ocrJobCounter.toString().padStart(2, "0")}:00.000Z`;
      const qualityReport = applyOcrConfidencePolicy(input.parsedResult, evaluateOcrQuality(input.parsedResult));
      const draft = createInvoiceDraftFromOcrResult(
        input.parsedResult,
        session.suppliers,
        session.ingredients,
        session.supplierProductMatches,
        {
          restaurantId: session.dataset.id,
          createdAt,
          invoiceId: `ocr-invoice-${session.invoiceCounter.toString().padStart(2, "0")}`,
          invoiceKey: `ocr-${jobId}`
        }
      );
      const status =
        draft.invoiceDraft.parseStatus === "needs_review" ? "needs_review" : "parsed";
      const ocrJob: OcrInvoiceJob = {
        id: jobId,
        datasetId: session.dataset.id,
        provider: input.providerConfig.id,
        providerDisplayName: input.providerConfig.displayName,
        status,
        uploadObjectId: input.uploadObject?.id,
        originalFileName: input.fileName,
        sanitizedFileName: input.uploadObject?.sanitizedFileName ?? input.fileName,
        mimeType: input.mimeType,
        fileSizeBytes: input.fileSizeBytes,
        createdAt,
        updatedAt: createdAt,
        parsedAt: createdAt,
        providerAttemptCount: input.providerAttemptCount ?? 1,
        lastAttemptAt: createdAt,
        invoiceDraftId: draft.invoiceDraft.id,
        qualityReport,
        uploadObject: input.uploadObject
      };

      session.invoices.set(draft.invoiceDraft.id, {
        draft,
        ocrJob,
        ocrResult: input.parsedResult,
        qualityReport
      });
      session.ocrJobs.set(jobId, {
        job: ocrJob,
        result: input.parsedResult,
        invoiceDraftId: draft.invoiceDraft.id
      });

      return {
        ...draft,
        ocrJob,
        ocrResult: input.parsedResult,
        qualityReport,
        providerConfig: input.providerConfig
      };
    },
    createFailedOcrJob(
      input: {
        providerConfig: OcrProviderConfig;
        fileName: string;
        mimeType: string;
        fileSizeBytes: number;
        failureReason: string;
        failureCode?: string;
        uploadObject?: import("./store/types.js").UploadStorageObject;
        providerAttemptCount?: number;
      },
      datasetId?: string
    ) {
      const session = getSession(datasetId);

      if (!session) {
        return null;
      }

      session.usage = {
        ...session.usage,
        ocrUploads: session.usage.ocrUploads + 1,
        updatedAt: deterministicBillingUpdatedAt
      };
      session.ocrJobCounter += 1;
      const jobId = `ocr-job-${session.ocrJobCounter.toString().padStart(2, "0")}`;
      const createdAt = `2026-04-28T10:${session.ocrJobCounter.toString().padStart(2, "0")}:00.000Z`;
      const ocrJob: OcrInvoiceJob = {
        id: jobId,
        datasetId: session.dataset.id,
        provider: input.providerConfig.id,
        providerDisplayName: input.providerConfig.displayName,
        status: "failed",
        uploadObjectId: input.uploadObject?.id,
        originalFileName: input.fileName,
        sanitizedFileName: input.uploadObject?.sanitizedFileName ?? input.fileName,
        mimeType: input.mimeType,
        fileSizeBytes: input.fileSizeBytes,
        createdAt,
        updatedAt: createdAt,
        providerAttemptCount: input.providerAttemptCount ?? 1,
        lastAttemptAt: createdAt,
        failureCode: input.failureCode,
        failureReason: input.failureReason,
        uploadObject: input.uploadObject
      };

      session.ocrJobs.set(jobId, {
        job: ocrJob
      });

      return ocrJob;
    },
    cancelOcrJob(jobId: string, datasetId?: string) {
      const session = getSession(datasetId);

      if (!session) {
        return null;
      }

      const record = session.ocrJobs.get(jobId);

      if (!record) {
        return undefined;
      }

      if (record.job.status === "parsed" || record.job.status === "needs_review") {
        return undefined;
      }

      const updatedAt = record.job.createdAt;
      record.job = {
        ...record.job,
        status: "cancelled",
        updatedAt,
        failureCode: "cancelled",
        failureReason: "OCR job was cancelled before creating a review draft."
      };
      session.ocrJobs.set(jobId, record);
      return record.job;
    },
    getOcrJob(jobId: string, datasetId?: string) {
      const session = getSession(datasetId);

      if (!session) {
        return null;
      }

      const record = session.ocrJobs.get(jobId);

      if (!record) {
        return undefined;
      }

      const draftRecord = record.invoiceDraftId
        ? session.invoices.get(record.invoiceDraftId)
        : undefined;

      return {
        ocrJob: record.job,
        ocrResult: record.result,
        invoiceDraft: draftRecord?.draft.invoiceDraft,
        summary: draftRecord?.draft.summary,
        qualityReport: record.job.qualityReport ?? draftRecord?.qualityReport
      };
    },
    listOcrJobs(datasetId?: string) {
      const session = getSession(datasetId);

      if (!session) {
        return null;
      }

      return [...session.ocrJobs.values()]
        .map((record) => record.job)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    },
    getInvoice(invoiceId: string, datasetId?: string): StoredInvoiceView | null {
      const session = getSession(datasetId);

      if (!session) {
        return null;
      }

      const record = session.invoices.get(invoiceId);

      if (!record) {
        return null;
      }

      return {
        invoice: record.confirmedInvoice ?? record.draft.invoiceDraft,
        supplierSuggestion: record.draft.supplierSuggestion,
        lines: record.confirmedLines ?? record.draft.lines,
        summary: record.draft.summary,
        confirmationSummary: record.confirmationSummary,
        affectedDishes: record.affectedDishes,
        alerts: record.alerts,
        ocrJob: record.ocrJob,
        ocrResult: record.ocrResult,
        qualityReport: record.qualityReport
      };
    },
    createIngredient(input: IngredientCreateInput, datasetId?: string) {
      const session = getSession(datasetId);

      if (!session) {
        return null;
      }

      const existingIds = new Set(session.ingredients.map((ingredient) => ingredient.id));
      const ingredient: Ingredient = {
        id: input.id && !existingIds.has(input.id)
          ? input.id
          : createUniqueId("ingredient", input.name, existingIds),
        name: input.name.trim(),
        costPerUnitCents: input.costPerUnitCents,
        unit: input.unit
      };

      session.ingredients = [...session.ingredients, ingredient];
      syncDatasetData(session);

      return ingredient;
    },
    updateIngredient(ingredientId: string, input: IngredientUpdateInput, datasetId?: string) {
      const session = getSession(datasetId);

      if (!session) {
        return null;
      }

      const currentIngredient = session.ingredients.find((ingredient) => ingredient.id === ingredientId);

      if (!currentIngredient) {
        return undefined;
      }

      const updatedIngredient: Ingredient = {
        ...currentIngredient,
        name: input.name?.trim() || currentIngredient.name,
        costPerUnitCents: input.costPerUnitCents ?? currentIngredient.costPerUnitCents,
        unit: input.unit ?? currentIngredient.unit
      };

      session.ingredients = session.ingredients.map((ingredient) =>
        ingredient.id === ingredientId ? updatedIngredient : ingredient
      );
      syncDatasetData(session);

      return updatedIngredient;
    },
    createRecipe(input: RecipeCreateInput, datasetId?: string) {
      const session = getSession(datasetId);

      if (!session) {
        return null;
      }

      const ingredientIds = new Set(session.ingredients.map((ingredient) => ingredient.id));
      if (input.ingredients.some((ingredient) => !ingredientIds.has(ingredient.ingredientId))) {
        return undefined;
      }

      const existingIds = new Set(session.recipes.map((recipe) => recipe.id));
      const recipe: DemoDatasetDefinition["data"]["recipes"][number] = {
        id: input.id && !existingIds.has(input.id)
          ? input.id
          : createUniqueId("recipe", input.name, existingIds),
        name: input.name.trim(),
        yield: input.yield,
        ingredients: input.ingredients.map((ingredient) => ({ ...ingredient }))
      };

      session.recipes = [...session.recipes, recipe];
      syncDatasetData(session);

      return recipe;
    },
    updateRecipe(recipeId: string, input: RecipeUpdateInput, datasetId?: string) {
      const session = getSession(datasetId);

      if (!session) {
        return null;
      }

      const currentRecipe = session.recipes.find((recipe) => recipe.id === recipeId);

      if (!currentRecipe) {
        return undefined;
      }

      const ingredientIds = new Set(session.ingredients.map((ingredient) => ingredient.id));
      if (input.ingredients?.some((ingredient) => !ingredientIds.has(ingredient.ingredientId))) {
        return undefined;
      }

      const updatedRecipe: DemoDatasetDefinition["data"]["recipes"][number] = {
        ...currentRecipe,
        name: input.name?.trim() || currentRecipe.name,
        yield: input.yield ?? currentRecipe.yield,
        ingredients: input.ingredients
          ? input.ingredients.map((ingredient) => ({ ...ingredient }))
          : currentRecipe.ingredients.map((ingredient) => ({ ...ingredient }))
      };

      session.recipes = session.recipes.map((recipe) => (recipe.id === recipeId ? updatedRecipe : recipe));
      syncDatasetData(session);

      return updatedRecipe;
    },
    createDish(input: DishCreateInput, datasetId?: string) {
      const session = getSession(datasetId);

      if (!session) {
        return null;
      }

      if (!session.recipes.some((recipe) => recipe.id === input.recipeId)) {
        return undefined;
      }

      const existingIds = new Set(session.dishes.map((dish) => dish.id));
      const dish: DemoDatasetDefinition["data"]["dishes"][number] = {
        id: input.id && !existingIds.has(input.id)
          ? input.id
          : createUniqueId("dish", input.name, existingIds),
        name: input.name.trim(),
        recipeId: input.recipeId,
        priceCents: input.priceCents,
        salesVolume: input.salesVolume
      };

      session.dishes = [...session.dishes, dish];
      syncDatasetData(session);

      return dish;
    },
    updateDish(dishId: string, input: DishUpdateInput, datasetId?: string) {
      const session = getSession(datasetId);

      if (!session) {
        return null;
      }

      const currentDish = session.dishes.find((dish) => dish.id === dishId);

      if (!currentDish) {
        return undefined;
      }

      if (input.recipeId && !session.recipes.some((recipe) => recipe.id === input.recipeId)) {
        return undefined;
      }

      const updatedDish: DemoDatasetDefinition["data"]["dishes"][number] = {
        ...currentDish,
        name: input.name?.trim() || currentDish.name,
        recipeId: input.recipeId ?? currentDish.recipeId,
        priceCents: input.priceCents ?? currentDish.priceCents,
        salesVolume: input.salesVolume ?? currentDish.salesVolume
      };

      session.dishes = session.dishes.map((dish) => (dish.id === dishId ? updatedDish : dish));
      syncDatasetData(session);

      return updatedDish;
    },
    confirmInvoice(
      invoiceId: string,
      datasetId: string | undefined,
      input: {
        supplierId?: string;
        invoiceDate?: string;
        invoiceNumber?: string;
        lines: ReviewedInvoiceLineInput[];
      }
    ) {
      const session = getSession(datasetId);

      if (!session) {
        return null;
      }

      const record = session.invoices.get(invoiceId);

      if (!record) {
        return undefined;
      }

      if (record.confirmedInvoice) {
        throw new Error("Invoice has already been confirmed.");
      }

      const result = confirmInvoiceReview({
        invoiceDraft: record.draft,
        reviewedInvoice: {
          supplierId: input.supplierId,
          invoiceDate: input.invoiceDate,
          invoiceNumber: input.invoiceNumber
        },
        reviewedLines: input.lines,
        ingredients: session.ingredients,
        recipes: session.recipes,
        dishes: session.dishes,
        suppliers: session.suppliers,
        existingCostHistory: session.costHistory,
        existingAlerts: session.alerts,
        existingSupplierProductMatches: session.supplierProductMatches
      });

      session.ingredients = result.updatedIngredients.map((ingredient) => ({ ...ingredient }));
      syncDatasetData(session);
      session.costHistory = [...session.costHistory, ...result.costHistory];
      session.alerts = [...session.alerts, ...result.alerts];

      for (const match of result.supplierProductMatches) {
        const existingIndex = session.supplierProductMatches.findIndex(
          (candidate) =>
            candidate.supplierId === match.supplierId &&
            candidate.normalizedProductName === match.normalizedProductName
        );

        if (existingIndex >= 0) {
          session.supplierProductMatches[existingIndex] = match;
        } else {
          session.supplierProductMatches.push(match);
        }
      }

      record.confirmedInvoice = result.confirmedInvoice;
      record.confirmedLines = result.confirmedLines;
      record.confirmationSummary = result.confirmationSummary;
      record.affectedDishes = result.affectedDishes;
      record.alerts = result.alerts;
      session.usage = {
        ...session.usage,
        invoicesProcessed: session.usage.invoicesProcessed + 1,
        updatedAt: deterministicBillingUpdatedAt
      };

      return result;
    },
    resetDataset(datasetId: string): ResetDatasetSummary | null {
      const existingSession = sessions.get(datasetId);
      const nextSession = existingSession?.baseline
        ? createSessionFromExportPayload(existingSession.baseline, datasetId)
        : createDatasetSession(datasetId, extraDatasets);

      if (!nextSession) {
        return null;
      }

      const summary: ResetDatasetSummary = {
        datasetId,
        clearedInvoices: existingSession?.invoices.size ?? 0,
        clearedCostHistory: existingSession?.costHistory.length ?? 0,
        clearedAlerts: existingSession?.alerts.length ?? 0,
        clearedOcrJobs: existingSession?.ocrJobs.size ?? 0,
        restoredDishCount: nextSession.dishes.length
      };

      sessions.set(datasetId, nextSession);

      return summary;
    },
    exportDataset(datasetId: string): DatasetExportPayload | null {
      const session = getSession(datasetId);

      if (!session) {
        return null;
      }

      return cloneExportPayload(serializeDatasetSession(session, exportedFromAppVersion));
    },
    importDataset(payload: DatasetExportPayload, datasetId?: string): ImportDatasetSummary {
      const targetDatasetId = datasetId ?? payload.dataset.id;
      const nextSession = createSessionFromExportPayload(payload, targetDatasetId);
      sessions.set(targetDatasetId, nextSession);

      return {
        datasetId: targetDatasetId,
        ingredientCount: nextSession.ingredients.length,
        recipeCount: nextSession.recipes.length,
        dishCount: nextSession.dishes.length,
        supplierCount: nextSession.suppliers.length
      } satisfies ImportDatasetSummary;
    }
  };
}

export const dataStore = createDataStore();
