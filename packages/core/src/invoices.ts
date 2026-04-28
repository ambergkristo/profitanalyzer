import { calculateDishMetrics } from "./calculations.js";
import {
  type AffectedDishImpact,
  type Dish,
  type Ingredient,
  type IngredientCostHistory,
  type IngredientUnit,
  type ManualInvoiceDraftInput,
  type MockInvoiceSampleSummary,
  type InvoiceDraftSummary,
  type InvoiceMatchConfidence,
  type InvoiceConfirmationResult,
  type InvoiceReviewStatus,
  type InvoiceUnit,
  type MockInvoiceInput,
  type ParsedInvoiceDraft,
  type PriceChangeAlert,
  type PurchaseInvoice,
  type PurchaseInvoiceLine,
  type Recipe,
  type ReviewedInvoiceLineInput,
  type Supplier,
  type SupplierProductMatch,
  type SupplierSuggestion
} from "./types.js";

interface ParseMockInvoiceOptions {
  restaurantId?: string;
  invoiceId?: string;
  createdAt?: string;
}

interface ParseStructuredInvoiceOptions extends ParseMockInvoiceOptions {
  supplierId?: string;
  sourceType?: PurchaseInvoice["sourceType"];
}

interface StructuredInvoiceLineInput {
  rawProductName: string;
  quantity: number;
  unit: InvoiceUnit;
  unitPriceCents?: number;
  lineTotalCents?: number;
  matchedIngredientId?: string;
  reviewStatus?: Extract<InvoiceReviewStatus, "needs_review" | "ready" | "ignored">;
}

interface ConfirmInvoiceReviewInput {
  invoiceDraft: ParsedInvoiceDraft;
  reviewedInvoice?: {
    supplierId?: string;
    invoiceDate?: string;
    invoiceNumber?: string;
  };
  reviewedLines: ReviewedInvoiceLineInput[];
  ingredients: Ingredient[];
  recipes: Recipe[];
  dishes: Dish[];
  suppliers: Supplier[];
  existingCostHistory: IngredientCostHistory[];
  existingAlerts: PriceChangeAlert[];
  existingSupplierProductMatches: SupplierProductMatch[];
  createdAt?: string;
}

const defaultRestaurantId = "demo-restaurant";

const mockInvoiceSamples: MockInvoiceInput[] = [
  {
    id: "normal-supplier-invoice",
    name: "Metro Fresh Wholesale",
    supplierName: "Metro Fresh Wholesale",
    invoiceNumber: "MFW-2041",
    invoiceDate: "2026-04-08",
    totalAmountCents: 27680,
    description: "Mostly clean produce and dairy invoice with a mix of small cost rises and a few favorable drops.",
    expectedImpact: "Several ingredients update cleanly and produce a balanced mix of cost-up and cost-down alerts.",
    lines: [
      { rawProductName: "Romaine Lettuce Hearts", quantity: 1000, unit: "g", unitPriceCents: 1 },
      { rawProductName: "Parmesan Grated", quantity: 500, unit: "g", unitPriceCents: 7 },
      { rawProductName: "Avocado Halves", quantity: 1000, unit: "g", unitPriceCents: 3 },
      { rawProductName: "Mozzarella Fior di Latte", quantity: 2000, unit: "g", unitPriceCents: 4 },
      { rawProductName: "Tomato Sauce Base", quantity: 1500, unit: "g", lineTotalCents: 3000 },
      { rawProductName: "Citrus Dressing House", quantity: 1000, unit: "ml", unitPriceCents: 5 },
      { rawProductName: "Butter Lettuce Baby", quantity: 600, unit: "g", unitPriceCents: 1 }
    ]
  },
  {
    id: "messy-supplier-invoice",
    name: "KitchenHub Cash & Carry",
    supplierName: "KitchenHub Cash & Carry",
    invoiceNumber: "KHC-7732",
    invoiceDate: "2026-04-14",
    totalAmountCents: 19840,
    description: "Messy mixed-goods invoice with missing unit prices, one unknown item, and one unit mismatch that should be reviewed or ignored.",
    expectedImpact: "Some lines confirm cleanly, while low-confidence and mismatched lines force explicit user review.",
    lines: [
      { rawProductName: "Brioche Buns 12pc", quantity: 12, unit: "pcs", lineTotalCents: 1140 },
      { rawProductName: "Burger Dip House", quantity: 900, unit: "ml", unitPriceCents: 5 },
      { rawProductName: "Flatbread Base Pack", quantity: 1, unit: "pack", unitPriceCents: 1200 },
      { rawProductName: "Vanilla Pods Premium", quantity: 10, unit: "g", unitPriceCents: 24 },
      { rawProductName: "Mystery Herb Mix", quantity: 100, unit: "g", unitPriceCents: 9 },
      { rawProductName: "Dessert Cream 1L", quantity: 1000, unit: "ml", lineTotalCents: 2500 },
      { rawProductName: "Mozza Shred", quantity: 1000, unit: "g", unitPriceCents: 3 }
    ]
  },
  {
    id: "high-impact-price-spike",
    name: "Prime Butchery Co",
    supplierName: "Prime Butchery Co",
    invoiceNumber: "PBC-8840",
    invoiceDate: "2026-04-20",
    totalAmountCents: 54100,
    description: "Protein-heavy invoice with sharp cost jumps designed to surface the dishes that should move first.",
    expectedImpact: "Confirmed updates should create strong alerts and materially reduce margin on high-volume dishes.",
    lines: [
      { rawProductName: "Beef Patty 180g Fresh", quantity: 1000, unit: "g", unitPriceCents: 4 },
      { rawProductName: "Sirloin Steak Trimmed", quantity: 1000, unit: "g", unitPriceCents: 10 },
      { rawProductName: "Salmon Fillet Atlantic", quantity: 1000, unit: "g", unitPriceCents: 8 },
      { rawProductName: "Duck Breast Large", quantity: 1000, unit: "g", unitPriceCents: 9 },
      { rawProductName: "Chicken Breast IQF", quantity: 1000, unit: "g", unitPriceCents: 3 },
      { rawProductName: "Cheddar Slice Catering", quantity: 1000, unit: "g", unitPriceCents: 7 }
    ]
  }
];

