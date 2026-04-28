export type IngredientUnit = "g" | "ml" | "piece";
export type InvoiceUnit = IngredientUnit | "kg" | "l" | "pcs" | "pack";

export interface Ingredient {
  id: string;
  name: string;
  costPerUnitCents: number;
  unit: IngredientUnit;
}

export interface RecipeIngredient {
  ingredientId: string;
  quantity: number;
  unit: IngredientUnit;
}

export interface Recipe {
  id: string;
  name: string;
  yield: number;
  ingredients: RecipeIngredient[];
}

export interface Dish {
  id: string;
  name: string;
  recipeId: string;
  priceCents: number;
  salesVolume: number;
}

export type DishStatus = "loss" | "warning" | "profitable";

export type CalculationWarningCode = "MISSING_INGREDIENT" | "UNIT_MISMATCH" | "INVALID_YIELD";

export interface CalculationWarning {
  code: CalculationWarningCode;
  message: string;
  ingredientId?: string;
}

export interface IngredientCostBreakdown {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: IngredientUnit;
  unitCostCents: number | null;
  lineCostCents: number;
  percentOfDishCost: number;
  isMissing: boolean;
  warning?: string;
}

export interface RecipeCostResult {
  costCents: number;
  warnings: CalculationWarning[];
  breakdown: IngredientCostBreakdown[];
}

export interface CalculatedDish {
  dishId: string;
  name: string;
  priceCents: number;
  costCents: number;
  marginPercent: number;
  grossProfitPerSaleCents: number;
  estimatedPeriodProfitCents: number;
  salesVolume: number;
  status: DishStatus;
  costRatioPercent: number;
  contributionRank: number;
  warnings: CalculationWarning[];
}

export type DishActionSeverity = "critical" | "high" | "medium" | "low";
export type DishActionConfidence = "high" | "medium" | "low";

export type DishActionType =
  | "margin_repair"
  | "price_review"
  | "warning_review"
  | "bestseller_protection"
  | "promotion_opportunity"
  | "data_quality"
  | "supplier_price_review";

export type DishActionReasonCode =
  | "LOW_MARGIN"
  | "LOSS_MARGIN"
  | "HIGH_SALES_LOW_MARGIN"
  | "HIGH_MARGIN_LOW_SALES"
  | "NEGATIVE_PROFIT_PER_SALE"
  | "STRONG_PROFIT_CONTRIBUTOR"
  | "PRICE_SIMULATION_UPSIDE"
  | "MISSING_COST_DATA"
  | "AGGRESSIVE_PRICE_INCREASE"
  | "SUPPLIER_PRICE_INCREASE"
  | "INVOICE_COST_SPIKE"
  | "INGREDIENT_PRICE_CHANGE"
  | "DISH_MARGIN_AT_RISK"
  | "COST_HISTORY_UPDATED";

export interface DishAction {
  id: string;
  type: DishActionType;
  title: string;
  message: string;
  dishId: string;
  severity: DishActionSeverity;
  estimatedImpactCents: number;
  confidence: DishActionConfidence;
  reasonCodes: DishActionReasonCode[];
  recommendedPriceCents?: number;
  currentMarginPercent?: number;
  targetMarginPercent?: number;
  createdFromRule: string;
  isAggressive?: boolean;
}

export type RankedDishAction = DishAction;

export interface DishPerformanceExplanation {
  headline: string;
  summary: string;
  highlights: string[];
  reasonCodes: DishActionReasonCode[];
}

export interface PriceSimulationResult {
  dishId: string;
  oldPriceCents: number;
  newPriceCents: number;
  oldMarginPercent: number;
  newMarginPercent: number;
  oldEstimatedPeriodProfitCents: number;
  newEstimatedPeriodProfitCents: number;
  profitDeltaCents: number;
  grossProfitPerSaleDeltaCents: number;
  statusBefore: DishStatus;
  statusAfter: DishStatus;
  message: string;
}

export interface SimulationTargetAction {
  label: string;
  targetMarginPercent: number;
  priceCents: number;
  isAggressive: boolean;
}

