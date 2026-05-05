import type {
  OcrParsedInvoiceResult,
  OcrQualityReport,
  OcrRecommendedReviewMode
} from "./types.js";

export interface OcrConfidencePolicy {
  quickReviewMaxUnresolvedLineRate: number;
  manualEntryUnresolvedLineRate: number;
  manualEntryMissingPriceRate: number;
  manualEntryLowConfidenceRate: number;
  highDeltaWarningPercent: number;
}

export interface OcrPolicyEvaluation {
  recommendedReviewMode: OcrRecommendedReviewMode;
  unresolvedLineRate: number;
  missingPriceRate: number;
  lowConfidenceRate: number;
  reviewBurdenScore: number;
  warnings: string[];
}

export const defaultOcrConfidencePolicy: OcrConfidencePolicy = {
  quickReviewMaxUnresolvedLineRate: 0.15,
  manualEntryUnresolvedLineRate: 0.4,
  manualEntryMissingPriceRate: 0.35,
  manualEntryLowConfidenceRate: 0.4,
  highDeltaWarningPercent: 25
};

export function evaluateOcrConfidencePolicy(
  result: OcrParsedInvoiceResult,
  qualityReport?: OcrQualityReport,
  policy: OcrConfidencePolicy = defaultOcrConfidencePolicy
): OcrPolicyEvaluation {
  const lineCount = result.lines.length;
  const unresolvedLineCount =
    qualityReport?.unresolvedLineCount ??
    result.lines.filter((line) => line.confidence === "low" || line.confidence === "none").length;
  const missingPriceCount =
    qualityReport?.missingPricesCount ??
    result.lines.filter((line) => line.unitPriceCents === undefined && line.lineTotalCents === undefined).length;
  const lowConfidenceCount = result.lines.filter(
    (line) => line.confidence === "low" || line.confidence === "none"
  ).length;
  const unresolvedLineRate = lineCount === 0 ? 1 : unresolvedLineCount / lineCount;
  const missingPriceRate = lineCount === 0 ? 1 : missingPriceCount / lineCount;
  const lowConfidenceRate = lineCount === 0 ? 1 : lowConfidenceCount / lineCount;
  const warnings: string[] = [];

  if (lineCount === 0) {
    warnings.push("OCR returned no invoice lines. Manual entry is recommended.");
  }
  if (!result.supplierName) {
    warnings.push("Supplier name is missing. Review supplier selection before confirming.");
  }
  if (!result.invoiceDate) {
    warnings.push("Invoice date is missing. Review invoice date before confirming.");
  }
  if (unresolvedLineRate > policy.quickReviewMaxUnresolvedLineRate) {
    warnings.push("OCR produced enough unresolved lines to require careful review.");
  }
  if (missingPriceRate > policy.manualEntryMissingPriceRate) {
    warnings.push("Many OCR lines are missing usable price data.");
  }
  if (lowConfidenceRate > policy.manualEntryLowConfidenceRate) {
    warnings.push("Many OCR lines have low or no confidence.");
  }

  const recommendedReviewMode: OcrRecommendedReviewMode =
    lineCount === 0 ||
    unresolvedLineRate > policy.manualEntryUnresolvedLineRate ||
    missingPriceRate > policy.manualEntryMissingPriceRate ||
    lowConfidenceRate > policy.manualEntryLowConfidenceRate
      ? "manual_entry_recommended"
      : unresolvedLineRate > policy.quickReviewMaxUnresolvedLineRate ||
          missingPriceCount > 0 ||
          !result.supplierName ||
          !result.invoiceDate
        ? "careful_review"
        : "quick_review";

  const reviewBurdenScore = Math.min(
    100,
    Math.round(unresolvedLineRate * 60 + missingPriceRate * 25 + lowConfidenceRate * 15)
  );

  return {
    recommendedReviewMode,
    unresolvedLineRate,
    missingPriceRate,
    lowConfidenceRate,
    reviewBurdenScore,
    warnings
  };
}

export function applyOcrConfidencePolicy(
  result: OcrParsedInvoiceResult,
  qualityReport: OcrQualityReport,
  policy: OcrConfidencePolicy = defaultOcrConfidencePolicy
): OcrQualityReport {
  const evaluation = evaluateOcrConfidencePolicy(result, qualityReport, policy);

  return {
    ...qualityReport,
    recommendedReviewMode: evaluation.recommendedReviewMode,
    unresolvedLineRate: evaluation.unresolvedLineRate,
    reviewBurdenScore: evaluation.reviewBurdenScore,
    policyWarnings: evaluation.warnings,
    warnings: [...qualityReport.warnings, ...evaluation.warnings]
  };
}