const supplierTemplates = [
  {
    id: "supplier-metro-fresh",
    name: "Metro Fresh Wholesale",
    contactLabel: "Produce and dairy account"
  },
  {
    id: "supplier-kitchenhub",
    name: "KitchenHub Cash & Carry",
    contactLabel: "Mixed dry and chilled goods"
  },
  {
    id: "supplier-prime-butchery",
    name: "Prime Butchery Co",
    contactLabel: "Proteins and premium meat"
  }
] as const;

const supplierProductMatchTemplates = [
  ["supplier-metro-fresh", "Romaine Lettuce Hearts", "romaine", "high"],
  ["supplier-metro-fresh", "Parmesan Grated", "parmesan", "high"],
  ["supplier-metro-fresh", "Avocado Halves", "avocado", "high"],
  ["supplier-metro-fresh", "Mozzarella Fior di Latte", "mozzarella", "high"],
  ["supplier-metro-fresh", "Tomato Sauce Base", "tomato-sauce", "high"],
  ["supplier-metro-fresh", "Citrus Dressing House", "citrus-dressing", "high"],
  ["supplier-metro-fresh", "Butter Lettuce Baby", "lettuce", "high"],
  ["supplier-kitchenhub", "Brioche Buns 12pc", "bun", "high"],
  ["supplier-kitchenhub", "Burger Dip House", "burger-sauce", "medium"],
  ["supplier-kitchenhub", "Dessert Cream 1L", "cream-dessert", "high"],
  ["supplier-kitchenhub", "Vanilla Pods Premium", "vanilla", "medium"],
  ["supplier-prime-butchery", "Beef Patty 180g Fresh", "beef-patty", "high"],
  ["supplier-prime-butchery", "Sirloin Steak Trimmed", "steak", "high"],
  ["supplier-prime-butchery", "Salmon Fillet Atlantic", "salmon", "high"],
  ["supplier-prime-butchery", "Duck Breast Large", "duck-breast", "high"],
  ["supplier-prime-butchery", "Chicken Breast IQF", "chicken", "high"],
  ["supplier-prime-butchery", "Cheddar Slice Catering", "cheddar", "high"]
] as const satisfies ReadonlyArray<
  readonly [string, string, string, InvoiceMatchConfidence]
>;

export function normalizeName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ");
}

function createId(prefix: string, parts: string[]) {
  const normalized = parts
    .map((part) => normalizeName(part).replaceAll(" ", "-"))
    .filter((part) => part.length > 0)
    .join("-");

  return `${prefix}-${normalized}`;
}

function deriveUnitPriceCents(
  quantity: number,
  unitPriceCents: number | undefined,
  lineTotalCents: number | undefined
) {
  if (typeof unitPriceCents === "number" && Number.isFinite(unitPriceCents) && unitPriceCents > 0) {
    return Math.round(unitPriceCents);
  }

  if (
    typeof lineTotalCents === "number" &&
    Number.isFinite(lineTotalCents) &&
    lineTotalCents > 0 &&
    quantity > 0
  ) {
    return Math.round(lineTotalCents / quantity);
  }

  return undefined;
}