export interface SimulationHints {
  currentPriceCents: number;
  quickAdjustmentsCents: number[];
  targetMarginActions: SimulationTargetAction[];
  recommendedPriceCents?: number;
  recommendedTargetMarginPercent?: number;
  note: string;
}

export interface CostDriverInsight {
  ingredientId: string;
  ingredientName: string;
  lineCostCents: number;
  percentOfDishCost: number;
  isDominant: boolean;
  message: string;
}

export interface DishDetailAnalytics {
  dish: Dish;
  recipe: Recipe;
  metrics: CalculatedDish;
  ingredientBreakdown: IngredientCostBreakdown[];
  costDriverInsight?: CostDriverInsight;
  explanation: DishPerformanceExplanation;
  recommendedActionsForDish: DishAction[];
  simulationHints: SimulationHints;
}

export interface SampleRestaurantData {
  ingredients: Ingredient[];
  recipes: Recipe[];
  dishes: Dish[];
}

export interface Supplier {
  id: string;
  restaurantId: string;
  name: string;
  normalizedName: string;
  contactLabel?: string;
  createdAt?: string;
}

export type PurchaseInvoiceSourceType = "mock" | "manual" | "ocr_future";
export type PurchaseInvoiceParseStatus = "draft" | "needs_review" | "reviewed" | "confirmed";

export interface PurchaseInvoice {
  id: string;
  restaurantId: string;
  supplierId: string;
  invoiceNumber?: string;
  invoiceDate: string;
  sourceType: PurchaseInvoiceSourceType;
  sourceImageUrl?: string;
  parseStatus: PurchaseInvoiceParseStatus;
  totalAmountCents?: number;
  createdAt: string;
}

export type InvoiceMatchConfidence = "high" | "medium" | "low" | "none";
export type InvoiceReviewStatus = "needs_review" | "ready" | "confirmed" | "ignored";

export interface PurchaseInvoiceLine {
  id: string;
  invoiceId: string;
  rawProductName: string;
  parsedQuantity: number;
  parsedUnit: InvoiceUnit;
  parsedUnitPriceCents?: number;
  parsedLineTotalCents?: number;
  matchedIngredientId?: string;
  matchConfidence: InvoiceMatchConfidence;
  reviewStatus: InvoiceReviewStatus;
  previousCostPerUnitCents?: number;
  newCostPerUnitCents?: number;
  priceDeltaPercent?: number;
  warnings: string[];
}

export interface IngredientCostHistory {
  id: string;
  ingredientId: string;
  supplierId: string;
  invoiceLineId: string;
  previousCostPerUnitCents?: number;
  newCostPerUnitCents: number;
  unit: IngredientUnit;
  effectiveDate: string;
  createdAt: string;
}

export interface SupplierProductMatch {
  id: string;
  restaurantId: string;
  supplierId: string;
  rawProductName: string;
  normalizedProductName: string;
  ingredientId: string;
  confidence: InvoiceMatchConfidence;
  lastConfirmedAt: string;
}

export type PriceChangeAlertType =
  | "ingredient_price_up"
  | "ingredient_price_down"
  | "dish_margin_at_risk_due_to_cost_change";

export type PriceChangeAlertStatus = "open" | "reviewed" | "dismissed";

export interface PriceChangeAlert {
  id: string;
  type: PriceChangeAlertType;
  severity: DishActionSeverity;
  ingredientId: string;
  ingredientName?: string;
  supplierId?: string;
  supplierName?: string;
  invoiceId?: string;
  invoiceLineId?: string;
  sourceInvoiceNumber?: string;
  sourceInvoiceDate?: string;
  sourceType?: PurchaseInvoiceSourceType;
  previousCostPerUnitCents?: number;
  newCostPerUnitCents: number;
  deltaPercent?: number;
  affectedDishIds: string[];
  affectedDishNames?: string[];
  estimatedMarginImpactCents?: number;
  message: string;
  recommendedAction: string;
  createdAt: string;
  status: PriceChangeAlertStatus;
}

export interface MockInvoiceLineInput {
  rawProductName: string;
  quantity: number;
  unit: InvoiceUnit;
  unitPriceCents?: number;
  lineTotalCents?: number;
}

