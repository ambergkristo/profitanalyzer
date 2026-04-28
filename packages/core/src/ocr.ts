import {
  parseStructuredInvoiceDraft,
  type StructuredInvoiceDraftInput
} from "./invoices.js";
import type {
  Ingredient,
  InvoiceMatchConfidence,
  OcrConfidence,
  OcrParsedInvoiceResult,
  ParsedInvoiceDraft,
  Supplier,
  SupplierProductMatch
} from "./types.js";

interface CreateInvoiceDraftFromOcrOptions {
  createdAt?: string;
  invoiceId?: string;
  invoiceKey?: string;
  restaurantId?: string;
}

interface OcrFixtureDefinition {
  id: string;
  matchTokens: string[];
  result: OcrParsedInvoiceResult;
}

interface OcrSafetyValidation {
  pass: boolean;
  warnings: string[];
  failures: string[];
}

const fallbackSupplierName = "OCR Supplier Review";
const fallbackInvoiceDate = "2026-04-28";

const ocrFixtures: OcrFixtureDefinition[] = [
  {
    id: "clean-invoice-photo",
    matchTokens: ["clean"],
    result: {
      supplierName: "Metro Fresh Wholesale",
      invoiceNumber: "OCR-2041",
      invoiceDate: "2026-04-08",
      totalAmountCents: 27680,
      confidence: "high",
      warnings: ["RM8 development adapter: fixture OCR result."],
      rawText:
        "METRO FRESH WHOLESALE OCR-2041 2026-04-08 Romaine Lettuce Hearts Parmesan Grated Avocado Halves Mozzarella Fior di Latte Tomato Sauce Base Citrus Dressing House Butter Lettuce Baby",
      lines: [
        {
          rawProductName: "Romaine Lettuce Hearts",
          quantity: 1000,
          unit: "g",
          unitPriceCents: 1,
          confidence: "high",
          warnings: []
        },
        {
          rawProductName: "Parmesan Grated",
          quantity: 500,
          unit: "g",
          unitPriceCents: 7,
          confidence: "high",
          warnings: []
        },
        {
          rawProductName: "Avocado Halves",
          quantity: 1000,
          unit: "g",
          unitPriceCents: 3,
          confidence: "high",
          warnings: []
        },
        {
          rawProductName: "Mozzarella Fior di Latte",
          quantity: 2000,
          unit: "g",
          unitPriceCents: 4,
          confidence: "high",
          warnings: []
        },
        {
          rawProductName: "Tomato Sauce Base",
          quantity: 1500,
          unit: "g",
          lineTotalCents: 3000,
          confidence: "medium",
          warnings: []
        },
        {
          rawProductName: "Citrus Dressing House",
          quantity: 1000,
          unit: "ml",
          unitPriceCents: 5,
          confidence: "medium",
          warnings: []
        },
        {
          rawProductName: "Butter Lettuce Baby",
          quantity: 600,
          unit: "g",
          unitPriceCents: 1,
          confidence: "medium",
          warnings: []
        }
      ]
    }
  },
  {
    id: "blurry-invoice-photo",
    matchTokens: ["blurry"],
    result: {
      supplierName: "KitchenHub Cash & Carry",
      invoiceNumber: "OCR-7732",
      invoiceDate: "2026-04-14",
      totalAmountCents: 19840,
      confidence: "low",
      warnings: [
        "RM8 development adapter: fixture OCR result.",
        "Photo was blurry. Review low-confidence lines before confirming."
      ],
      rawText:
        "KITCHENHUB CASH CARRY OCR-7732 blurry image Brioche Buns Burger Dip Flatbread Base Mystery Herb Mix Dessert Cream Mozza Shred",
      lines: [
        {
          rawProductName: "Brioche Buns 12pc",
          quantity: 12,
          unit: "pcs",
          lineTotalCents: 1140,
          confidence: "medium",
          warnings: ["Unit price was derived from OCR line total."]
        },
        {
          rawProductName: "Burger Dip House",
          quantity: 900,
          unit: "ml",
          unitPriceCents: 5,
          confidence: "medium",
          warnings: []
        },
        {
          rawProductName: "Flatbread Base Pack",
          quantity: 1,
          unit: "pack",
          unitPriceCents: 1200,
          confidence: "low",
          warnings: ["Unit could not be verified confidently from the OCR image."]
        },
        {
          rawProductName: "Mystery Herb Mix",
          quantity: 100,
          unit: "g",
          unitPriceCents: 9,
          confidence: "none",
          warnings: ["Product text is ambiguous in the OCR image."]
        },
        {
          rawProductName: "Dessert Cream 1L",
          quantity: 1000,
          unit: "ml",
          lineTotalCents: 2500,
          confidence: "low",
          warnings: ["OCR missed the unit price. Derived from line total instead."]
        },
        {
          rawProductName: "Mozza Shred",
          quantity: 1000,
          unit: "g",
          confidence: "low",
          warnings: ["OCR could not read a usable price from this line."]
        }
      ]
    }
  },
  {
    id: "cropped-invoice-photo",
    matchTokens: ["cropped", "rotated"],
    result: {
      supplierName: "Prime Butchery Co",
      invoiceDate: "2026-04-20",
      confidence: "medium",
      warnings: [
        "RM8 development adapter: fixture OCR result.",
        "Image was rotated or cropped. Header fields may be incomplete."
      ],
      rawText:
        "PRIME BUTCHERY CO rotated crop Beef Patty Sirloin Steak Salmon Fillet Duck Breast Chicken Breast",
      lines: [
        {
          rawProductName: "Beef Patty 180g Fresh",
          quantity: 1000,
          unit: "g",
          unitPriceCents: 4,
          confidence: "medium",
          warnings: []
        },
        {
          rawProductName: "Sirloin Steak Trimmed",
          quantity: 1000,
          unit: "g",
          unitPriceCents: 10,
          confidence: "medium",
          warnings: []
        },
        {
          rawProductName: "Salmon Fillet Atlantic",
          quantity: 1000,
          unit: "g",
          unitPriceCents: 8,
          confidence: "low",
          warnings: ["Price digits were partially cropped in the image."]
        },
        {
          rawProductName: "Duck Breast Large",
          quantity: 1000,
          unit: "g",
          confidence: "low",
          warnings: ["OCR missed the unit price on this cropped line."]
        },
        {
          rawProductName: "Chicken Breast IQF",
          quantity: 1000,
          unit: "g",
          unitPriceCents: 3,
          confidence: "medium",
          warnings: []
        }
      ]
    }
  }
];