function convertInvoiceCostToIngredientUnit(
  invoiceUnitPriceCents: number,
  invoiceUnit: InvoiceUnit,
  ingredientUnit: IngredientUnit
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

function calculateDeltaPercent(previous: number | undefined, next: number | undefined) {
  if (!previous || !next || previous <= 0) {
    return undefined;
  }

  return Number((((next - previous) / previous) * 100).toFixed(2));
}

function scoreIngredientMatch(rawProductName: string, ingredientName: string) {
  const normalizedProduct = normalizeName(rawProductName);
  const normalizedIngredient = normalizeName(ingredientName);

  if (normalizedProduct === normalizedIngredient) {
    return 100;
  }

  if (
    normalizedProduct.includes(normalizedIngredient) ||
    normalizedIngredient.includes(normalizedProduct)
  ) {
    return normalizedIngredient.length >= 5 ? 80 : 60;
  }

  const productTokens = new Set(normalizedProduct.split(" ").filter(Boolean));
  const ingredientTokens = normalizedIngredient.split(" ").filter(Boolean);
  const overlap = ingredientTokens.filter((token) => productTokens.has(token)).length;

  if (overlap >= 2) {
    return 70;
  }

  if (overlap === 1) {
    return 45;
  }

  return 0;
}

function getConfidenceFromScore(score: number): InvoiceMatchConfidence {
  if (score >= 90) {
    return "high";
  }

  if (score >= 65) {
    return "medium";
  }

  if (score >= 40) {
    return "low";
  }

  return "none";
}

function buildDraftSummary(lines: PurchaseInvoiceLine[]): InvoiceDraftSummary {
  return {
    totalLines: lines.length,
    readyLineCount: lines.filter((line) => line.reviewStatus === "ready").length,
    needsReviewLineCount: lines.filter((line) => line.reviewStatus === "needs_review").length,
    ignoredLineCount: lines.filter((line) => line.reviewStatus === "ignored").length,
    highConfidenceCount: lines.filter((line) => line.matchConfidence === "high").length,
    lowConfidenceCount: lines.filter((line) => line.matchConfidence === "low" || line.matchConfidence === "none").length
  };
}

function buildSupplierSuggestion(
  supplierName: string,
  knownSuppliers: Supplier[]
): SupplierSuggestion {
  const normalizedSupplierName = normalizeName(supplierName);
  const exactMatch = knownSuppliers.find(
    (supplier) => supplier.normalizedName === normalizedSupplierName
  );

  if (exactMatch) {
    return {
      supplierId: exactMatch.id,
      supplierName: exactMatch.name,
      confidence: "high"
    };
  }

  const fuzzyMatch = knownSuppliers.find((supplier) =>
    supplier.normalizedName.includes(normalizedSupplierName) ||
    normalizedSupplierName.includes(supplier.normalizedName)
  );

  if (fuzzyMatch) {
    return {
      supplierId: fuzzyMatch.id,
      supplierName: fuzzyMatch.name,
      confidence: "medium"
    };
  }

  return {
    supplierName,
    confidence: "none"
  };
}

function resolveIngredientById(ingredientId: string | undefined, ingredients: Ingredient[]) {
  if (!ingredientId) {
    return undefined;
  }

  return ingredients.find((candidate) => candidate.id === ingredientId);
}

function resolveMatchedIngredient(
  rawProductName: string,
  supplierId: string | undefined,
  ingredients: Ingredient[],
  existingSupplierProductMatches: SupplierProductMatch[]
) {
  const normalizedProductName = normalizeName(rawProductName);

  if (supplierId) {
    const exactAlias = existingSupplierProductMatches.find(
      (match) =>
        match.supplierId === supplierId &&
        match.normalizedProductName === normalizedProductName
    );

    if (exactAlias) {
      const ingredient = ingredients.find((candidate) => candidate.id === exactAlias.ingredientId);

      if (ingredient) {
        return {
          ingredient,
          confidence: "high" as const
        };
      }
    }
  }

  const ranked = ingredients
    .map((ingredient) => ({
      ingredient,
      score: scoreIngredientMatch(rawProductName, ingredient.name)
    }))
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.ingredient.id.localeCompare(right.ingredient.id);
    })[0];

  if (!ranked) {
    return {
      confidence: "none" as const
    };
  }

  return {
    ingredient: ranked.ingredient,
    confidence: getConfidenceFromScore(ranked.score)
  };
}

function buildInvoiceLineWarnings(
  rawProductName: string,
  quantity: number,
  parsedUnitPriceCents: number | undefined,
  ingredient: Ingredient | undefined,
  parsedUnit: InvoiceUnit,
  newCostPerUnitCents: number | undefined,
  confidence: InvoiceMatchConfidence,
  baseWarnings: string[] = []
) {
  const warnings: string[] = [...baseWarnings];

  if (quantity <= 0) {
    warnings.push("Quantity must be greater than zero.");
  }

  if (parsedUnitPriceCents === undefined) {
    warnings.push("Unit price could not be derived from the parsed line.");
  }

  if (!ingredient) {
    warnings.push(`No ingredient match found for "${rawProductName}".`);
  }

  if (ingredient && newCostPerUnitCents === undefined) {
    warnings.push(`Unit mismatch: invoice uses ${parsedUnit}, ingredient is tracked in ${ingredient.unit}.`);
  }

  if (confidence === "low") {
    warnings.push("Ingredient match confidence is low and requires review.");
  }

  if (confidence === "none") {
    warnings.push("Ingredient match is unresolved and must be reviewed or ignored.");
  }

  return warnings;
}