export interface MockInvoiceInput {
  id: string;
  name: string;
  supplierName: string;
  invoiceNumber?: string;
  invoiceDate: string;
  totalAmountCents?: number;
  description: string;
  expectedImpact: string;
  lines: MockInvoiceLineInput[];
}

export interface ManualInvoiceLineInput {
  rawProductName: string;
  parsedQuantity: number;
  parsedUnit: InvoiceUnit;
  parsedUnitPriceCents?: number;
  parsedLineTotalCents?: number;
  matchedIngredientId?: string;
  reviewStatus?: Extract<InvoiceReviewStatus, "needs_review" | "ready" | "ignored">;
}

export interface ManualInvoiceDraftInput {
  supplierName: string;
  invoiceNumber?: string;
  invoiceDate: string;
  lines: ManualInvoiceLineInput[];
}

export type OcrProvider = "fixture" | "external_env" | "disabled";
export type OcrJobStatus = "uploaded" | "processing" | "parsed" | "needs_review" | "failed";
export type OcrConfidence = "high" | "medium" | "low" | "none";
export type OcrProviderMode = "development" | "external" | "disabled";
export type OcrRecommendedReviewMode =
  | "quick_review"
  | "careful_review"
  | "manual_entry_recommended";

export interface OcrParsedLine {
  rawProductName: string;
  quantity?: number;
  unit?: InvoiceUnit;
  unitPriceCents?: number;
  lineTotalCents?: number;
  confidence: OcrConfidence;
  warnings: string[];
}

export interface OcrProviderConfig {
  id: OcrProvider;
  displayName: string;
  isConfigured: boolean;
  isDefault: boolean;
  modelConfigured?: boolean;
  supportsMimeTypes: string[];
  maxFileSizeBytes: number;
  mode: OcrProviderMode;
}

export interface OcrParsedInvoiceResult {
  supplierName?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  totalAmountCents?: number;
  lines: OcrParsedLine[];
  rawText?: string;
  confidence: OcrConfidence;
  warnings: string[];
}

export interface OcrQualityReport {
  overallConfidence: OcrConfidence;
  lineCount: number;
  unresolvedLineCount: number;
  missingSupplier: boolean;
  missingInvoiceDate: boolean;
  missingPricesCount: number;
  unknownProductCount: number;
  unitWarningCount: number;
  warnings: string[];
  recommendedReviewMode: OcrRecommendedReviewMode;
}

export interface OcrInvoiceJob {
  id: string;
  datasetId: string;
  provider: OcrProvider;
  providerDisplayName?: string;
  status: OcrJobStatus;
  originalFileName: string;
  mimeType: string;
  fileSizeBytes: number;
  createdAt: string;
  parsedAt?: string;
  failureReason?: string;
  invoiceDraftId?: string;
  qualityReport?: OcrQualityReport;
}

export interface MockInvoiceSampleSummary {
  id: string;
  name: string;
  supplierName: string;
  invoiceDate: string;
  description: string;
  expectedImpact: string;
}

export interface SupplierSuggestion {
  supplierId?: string;
  supplierName: string;
  confidence: InvoiceMatchConfidence;
}

export interface InvoiceDraftSummary {
  totalLines: number;
  readyLineCount: number;
  needsReviewLineCount: number;
  ignoredLineCount: number;
  highConfidenceCount: number;
  lowConfidenceCount: number;
}

export interface ParsedInvoiceDraft {
  invoiceDraft: PurchaseInvoice;
  supplierSuggestion: SupplierSuggestion;
  lines: PurchaseInvoiceLine[];
  summary: InvoiceDraftSummary;
}

export interface OcrDraftResponse extends ParsedInvoiceDraft {
  ocrJob: OcrInvoiceJob;
  ocrResult: OcrParsedInvoiceResult;
  qualityReport: OcrQualityReport;
  providerConfig: OcrProviderConfig;
}

export interface ReviewedInvoiceLineInput {
  lineId: string;
  reviewStatus: "confirmed" | "ignored";
  matchedIngredientId?: string;
  parsedQuantity: number;
  parsedUnit: InvoiceUnit;
  parsedUnitPriceCents: number;
  parsedLineTotalCents?: number;
}