const genericFixture: OcrParsedInvoiceResult = {
  supplierName: undefined,
  invoiceDate: "2026-04-28",
  confidence: "low",
  warnings: [
    "RM8 development adapter: fixture OCR result.",
    "No named OCR fixture matched this file. Review the generated draft carefully."
  ],
  rawText: "generic OCR draft",
  lines: [
    {
      rawProductName: "Unknown OCR line",
      quantity: 1,
      unit: "g",
      confidence: "none",
      warnings: ["OCR could not classify this line."]
    }
  ]
};

export function mapOcrConfidenceToMatchConfidence(
  confidence: OcrConfidence
): InvoiceMatchConfidence {
  return confidence;
}

export function mapOcrWarningsToLineWarnings(warnings: string[]) {
  return [...new Set(warnings.filter((warning) => warning.trim().length > 0))];
}

export function validateOcrResultSafety(result: OcrParsedInvoiceResult): OcrSafetyValidation {
  const warnings = [...result.warnings];
  const failures: string[] = [];

  if (result.lines.length === 0) {
    failures.push("OCR result did not contain any lines.");
  }

  if (!result.supplierName) {
    warnings.push("Supplier name is missing from the OCR result and must be reviewed.");
  }

  if (!result.invoiceDate) {
    warnings.push("Invoice date is missing from the OCR result and must be reviewed.");
  }

  for (const line of result.lines) {
    if (!line.rawProductName.trim()) {
      failures.push("OCR line is missing a raw product name.");
    }

    if (
      line.unitPriceCents === undefined &&
      line.lineTotalCents === undefined
    ) {
      warnings.push(`OCR line "${line.rawProductName}" is missing a readable price.`);
    }
  }

  return {
    pass: failures.length === 0,
    warnings: [...new Set(warnings)],
    failures
  };
}

export function normalizeOcrResultToInvoiceInput(
  result: OcrParsedInvoiceResult,
  options: {
    createdAt?: string;
    invoiceKey?: string;
  } = {}
): StructuredInvoiceDraftInput {
  const validation = validateOcrResultSafety(result);

  if (!validation.pass) {
    throw new Error(validation.failures.join(" "));
  }

  return {
    invoiceKey: options.invoiceKey ?? "ocr-upload",
    supplierName: result.supplierName ?? fallbackSupplierName,
    invoiceNumber: result.invoiceNumber,
    invoiceDate: result.invoiceDate ?? options.createdAt?.slice(0, 10) ?? fallbackInvoiceDate,
    totalAmountCents: result.totalAmountCents,
    lines: result.lines.map((line) => {
      const warnings = mapOcrWarningsToLineWarnings(line.warnings);

      if (!line.quantity || line.quantity <= 0) {
        warnings.push("OCR could not read quantity. Review this line before confirming.");
      }

      if (!line.unit) {
        warnings.push("OCR could not read unit. Review this line before confirming.");
      }

      if (line.unitPriceCents === undefined && line.lineTotalCents === undefined) {
        warnings.push("OCR could not read a usable price. Review this line before confirming.");
      }

      return {
        rawProductName: line.rawProductName,
        quantity: line.quantity && line.quantity > 0 ? line.quantity : 1,
        unit: line.unit ?? "g",
        unitPriceCents: line.unitPriceCents,
        lineTotalCents: line.lineTotalCents,
        reviewStatus:
          line.confidence === "low" || line.confidence === "none" || warnings.length > 0
            ? "needs_review"
            : "ready",
        matchConfidenceOverride: mapOcrConfidenceToMatchConfidence(line.confidence),
        warnings
      };
    })
  };
}

export function createInvoiceDraftFromOcrResult(
  result: OcrParsedInvoiceResult,
  knownSuppliers: Supplier[],
  knownIngredients: Ingredient[],
  existingSupplierProductMatches: SupplierProductMatch[],
  options: CreateInvoiceDraftFromOcrOptions = {}
): ParsedInvoiceDraft {
  const normalized = normalizeOcrResultToInvoiceInput(result, {
    createdAt: options.createdAt,
    invoiceKey: options.invoiceKey
  });

  return parseStructuredInvoiceDraft(
    normalized,
    knownSuppliers,
    knownIngredients,
    existingSupplierProductMatches,
    {
      createdAt: options.createdAt,
      invoiceId: options.invoiceId,
      restaurantId: options.restaurantId,
      sourceType: "ocr_future"
    }
  );
}

export function resolveFixtureOcrResult(fileName: string): OcrParsedInvoiceResult {
  const normalizedFileName = fileName.trim().toLowerCase();
  const fixture = ocrFixtures.find((candidate) =>
    candidate.matchTokens.some((token) => normalizedFileName.includes(token))
  );

  const result = fixture?.result ?? genericFixture;

  return {
    ...result,
    lines: result.lines.map((line) => ({
      ...line,
      warnings: [...line.warnings]
    })),
    warnings: [...result.warnings]
  };
}