function buildParsedInvoiceDraft(
  input: {
    invoiceKey: string;
    supplierName: string;
    invoiceNumber?: string;
    invoiceDate: string;
    totalAmountCents?: number;
    lines: StructuredInvoiceLineInput[];
  },
  knownSuppliers: Supplier[],
  knownIngredients: Ingredient[],
  existingSupplierProductMatches: SupplierProductMatch[],
  options: ParseStructuredInvoiceOptions = {}
): ParsedInvoiceDraft {
  const createdAt = options.createdAt ?? new Date().toISOString();
  const restaurantId = options.restaurantId ?? defaultRestaurantId;
  const supplierSuggestion = buildSupplierSuggestion(input.supplierName, knownSuppliers);
  const invoiceId =
    options.invoiceId ??
    createId("invoice", [input.invoiceKey, input.invoiceNumber ?? input.supplierName, input.invoiceDate]);
  const resolvedSupplierId =
    options.supplierId ??
    supplierSuggestion.supplierId ??
    createId("supplier-unresolved", [input.supplierName]);

  const lines = input.lines.map<PurchaseInvoiceLine>((line, index) => {
    const parsedUnitPriceCents = deriveUnitPriceCents(
      line.quantity,
      line.unitPriceCents,
      line.lineTotalCents
    );
    const explicitIngredient = resolveIngredientById(line.matchedIngredientId, knownIngredients);
    const matched = explicitIngredient
      ? {
          ingredient: explicitIngredient,
          confidence: "high" as const
        }
      : resolveMatchedIngredient(
          line.rawProductName,
          resolvedSupplierId,
          knownIngredients,
          existingSupplierProductMatches
        );
    const convertedCost =
      parsedUnitPriceCents !== undefined && matched.ingredient
        ? convertInvoiceCostToIngredientUnit(
            parsedUnitPriceCents,
            line.unit,
            matched.ingredient.unit
          )
        : null;
    const previousCostPerUnitCents = matched.ingredient?.costPerUnitCents;
    const nextCostPerUnitCents =
      typeof convertedCost === "number" ? convertedCost : undefined;
    const baseWarnings: string[] = [];

    if (line.matchedIngredientId && !explicitIngredient) {
      baseWarnings.push(`Matched ingredient "${line.matchedIngredientId}" is not valid.`);
    }

    if (line.unitPriceCents === undefined && line.lineTotalCents === undefined) {
      baseWarnings.push("Either a unit price or a line total is required.");
    }

    const warnings = buildInvoiceLineWarnings(
      line.rawProductName,
      line.quantity,
      parsedUnitPriceCents,
      matched.ingredient,
      line.unit,
      nextCostPerUnitCents,
      matched.confidence,
      baseWarnings
    );

    const reviewStatus: InvoiceReviewStatus =
      line.reviewStatus === "ignored"
        ? "ignored"
        : warnings.length > 0 || matched.confidence === "low" || matched.confidence === "none"
          ? "needs_review"
          : "ready";

    return {
      id: `${invoiceId}-line-${index + 1}`,
      invoiceId,
      rawProductName: line.rawProductName,
      parsedQuantity: line.quantity,
      parsedUnit: line.unit,
      parsedUnitPriceCents,
      parsedLineTotalCents:
        line.lineTotalCents ??
        (parsedUnitPriceCents !== undefined ? parsedUnitPriceCents * line.quantity : undefined),
      matchedIngredientId: matched.ingredient?.id,
      matchConfidence: matched.confidence,
      reviewStatus,
      previousCostPerUnitCents,
      newCostPerUnitCents: nextCostPerUnitCents,
      priceDeltaPercent: calculateDeltaPercent(previousCostPerUnitCents, nextCostPerUnitCents),
      warnings
    };
  });

  const invoiceDraft: PurchaseInvoice = {
    id: invoiceId,
    restaurantId,
    supplierId: resolvedSupplierId,
    invoiceNumber: input.invoiceNumber,
    invoiceDate: input.invoiceDate,
    sourceType: options.sourceType ?? "mock",
    parseStatus: lines.some((line) => line.reviewStatus === "needs_review")
      ? "needs_review"
      : "draft",
    totalAmountCents: input.totalAmountCents,
    createdAt
  };

  return {
    invoiceDraft,
    supplierSuggestion: {
      supplierId: supplierSuggestion.supplierId ?? resolvedSupplierId,
      supplierName: supplierSuggestion.supplierName,
      confidence: supplierSuggestion.supplierId || options.supplierId ? "high" : supplierSuggestion.confidence
    },
    lines,
    summary: buildDraftSummary(lines)
  };
}

export function createDefaultSuppliers(restaurantId = defaultRestaurantId, createdAt = "2026-04-01T00:00:00.000Z"): Supplier[] {
  return supplierTemplates.map((supplier) => ({
    id: supplier.id,
    restaurantId,
    name: supplier.name,
    normalizedName: normalizeName(supplier.name),
    contactLabel: supplier.contactLabel,
    createdAt
  }));
}