export interface AffectedDishImpact {
  dishId: string;
  name: string;
  oldCostCents: number;
  newCostCents: number;
  oldMarginPercent: number;
  newMarginPercent: number;
  oldStatus: DishStatus;
  newStatus: DishStatus;
  costDeltaPerSaleCents: number;
  periodProfitImpactCents: number;
  salesVolume: number;
}

export interface InvoiceConfirmationSummary {
  invoiceId: string;
  supplierName: string;
  confirmedLineCount: number;
  ignoredLineCount: number;
  updatedIngredientCount: number;
  priceIncreaseCount: number;
  priceDecreaseCount: number;
  unchangedCount: number;
  alertCount: number;
  affectedDishCount: number;
  topAffectedDishes: AffectedDishImpact[];
}

export interface InvoiceConfirmationResult {
  confirmedInvoice: PurchaseInvoice;
  confirmedLines: PurchaseInvoiceLine[];
  updatedIngredients: Ingredient[];
  costHistory: IngredientCostHistory[];
  supplierProductMatches: SupplierProductMatch[];
  alerts: PriceChangeAlert[];
  affectedDishes: AffectedDishImpact[];
  confirmationSummary: InvoiceConfirmationSummary;
}

export interface StoredInvoiceView {
  invoice: PurchaseInvoice;
  supplierSuggestion: SupplierSuggestion;
  lines: PurchaseInvoiceLine[];
  summary: InvoiceDraftSummary;
  confirmationSummary?: InvoiceConfirmationSummary;
  affectedDishes?: AffectedDishImpact[];
  alerts?: PriceChangeAlert[];
  ocrJob?: OcrInvoiceJob;
  ocrResult?: OcrParsedInvoiceResult;
  qualityReport?: OcrQualityReport;
}

export interface IngredientCostHistoryEntryView {
  id: string;
  supplierName: string;
  invoiceNumber?: string;
  invoiceDate: string;
  previousCostPerUnitCents?: number;
  newCostPerUnitCents: number;
  deltaPercent?: number;
  source: PurchaseInvoiceSourceType;
  createdAt: string;
}

export interface IngredientCostHistoryView {
  ingredientId: string;
  ingredientName: string;
  currentCostPerUnitCents: number;
  unit: IngredientUnit;
  history: IngredientCostHistoryEntryView[];
}

export type DemoDatasetProfile = "high-margin" | "low-margin" | "mixed";
export type DatasetValidationStatus = "pass";

export interface DemoDatasetSummary {
  id: string;
  name: string;
  description: string;
  profile: DemoDatasetProfile;
  ownerDiagnosis: string;
  expectedBehavior: string;
  demoNarrative: string;
  validationStatus: DatasetValidationStatus;
}

export interface DemoDatasetDefinition extends DemoDatasetSummary {
  data: SampleRestaurantData;
}

export interface OverviewMetrics {
  totalDishes: number;
  profitableCount: number;
  warningCount: number;
  lossCount: number;
  averageMarginPercent: number;
  estimatedPeriodProfitCents: number;
  totalRevenueCents: number;
  totalCostCents: number;
  weightedAverageMarginPercent: number;
  topActions: DishAction[];
  topProfitContributors: CalculatedDish[];
  riskiestDishes: CalculatedDish[];
  supplierAlertCount: number;
  highSeveritySupplierAlertCount: number;
  latestSupplierAlerts: PriceChangeAlert[];
  dataQualityWarnings: string[];
}

export interface ValidationReport {
  datasetId: string;
  datasetName: string;
  totalDishes: number;
  profitableCount: number;
  warningCount: number;
  lossCount: number;
  averageMarginPercent: number;
  weightedAverageMarginPercent: number;
  estimatedPeriodProfitCents: number;
  totalRevenueCents: number;
  totalCostCents: number;
  topActions: DishAction[];
  actionTypeCounts: Partial<Record<DishActionType, number>>;
  severityCounts: Record<DishActionSeverity, number>;
  pass: boolean;
  warnings: string[];
  failures: string[];
}
