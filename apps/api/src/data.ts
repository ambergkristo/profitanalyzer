import {
  calculateCalculatedDishes,
  calculateOverview,
  calculateRecipeCost,
  confirmInvoiceReview,
  createDefaultSupplierProductMatches,
  createDefaultSuppliers,
  createInvoiceDraftFromOcrResult,
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
  resolveFixtureOcrResult,
  sampleRestaurantData,
  suggestPriceForTargetMargin,
  type AffectedDishImpact,
  type CalculatedDish,
  type DemoDatasetDefinition,
  type DemoDatasetSummary,
  type DishAction,
  type DishDetailAnalytics,
  type Ingredient,
  type IngredientCostHistory,
  type IngredientCostHistoryView,
  type ManualInvoiceDraftInput,
  type MockInvoiceSampleSummary,
  type OcrDraftResponse,
  type OcrInvoiceJob,
  type OcrParsedInvoiceResult,
  type ParsedInvoiceDraft,
  type PriceChangeAlert,
  type PurchaseInvoice,
  type PurchaseInvoiceLine,
  type ReviewedInvoiceLineInput,
  type SimulationTargetAction,
  type StoredInvoiceView,
  type Supplier,
  type SupplierProductMatch
} from "../../../packages/core/src/index.js";

interface StoredInvoiceRecord {
  draft: ParsedInvoiceDraft;
  confirmedInvoice?: PurchaseInvoice;
  confirmedLines?: PurchaseInvoiceLine[];
  confirmationSummary?: StoredInvoiceView["confirmationSummary"];
  affectedDishes?: AffectedDishImpact[];
  alerts?: PriceChangeAlert[];
  ocrJob?: OcrInvoiceJob;
  ocrResult?: OcrParsedInvoiceResult;
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
}

const severityOrder = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1
} as const;

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

function createDatasetSession(datasetId?: string): DatasetSession | null {
  const baseDataset = getDemoDataset(datasetId);

  if (!baseDataset) {
    return null;
  }

  const dataset = cloneDatasetDefinition(baseDataset);
  const restaurantId = dataset.id;

  return {
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
    ocrJobCounter: 0
  };
}

export function createDataStore() {
  const sessions = new Map<string, DatasetSession>();
  const sampleInvoices = getMockInvoiceSamples();

  function getSession(datasetId?: string) {
    const resolvedId = datasetId ?? getDemoDataset()?.id;

    if (!resolvedId) {
      return null;
    }

    if (!sessions.has(resolvedId)) {
      const session = createDatasetSession(resolvedId);

      if (!session) {
        return null;
      }

      sessions.set(resolvedId, session);
    }

    return sessions.get(resolvedId) ?? null;
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
    getResolvedDataset(datasetId?: string): DemoDatasetDefinition | null {
      return getSession(datasetId)?.dataset ?? null;
    },
    getDemoDatasets(): DemoDatasetSummary[] {
      return listDemoDatasets();
    },
    getMockInvoiceSampleSummaries(): MockInvoiceSampleSummary[] {
      return listMockInvoiceSampleSummaries();
    },
    getIngredients(datasetId?: string) {
      return getSession(datasetId)?.ingredients ?? null;
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
    createFixtureOcrDraft(
      input: {
        fileName: string;
        mimeType: string;
        fileSizeBytes: number;
      },
      datasetId?: string
    ): OcrDraftResponse | null {
      const session = getSession(datasetId);

      if (!session) {
        return null;
      }

      session.ocrJobCounter += 1;
      session.invoiceCounter += 1;
      const jobId = `ocr-job-${session.ocrJobCounter.toString().padStart(2, "0")}`;
      const createdAt = `2026-04-28T10:${session.ocrJobCounter.toString().padStart(2, "0")}:00.000Z`;
      const result = resolveFixtureOcrResult(input.fileName);
      const draft = createInvoiceDraftFromOcrResult(
        result,
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
        provider: "fixture",
        status,
        originalFileName: input.fileName,
        mimeType: input.mimeType,
        fileSizeBytes: input.fileSizeBytes,
        createdAt,
        parsedAt: createdAt,
        invoiceDraftId: draft.invoiceDraft.id
      };

      session.invoices.set(draft.invoiceDraft.id, {
        draft,
        ocrJob,
        ocrResult: result
      });
      session.ocrJobs.set(jobId, {
        job: ocrJob,
        result,
        invoiceDraftId: draft.invoiceDraft.id
      });

      return {
        ...draft,
        ocrJob,
        ocrResult: result
      };
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
        summary: draftRecord?.draft.summary
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
        ocrResult: record.ocrResult
      };
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
      session.dataset = {
        ...session.dataset,
        data: {
          ingredients: session.ingredients,
          recipes: session.recipes,
          dishes: session.dishes
        }
      };
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

      return result;
    }
  };
}

export const dataStore = createDataStore();