export function createDefaultSupplierProductMatches(
  restaurantId = defaultRestaurantId,
  createdAt = "2026-04-01T00:00:00.000Z"
): SupplierProductMatch[] {
  return supplierProductMatchTemplates.map(([supplierId, rawProductName, ingredientId, confidence]) => ({
    id: createId("match", [supplierId, rawProductName]),
    restaurantId,
    supplierId,
    rawProductName,
    normalizedProductName: normalizeName(rawProductName),
    ingredientId,
    confidence,
    lastConfirmedAt: createdAt
  }));
}

export function getMockInvoiceSamples(): MockInvoiceInput[] {
  return mockInvoiceSamples.map((invoice) => ({
    ...invoice,
    lines: invoice.lines.map((line) => ({ ...line }))
  }));
}

export function listMockInvoiceSampleSummaries(): MockInvoiceSampleSummary[] {
  return mockInvoiceSamples.map((invoice) => ({
    id: invoice.id,
    name: invoice.name,
    supplierName: invoice.supplierName,
    invoiceDate: invoice.invoiceDate,
    description: invoice.description,
    expectedImpact: invoice.expectedImpact
  }));
}

export function parseMockInvoice(
  input: MockInvoiceInput,
  knownSuppliers: Supplier[],
  knownIngredients: Ingredient[],
  existingSupplierProductMatches: SupplierProductMatch[],
  options: ParseMockInvoiceOptions = {}
): ParsedInvoiceDraft {
  return buildParsedInvoiceDraft(
    {
      invoiceKey: input.id,
      supplierName: input.supplierName,
      invoiceNumber: input.invoiceNumber,
      invoiceDate: input.invoiceDate,
      totalAmountCents: input.totalAmountCents,
      lines: input.lines.map((line) => ({
        rawProductName: line.rawProductName,
        quantity: line.quantity,
        unit: line.unit,
        unitPriceCents: line.unitPriceCents,
        lineTotalCents: line.lineTotalCents
      }))
    },
    knownSuppliers,
    knownIngredients,
    existingSupplierProductMatches,
    options
  );
}

export function parseManualInvoice(
  input: ManualInvoiceDraftInput,
  knownSuppliers: Supplier[],
  knownIngredients: Ingredient[],
  existingSupplierProductMatches: SupplierProductMatch[],
  options: ParseStructuredInvoiceOptions = {}
): ParsedInvoiceDraft {
  return buildParsedInvoiceDraft(
    {
      invoiceKey: "manual",
      supplierName: input.supplierName,
      invoiceNumber: input.invoiceNumber,
      invoiceDate: input.invoiceDate,
      lines: input.lines.map((line) => ({
        rawProductName: line.rawProductName,
        quantity: line.parsedQuantity,
        unit: line.parsedUnit,
        unitPriceCents: line.parsedUnitPriceCents,
        lineTotalCents: line.parsedLineTotalCents,
        matchedIngredientId: line.matchedIngredientId,
        reviewStatus: line.reviewStatus
      }))
    },
    knownSuppliers,
    knownIngredients,
    existingSupplierProductMatches,
    {
      ...options,
      sourceType: "manual"
    }
  );
}

function cloneIngredients(ingredients: Ingredient[]) {
  return ingredients.map((ingredient) => ({ ...ingredient }));
}

function buildAffectedDishImpacts(
  ingredientIds: string[],
  dishes: Dish[],
  recipes: Recipe[],
  previousIngredients: Ingredient[],
  nextIngredients: Ingredient[]
): AffectedDishImpact[] {
  const ingredientIdSet = new Set(ingredientIds);
  const impactedRecipeIds = new Set(
    recipes
      .filter((recipe) =>
        recipe.ingredients.some((ingredient) => ingredientIdSet.has(ingredient.ingredientId))
      )
      .map((recipe) => recipe.id)
  );

  return dishes
    .filter((dish) => impactedRecipeIds.has(dish.recipeId))
    .map((dish) => {
      const recipe = recipes.find((candidate) => candidate.id === dish.recipeId);

      if (!recipe) {
        return null;
      }

      const oldMetrics = calculateDishMetrics(dish, recipe, previousIngredients);
      const newMetrics = calculateDishMetrics(dish, recipe, nextIngredients);

      return {
        dishId: dish.id,
        name: dish.name,
        oldCostCents: oldMetrics.costCents,
        newCostCents: newMetrics.costCents,
        oldMarginPercent: oldMetrics.marginPercent,
        newMarginPercent: newMetrics.marginPercent,
        oldStatus: oldMetrics.status,
        newStatus: newMetrics.status,
        costDeltaPerSaleCents: newMetrics.costCents - oldMetrics.costCents,
        periodProfitImpactCents:
          newMetrics.estimatedPeriodProfitCents - oldMetrics.estimatedPeriodProfitCents,
        salesVolume: dish.salesVolume
      } satisfies AffectedDishImpact;
    })
    .filter((impact): impact is AffectedDishImpact => impact !== null)
    .sort((left, right) => {
      const deltaDifference =
        Math.abs(left.periodProfitImpactCents) - Math.abs(right.periodProfitImpactCents);

      if (deltaDifference !== 0) {
        return deltaDifference > 0 ? -1 : 1;
      }

      return left.dishId.localeCompare(right.dishId);
    });
}

function buildSupplierProductMatchRecord(
  restaurantId: string,
  supplierId: string,
  rawProductName: string,
  ingredientId: string,
  confidence: InvoiceMatchConfidence,
  createdAt: string,
  existingMatch?: SupplierProductMatch
) {
  return {
    id: existingMatch?.id ?? createId("match", [supplierId, rawProductName]),
    restaurantId,
    supplierId,
    rawProductName,
    normalizedProductName: normalizeName(rawProductName),
    ingredientId,
    confidence,
    lastConfirmedAt: createdAt
  } satisfies SupplierProductMatch;
}

function buildIngredientAlert(
  invoice: PurchaseInvoice,
  line: PurchaseInvoiceLine,
  supplier: Supplier,
  ingredientName: string,
  deltaPercent: number,
  affectedDishImpacts: AffectedDishImpact[]
): PriceChangeAlert {
  const topAffectedDish = affectedDishImpacts[0];
  const isIncrease = deltaPercent >= 0;
  const touchesHighSalesDish = affectedDishImpacts.some((dish) => dish.salesVolume >= 150);
  const touchesLossDish = affectedDishImpacts.some((dish) => dish.newStatus === "loss");
  const touchesWarningDish = affectedDishImpacts.some(
    (dish) => dish.oldStatus === "profitable" && dish.newStatus !== "profitable"
  );
  const severity =
    touchesLossDish || (deltaPercent >= 25 && touchesHighSalesDish)
      ? "critical"
      : deltaPercent >= 15 || touchesWarningDish
        ? "high"
        : Math.abs(deltaPercent) >= 5
          ? "medium"
          : "low";

  const directionLabel = isIncrease ? "increased" : "decreased";
  const action =
    isIncrease
      ? "Review affected dishes and test margin repair on the highest-volume items."
      : "Check whether the cost relief creates room to protect margin or promote a strong seller.";

  return {
    id: `${invoice.id}-${line.id}-${isIncrease ? "up" : "down"}`,
    type: isIncrease ? "ingredient_price_up" : "ingredient_price_down",
    severity,
    ingredientId: line.matchedIngredientId!,
    ingredientName,
    supplierId: supplier.id,
    supplierName: supplier.name,
    invoiceId: invoice.id,
    invoiceLineId: line.id,
    sourceInvoiceNumber: invoice.invoiceNumber,
    sourceInvoiceDate: invoice.invoiceDate,
    sourceType: invoice.sourceType,
    previousCostPerUnitCents: line.previousCostPerUnitCents,
    newCostPerUnitCents: line.newCostPerUnitCents!,
    deltaPercent,
    affectedDishIds: affectedDishImpacts.map((dish) => dish.dishId),
    affectedDishNames: affectedDishImpacts.map((dish) => dish.name),
    estimatedMarginImpactCents: topAffectedDish
      ? Math.abs(topAffectedDish.periodProfitImpactCents)
      : undefined,
    message: `${line.rawProductName} ${directionLabel} ${Math.abs(deltaPercent).toFixed(1)}%. ${topAffectedDish ? `${topAffectedDish.name} is the largest affected dish.` : "No dish impact was detected."}`,
    recommendedAction: action,
    createdAt: invoice.createdAt,
    status: "open"
  };
}

function buildDishRiskAlert(
  invoice: PurchaseInvoice,
  line: PurchaseInvoiceLine,
  supplier: Supplier,
  ingredientName: string,
  affectedDishImpacts: AffectedDishImpact[]
): PriceChangeAlert | null {
  const atRiskDishes = affectedDishImpacts.filter(
    (dish) =>
      dish.newStatus !== "profitable" &&
      (dish.oldStatus !== dish.newStatus || dish.oldMarginPercent !== dish.newMarginPercent)
  );

  if (atRiskDishes.length === 0) {
    return null;
  }

  const topDish = atRiskDishes[0];
  const severity = topDish.newStatus === "loss" ? "critical" : "high";

  return {
    id: `${invoice.id}-${line.id}-dish-risk`,
    type: "dish_margin_at_risk_due_to_cost_change",
    severity,
    ingredientId: line.matchedIngredientId!,
    ingredientName,
    supplierId: supplier.id,
    supplierName: supplier.name,
    invoiceId: invoice.id,
    invoiceLineId: line.id,
    sourceInvoiceNumber: invoice.invoiceNumber,
    sourceInvoiceDate: invoice.invoiceDate,
    sourceType: invoice.sourceType,
    previousCostPerUnitCents: line.previousCostPerUnitCents,
    newCostPerUnitCents: line.newCostPerUnitCents!,
    deltaPercent: line.priceDeltaPercent,
    affectedDishIds: atRiskDishes.map((dish) => dish.dishId),
    affectedDishNames: atRiskDishes.map((dish) => dish.name),
    estimatedMarginImpactCents: Math.abs(topDish.periodProfitImpactCents),
    message: `${topDish.name} moved from ${topDish.oldMarginPercent.toFixed(1)}% to ${topDish.newMarginPercent.toFixed(1)}% margin after the ${ingredientName} cost change.`,
    recommendedAction:
      topDish.newStatus === "loss"
        ? `Repair ${topDish.name} immediately with a price move or ingredient cost review.`
        : `Review ${topDish.name} before the new ingredient cost erodes the remaining margin buffer.`,
    createdAt: invoice.createdAt,
    status: "open"
  };
}

export function confirmInvoiceReview({
  invoiceDraft,
  reviewedInvoice,
  reviewedLines,
  ingredients,
  recipes,
  dishes,
  suppliers,
  existingCostHistory,
  existingAlerts,
  existingSupplierProductMatches,
  createdAt
}: ConfirmInvoiceReviewInput): InvoiceConfirmationResult {
  if (invoiceDraft.invoiceDraft.parseStatus === "confirmed") {
    throw new Error("Invoice has already been confirmed.");
  }

  if (
    existingCostHistory.some((history) =>
      invoiceDraft.lines.some((line) => line.id === history.invoiceLineId)
    )
  ) {
    throw new Error("Invoice lines have already been applied to cost history.");
  }

  const timestamp = createdAt ?? new Date().toISOString();
  const reviewedLineMap = new Map(reviewedLines.map((line) => [line.lineId, line]));

  if (reviewedLineMap.size !== invoiceDraft.lines.length) {
    throw new Error("Every parsed invoice line must be reviewed before confirmation.");
  }

  const supplierId = reviewedInvoice?.supplierId ?? invoiceDraft.invoiceDraft.supplierId;
  const supplier = suppliers.find((candidate) => candidate.id === supplierId);

  if (!supplier) {
    throw new Error("Supplier could not be resolved for confirmation.");
  }

  const originalIngredients = cloneIngredients(ingredients);
  const updatedIngredients = cloneIngredients(ingredients);
  const changedMatches: SupplierProductMatch[] = [];
  const costHistory: IngredientCostHistory[] = [];
  const lineAlerts: PriceChangeAlert[] = [];
  const confirmedLines: PurchaseInvoiceLine[] = [];
  const changedIngredientIds = new Set<string>();
  let confirmedLineCount = 0;
  let ignoredLineCount = 0;
  let updatedIngredientCount = 0;
  let priceIncreaseCount = 0;
  let priceDecreaseCount = 0;
  let unchangedCount = 0;

  for (const parsedLine of invoiceDraft.lines) {
    const reviewedLine = reviewedLineMap.get(parsedLine.id);

    if (!reviewedLine) {
      throw new Error(`Invoice line ${parsedLine.id} was not reviewed.`);
    }

    if (reviewedLine.reviewStatus === "ignored") {
      ignoredLineCount += 1;
      confirmedLines.push({
        ...parsedLine,
        reviewStatus: "ignored"
      });
      continue;
    }

    if (!reviewedLine.matchedIngredientId) {
      throw new Error(`Confirmed invoice line ${parsedLine.id} is missing an ingredient match.`);
    }

    const ingredientIndex = updatedIngredients.findIndex(
      (ingredient) => ingredient.id === reviewedLine.matchedIngredientId
    );

    if (ingredientIndex === -1) {
      throw new Error(`Ingredient ${reviewedLine.matchedIngredientId} does not exist.`);
    }

    if (!Number.isFinite(reviewedLine.parsedQuantity) || reviewedLine.parsedQuantity <= 0) {
      throw new Error(`Invoice line ${parsedLine.id} has invalid quantity.`);
    }

    if (
      !Number.isFinite(reviewedLine.parsedUnitPriceCents) ||
      reviewedLine.parsedUnitPriceCents <= 0
    ) {
      throw new Error(`Invoice line ${parsedLine.id} has invalid unit price.`);
    }

    const ingredient = updatedIngredients[ingredientIndex];
    const convertedCost = convertInvoiceCostToIngredientUnit(
      reviewedLine.parsedUnitPriceCents,
      reviewedLine.parsedUnit,
      ingredient.unit
    );

    if (convertedCost === null) {
      throw new Error(`Invoice line ${parsedLine.id} still has an unresolved unit mismatch.`);
    }

    const previousCostPerUnitCents = ingredient.costPerUnitCents;
    const newCostPerUnitCents = convertedCost;
    const priceDeltaPercent = calculateDeltaPercent(previousCostPerUnitCents, newCostPerUnitCents);
    const ingredientName = ingredient.name;

    const finalLine: PurchaseInvoiceLine = {
      ...parsedLine,
      parsedQuantity: reviewedLine.parsedQuantity,
      parsedUnit: reviewedLine.parsedUnit,
      parsedUnitPriceCents: reviewedLine.parsedUnitPriceCents,
      parsedLineTotalCents:
        reviewedLine.parsedLineTotalCents ??
        Math.round(reviewedLine.parsedQuantity * reviewedLine.parsedUnitPriceCents),
      matchedIngredientId: ingredient.id,
      reviewStatus: "confirmed",
      matchConfidence: parsedLine.matchConfidence === "none" ? "medium" : parsedLine.matchConfidence,
      previousCostPerUnitCents,
      newCostPerUnitCents,
      priceDeltaPercent,
      warnings: []
    };

    confirmedLines.push(finalLine);
    confirmedLineCount += 1;

    const matchRecord = buildSupplierProductMatchRecord(
      invoiceDraft.invoiceDraft.restaurantId,
      supplier.id,
      parsedLine.rawProductName,
      ingredient.id,
      finalLine.matchConfidence,
      timestamp,
      existingSupplierProductMatches.find(
        (candidate) =>
          candidate.supplierId === supplier.id &&
          candidate.normalizedProductName === normalizeName(parsedLine.rawProductName)
      )
    );
    changedMatches.push(matchRecord);

    if (newCostPerUnitCents === previousCostPerUnitCents) {
      unchangedCount += 1;
      continue;
    }

    updatedIngredients[ingredientIndex] = {
      ...ingredient,
      costPerUnitCents: newCostPerUnitCents
    };

    changedIngredientIds.add(ingredient.id);
    updatedIngredientCount += 1;

    if (typeof priceDeltaPercent === "number") {
      if (priceDeltaPercent >= 5) {
        priceIncreaseCount += 1;
      } else if (priceDeltaPercent <= -5) {
        priceDecreaseCount += 1;
      }
    }

    costHistory.push({
      id: `${invoiceDraft.invoiceDraft.id}-${parsedLine.id}-history`,
      ingredientId: ingredient.id,
      supplierId: supplier.id,
      invoiceLineId: parsedLine.id,
      previousCostPerUnitCents,
      newCostPerUnitCents,
      unit: ingredient.unit,
      effectiveDate: reviewedInvoice?.invoiceDate ?? invoiceDraft.invoiceDraft.invoiceDate,
      createdAt: timestamp
    });

    const impactedByLine = buildAffectedDishImpacts(
      [ingredient.id],
      dishes,
      recipes,
      originalIngredients,
      updatedIngredients
    );

    if (typeof priceDeltaPercent === "number" && Math.abs(priceDeltaPercent) >= 5) {
      lineAlerts.push(
        buildIngredientAlert(
          invoiceDraft.invoiceDraft,
          finalLine,
          supplier,
          ingredientName,
          priceDeltaPercent,
          impactedByLine
        )
      );
    }

    if ((priceDeltaPercent ?? 0) >= 5) {
      const dishRiskAlert = buildDishRiskAlert(
        invoiceDraft.invoiceDraft,
        finalLine,
        supplier,
        ingredientName,
        impactedByLine
      );

      if (dishRiskAlert) {
        lineAlerts.push(dishRiskAlert);
      }
    }
  }

  const affectedDishes = buildAffectedDishImpacts(
    [...changedIngredientIds],
    dishes,
    recipes,
    originalIngredients,
    updatedIngredients
  );

  const existingAlertKeys = new Set(
    existingAlerts.map((alert) => `${alert.type}:${alert.invoiceId}:${alert.invoiceLineId}`)
  );
  const dedupedAlerts = lineAlerts.reduce<PriceChangeAlert[]>((alerts, alert) => {
    const alertKey = `${alert.type}:${alert.invoiceId}:${alert.invoiceLineId}`;
    const duplicate = alerts.find(
      (candidate) =>
        candidate.type === alert.type &&
        candidate.invoiceId === alert.invoiceId &&
        candidate.invoiceLineId === alert.invoiceLineId
    );

    if (!duplicate && !existingAlertKeys.has(alertKey)) {
      alerts.push(alert);
    }

    return alerts;
  }, []);

  const confirmedInvoice: PurchaseInvoice = {
    ...invoiceDraft.invoiceDraft,
    supplierId: supplier.id,
    invoiceDate: reviewedInvoice?.invoiceDate ?? invoiceDraft.invoiceDraft.invoiceDate,
    invoiceNumber: reviewedInvoice?.invoiceNumber ?? invoiceDraft.invoiceDraft.invoiceNumber,
    parseStatus: "confirmed",
    createdAt: invoiceDraft.invoiceDraft.createdAt
  };

  return {
    confirmedInvoice,
    confirmedLines,
    updatedIngredients,
    costHistory,
    supplierProductMatches: changedMatches,
    alerts: dedupedAlerts,
    affectedDishes,
    confirmationSummary: {
      invoiceId: confirmedInvoice.id,
      supplierName: supplier.name,
      confirmedLineCount,
      ignoredLineCount,
      updatedIngredientCount,
      priceIncreaseCount,
      priceDecreaseCount,
      unchangedCount,
      alertCount: dedupedAlerts.length,
      affectedDishCount: affectedDishes.length,
      topAffectedDishes: affectedDishes.slice(0, 5)
    }
  };
}
