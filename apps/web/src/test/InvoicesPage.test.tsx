import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { InvoicesPage } from "../pages/Invoices.js";

vi.mock("../api/client.js", () => ({
  apiClient: {
    getDemoDatasets: vi.fn(),
    getIngredients: vi.fn(),
    getSuppliers: vi.fn(),
    getOcrProviders: vi.fn(),
    getOcrJobs: vi.fn(),
    retryOcrJob: vi.fn(),
    cancelOcrJob: vi.fn(),
    getInvoiceSamples: vi.fn(),
    parseMockInvoiceSample: vi.fn(),
    createManualInvoiceDraft: vi.fn(),
    uploadOcrInvoice: vi.fn(),
    confirmInvoiceReview: vi.fn()
  }
}));

import { apiClient } from "../api/client.js";

describe("InvoicesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(apiClient.getDemoDatasets).mockResolvedValue([
      {
        id: "low-margin-kitchen",
        name: "Low Margin Kitchen",
        description: "Volume-heavy kitchen under pricing pressure.",
        profile: "low-margin",
        ownerDiagnosis: "Margin pressure detected. Start with high-sales dishes below 50% margin.",
        expectedBehavior: "Critical repairs should dominate.",
        demoNarrative: "Use this scenario first in a demo.",
        validationStatus: "pass"
      }
    ]);

    vi.mocked(apiClient.getInvoiceSamples).mockResolvedValue([
      {
        id: "high-impact-price-spike",
        name: "Prime Butchery Co",
        supplierName: "Prime Butchery Co",
        invoiceDate: "2026-04-20",
        description: "Protein-heavy invoice with sharp cost jumps.",
        expectedImpact: "Confirmed updates should create strong alerts."
      }
    ]);

    vi.mocked(apiClient.getIngredients).mockResolvedValue([
      { id: "beef-patty", name: "Beef Patty", costPerUnitCents: 3, unit: "g" },
      { id: "basil", name: "Basil", costPerUnitCents: 15, unit: "g" }
    ]);

    vi.mocked(apiClient.getSuppliers).mockResolvedValue([
      {
        id: "supplier-prime-butchery",
        restaurantId: "low-margin-kitchen",
        name: "Prime Butchery Co",
        normalizedName: "prime butchery co"
      }
    ]);

    vi.mocked(apiClient.getOcrProviders).mockResolvedValue([
      {
        id: "fixture",
        displayName: "Development fixture OCR",
        isConfigured: true,
        isDefault: true,
        modelConfigured: false,
        mode: "development",
        supportsMimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
        maxFileSizeBytes: 10485760
      },
      {
        id: "external_env",
        displayName: "External OCR provider",
        isConfigured: false,
        isDefault: false,
        modelConfigured: false,
        mode: "external",
        supportsMimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
        maxFileSizeBytes: 10485760
      }
    ]);

    vi.mocked(apiClient.getOcrJobs).mockResolvedValue([
      {
        id: "ocr-job-previous",
        datasetId: "low-margin-kitchen",
        provider: "fixture",
        providerDisplayName: "Development fixture OCR",
        status: "failed",
        originalFileName: "failed-upload.jpg",
        mimeType: "image/jpeg",
        fileSizeBytes: 2048,
        createdAt: "2026-04-28T10:00:00.000Z",
        failureReason: "OCR provider is unavailable."
      }
    ]);

    vi.mocked(apiClient.parseMockInvoiceSample).mockResolvedValue({
      invoiceDraft: {
        id: "invoice-1",
        restaurantId: "low-margin-kitchen",
        supplierId: "supplier-prime-butchery",
        invoiceNumber: "PBC-8840",
        invoiceDate: "2026-04-20",
        sourceType: "mock",
        parseStatus: "needs_review",
        totalAmountCents: 54100,
        createdAt: "2026-04-20T10:00:00.000Z"
      },
      supplierSuggestion: {
        supplierId: "supplier-prime-butchery",
        supplierName: "Prime Butchery Co",
        confidence: "high"
      },
      lines: [
        {
          id: "line-1",
          invoiceId: "invoice-1",
          rawProductName: "Beef Patty 180g Fresh",
          parsedQuantity: 1000,
          parsedUnit: "g",
          parsedUnitPriceCents: 4,
          parsedLineTotalCents: 4000,
          matchedIngredientId: "beef-patty",
          matchConfidence: "high",
          reviewStatus: "ready",
          previousCostPerUnitCents: 3,
          newCostPerUnitCents: 4,
          priceDeltaPercent: 33.3,
          warnings: []
        },
        {
          id: "line-2",
          invoiceId: "invoice-1",
          rawProductName: "Mystery Herb Mix",
          parsedQuantity: 100,
          parsedUnit: "g",
          parsedUnitPriceCents: 9,
          parsedLineTotalCents: 900,
          matchConfidence: "none",
          reviewStatus: "needs_review",
          warnings: ["Ingredient match is unresolved and must be reviewed or ignored."]
        }
      ],
      summary: {
        totalLines: 2,
        readyLineCount: 1,
        needsReviewLineCount: 1,
        ignoredLineCount: 0,
        highConfidenceCount: 1,
        lowConfidenceCount: 1
      }
    });

    vi.mocked(apiClient.createManualInvoiceDraft).mockResolvedValue({
      invoiceDraft: {
        id: "manual-invoice-1",
        restaurantId: "low-margin-kitchen",
        supplierId: "supplier-prime-butchery",
        invoiceNumber: "MAN-100",
        invoiceDate: "2026-04-28",
        sourceType: "manual",
        parseStatus: "draft",
        createdAt: "2026-04-28T09:00:00.000Z"
      },
      supplierSuggestion: {
        supplierId: "supplier-prime-butchery",
        supplierName: "Prime Butchery Co",
        confidence: "high"
      },
      lines: [
        {
          id: "manual-line-1",
          invoiceId: "manual-invoice-1",
          rawProductName: "Beef Patty 180g Fresh",
          parsedQuantity: 1000,
          parsedUnit: "g",
          parsedUnitPriceCents: 4,
          parsedLineTotalCents: 4000,
          matchedIngredientId: "beef-patty",
          matchConfidence: "high",
          reviewStatus: "ready",
          previousCostPerUnitCents: 3,
          newCostPerUnitCents: 4,
          priceDeltaPercent: 33.3,
          warnings: []
        }
      ],
      summary: {
        totalLines: 1,
        readyLineCount: 1,
        needsReviewLineCount: 0,
        ignoredLineCount: 0,
        highConfidenceCount: 1,
        lowConfidenceCount: 0
      }
    });

    vi.mocked(apiClient.uploadOcrInvoice).mockResolvedValue({
      ocrJob: {
        id: "ocr-job-1",
        datasetId: "low-margin-kitchen",
        provider: "fixture",
        providerDisplayName: "Development fixture OCR",
        status: "needs_review",
        originalFileName: "blurry-invoice-photo.jpg",
        mimeType: "image/jpeg",
        fileSizeBytes: 2048,
        createdAt: "2026-04-28T11:00:00.000Z",
        parsedAt: "2026-04-28T11:00:00.000Z",
        invoiceDraftId: "ocr-invoice-1",
        qualityReport: {
          overallConfidence: "low",
          lineCount: 2,
          unresolvedLineCount: 1,
          missingSupplier: false,
          missingInvoiceDate: false,
          missingPricesCount: 0,
          unknownProductCount: 1,
          unitWarningCount: 0,
          warnings: [
            "RM8 development adapter: fixture OCR result.",
            "Photo was blurry. Review low-confidence lines before confirming."
          ],
          unresolvedLineRate: 0.5,
          reviewBurdenScore: 50,
          policyWarnings: ["OCR confidence policy requires careful review."],
          recommendedReviewMode: "careful_review"
        }
      },
      ocrResult: {
        supplierName: "KitchenHub Cash & Carry",
        invoiceNumber: "OCR-7732",
        invoiceDate: "2026-04-14",
        totalAmountCents: 19840,
        confidence: "low",
        warnings: [
          "RM8 development adapter: fixture OCR result.",
          "Photo was blurry. Review low-confidence lines before confirming."
        ],
        lines: [
          {
            rawProductName: "Burger Dip House",
            quantity: 900,
            unit: "ml",
            unitPriceCents: 5,
            confidence: "medium",
            warnings: []
          }
        ]
      },
      invoiceDraft: {
        id: "ocr-invoice-1",
        restaurantId: "low-margin-kitchen",
        supplierId: "supplier-prime-butchery",
        invoiceNumber: "OCR-7732",
        invoiceDate: "2026-04-14",
        sourceType: "ocr_future",
        parseStatus: "needs_review",
        createdAt: "2026-04-28T11:00:00.000Z"
      },
      supplierSuggestion: {
        supplierId: "supplier-prime-butchery",
        supplierName: "Prime Butchery Co",
        confidence: "high"
      },
      providerConfig: {
        id: "fixture",
        displayName: "Development fixture OCR",
        isConfigured: true,
        isDefault: true,
        modelConfigured: false,
        mode: "development",
        supportsMimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
        maxFileSizeBytes: 10485760
      },
      qualityReport: {
        overallConfidence: "low",
        lineCount: 2,
        unresolvedLineCount: 1,
        missingSupplier: false,
        missingInvoiceDate: false,
        missingPricesCount: 0,
        unknownProductCount: 1,
        unitWarningCount: 0,
        warnings: [
          "RM8 development adapter: fixture OCR result.",
          "Photo was blurry. Review low-confidence lines before confirming."
        ],
        unresolvedLineRate: 0.5,
        reviewBurdenScore: 50,
        policyWarnings: ["OCR confidence policy requires careful review."],
        recommendedReviewMode: "careful_review"
      },
      lines: [
        {
          id: "ocr-line-1",
          invoiceId: "ocr-invoice-1",
          rawProductName: "Burger Dip House",
          parsedQuantity: 900,
          parsedUnit: "ml",
          parsedUnitPriceCents: 5,
          parsedLineTotalCents: 4500,
          matchedIngredientId: "beef-patty",
          matchConfidence: "medium",
          reviewStatus: "ready",
          previousCostPerUnitCents: 3,
          newCostPerUnitCents: 5,
          priceDeltaPercent: 66.7,
          warnings: []
        },
        {
          id: "ocr-line-2",
          invoiceId: "ocr-invoice-1",
          rawProductName: "Mystery Herb Mix",
          parsedQuantity: 100,
          parsedUnit: "g",
          parsedUnitPriceCents: 9,
          parsedLineTotalCents: 900,
          matchConfidence: "none",
          reviewStatus: "needs_review",
          warnings: ["OCR could not classify this line."]
        }
      ],
      summary: {
        totalLines: 2,
        readyLineCount: 1,
        needsReviewLineCount: 1,
        ignoredLineCount: 0,
        highConfidenceCount: 0,
        lowConfidenceCount: 1
      }
    });

    vi.mocked(apiClient.confirmInvoiceReview).mockResolvedValue({
      confirmationSummary: {
        invoiceId: "invoice-1",
        supplierName: "Prime Butchery Co",
        confirmedLineCount: 1,
        ignoredLineCount: 1,
        updatedIngredientCount: 1,
        priceIncreaseCount: 1,
        priceDecreaseCount: 0,
        unchangedCount: 0,
        alertCount: 2,
        affectedDishCount: 1,
        topAffectedDishes: [
          {
            dishId: "dish-burger",
            name: "Beef Burger",
            oldCostCents: 870,
            newCostCents: 1050,
            oldMarginPercent: 20.18,
            newMarginPercent: 3.67,
            oldStatus: "loss",
            newStatus: "loss",
            costDeltaPerSaleCents: 180,
            periodProfitImpactCents: -64800,
            salesVolume: 360
          }
        ]
      },
      costHistory: [
        {
          id: "history-1",
          ingredientId: "beef-patty",
          supplierId: "supplier-prime-butchery",
          invoiceLineId: "line-1",
          previousCostPerUnitCents: 3,
          newCostPerUnitCents: 4,
          unit: "g",
          effectiveDate: "2026-04-20",
          createdAt: "2026-04-20T10:15:00.000Z"
        }
      ],
      alerts: [
        {
          id: "alert-1",
          type: "ingredient_price_up",
          severity: "critical",
          ingredientId: "beef-patty",
          supplierId: "supplier-prime-butchery",
          invoiceId: "invoice-1",
          invoiceLineId: "line-1",
          previousCostPerUnitCents: 3,
          newCostPerUnitCents: 4,
        deltaPercent: 33.3,
        affectedDishIds: ["dish-burger"],
        affectedDishNames: ["Beef Burger"],
        estimatedMarginImpactCents: 64800,
        message: "Beef Patty 180g Fresh increased 33.3%. Beef Burger is the largest affected dish.",
          recommendedAction: "Review affected dishes and test margin repair on the highest-volume items.",
          createdAt: "2026-04-20T10:15:00.000Z",
          status: "open"
        }
      ],
      affectedDishes: [
        {
          dishId: "dish-burger",
          name: "Beef Burger",
          oldCostCents: 870,
          newCostCents: 1050,
          oldMarginPercent: 20.18,
          newMarginPercent: 3.67,
          oldStatus: "loss",
          newStatus: "loss",
          costDeltaPerSaleCents: 180,
          periodProfitImpactCents: -64800,
          salesVolume: 360
        }
      ],
      updatedIngredients: [{ id: "beef-patty", name: "Beef Patty", costPerUnitCents: 4, unit: "g" }]
    });
  });

  it("renders sample invoice cards and passes the dataset param into parse calls", async () => {
    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        initialEntries={["/invoices?dataset=low-margin-kitchen"]}
      >
        <InvoicesPage />
      </MemoryRouter>
    );

    expect(await screen.findByText("Prime Butchery Co")).toBeInTheDocument();
    expect(
      await screen.findByText(/Selected Prime Butchery Co\. Use this to confirm costs safely before analytics update\./)
    ).toBeInTheDocument();

    fireEvent.click((await screen.findAllByRole("button", { name: "Parse sample invoice" }))[0]);

    await waitFor(() => {
      expect(vi.mocked(apiClient.parseMockInvoiceSample)).toHaveBeenCalledWith(
        "high-impact-price-spike",
        "low-margin-kitchen"
      );
    });
  });

  it("keeps the confirm button disabled while unresolved lines remain", async () => {
    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        initialEntries={["/invoices?dataset=low-margin-kitchen"]}
      >
        <InvoicesPage />
      </MemoryRouter>
    );

    expect(
      await screen.findByText(/Selected Prime Butchery Co\. Use this to confirm costs safely before analytics update\./)
    ).toBeInTheDocument();
    fireEvent.click((await screen.findAllByRole("button", { name: "Parse sample invoice" }))[0]);

    expect(await screen.findByText("Mystery Herb Mix")).toBeInTheDocument();
    expect(await screen.findByText("Ingredient match is unresolved and must be reviewed or ignored.")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Confirm cost updates" })).toBeDisabled();
    expect(
      (await screen.findAllByText("Resolve or ignore 1 lines before confirming.")).length
    ).toBeGreaterThan(0);
  });

  it("renders manual invoice mode and submits a structured draft with the dataset param", async () => {
    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        initialEntries={["/invoices?dataset=low-margin-kitchen"]}
      >
        <InvoicesPage />
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole("button", { name: "Manual structured entry" }));
    fireEvent.change(screen.getByLabelText("Supplier"), {
      target: { value: "Prime Butchery Co" }
    });
    fireEvent.change(screen.getByLabelText("Invoice number"), {
      target: { value: "MAN-100" }
    });
    fireEvent.change(screen.getAllByLabelText("Product name")[0], {
      target: { value: "Beef Patty 180g Fresh" }
    });
    fireEvent.change(screen.getAllByLabelText("Quantity")[0], {
      target: { value: "1000" }
    });
    fireEvent.change(screen.getAllByLabelText("Unit price")[0], {
      target: { value: "0.04" }
    });
    fireEvent.change(screen.getAllByLabelText("Matched ingredient")[0], {
      target: { value: "beef-patty" }
    });

    fireEvent.click(screen.getByRole("button", { name: "Create manual draft" }));

    await waitFor(() => {
      expect(vi.mocked(apiClient.createManualInvoiceDraft)).toHaveBeenCalledWith(
        expect.objectContaining({
          supplierName: "Prime Butchery Co",
          invoiceNumber: "MAN-100"
        }),
        "low-margin-kitchen"
      );
    });
  });

  it("renders confirmation summary and alerts after review-confirm", async () => {
    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        initialEntries={["/invoices?dataset=low-margin-kitchen"]}
      >
        <InvoicesPage />
      </MemoryRouter>
    );

    expect(
      await screen.findByText(/Selected Prime Butchery Co\. Use this to confirm costs safely before analytics update\./)
    ).toBeInTheDocument();
    fireEvent.click((await screen.findAllByRole("button", { name: "Parse sample invoice" }))[0]);

    const confirmButton = await screen.findByRole("button", { name: "Confirm cost updates" });
    fireEvent.click(screen.getAllByRole("button", { name: "Ignore line" })[1]);

    await waitFor(() => {
      expect(confirmButton).not.toBeDisabled();
    });

    fireEvent.click(confirmButton);

    expect(await screen.findByText("What changed")).toBeInTheDocument();
    expect(await screen.findByText("1 confirmed lines updated current ingredient costs for Low Margin Kitchen.")).toBeInTheDocument();
    expect(
      await screen.findByText("Beef Patty 180g Fresh increased 33.3%. Beef Burger is the largest affected dish.")
    ).toBeInTheDocument();
    expect(await screen.findByText("Where the cost move lands first")).toBeInTheDocument();

    expect(vi.mocked(apiClient.confirmInvoiceReview)).toHaveBeenCalledWith(
      "invoice-1",
      expect.objectContaining({ supplierId: "supplier-prime-butchery" }),
      "low-margin-kitchen"
    );
  });

  it("renders OCR upload mode and passes the dataset param into OCR draft creation", async () => {
    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        initialEntries={["/invoices?dataset=low-margin-kitchen"]}
      >
        <InvoicesPage />
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole("button", { name: "Photo/OCR Upload" }));
    const file = new File(["fixture"], "blurry-invoice-photo.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByLabelText("Choose file"), {
      target: { files: [file] }
    });

    fireEvent.click(screen.getByRole("button", { name: "Create review draft" }));

    await waitFor(() => {
      expect(vi.mocked(apiClient.uploadOcrInvoice)).toHaveBeenCalledWith(
        expect.objectContaining({ name: "blurry-invoice-photo.jpg" }),
        "low-margin-kitchen",
        "fixture"
      );
    });
  });

  it("shows OCR warnings and keeps confirmation blocked until unresolved OCR lines are handled", async () => {
    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        initialEntries={["/invoices?dataset=low-margin-kitchen"]}
      >
        <InvoicesPage />
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole("button", { name: "Photo/OCR Upload" }));
    const file = new File(["fixture"], "blurry-invoice-photo.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByLabelText("Choose file"), {
      target: { files: [file] }
    });
    fireEvent.click(screen.getByRole("button", { name: "Create review draft" }));

    expect(await screen.findByText("OCR quality gate")).toBeInTheDocument();
    expect(await screen.findByText("Photo was blurry. Review low-confidence lines before confirming.")).toBeInTheDocument();
    expect(await screen.findByText("OCR could not classify this line.")).toBeInTheDocument();
    expect(await screen.findByText("Recommended mode: Careful review.")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Confirm cost updates" })).toBeDisabled();
    expect(
      (await screen.findAllByText("Resolve or ignore 1 OCR lines before confirming.")).length
    ).toBeGreaterThan(0);
  });

  it("renders OCR provider status and latest OCR jobs", async () => {
    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        initialEntries={["/invoices?dataset=low-margin-kitchen"]}
      >
        <InvoicesPage />
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole("button", { name: "Photo/OCR Upload" }));

    expect(await screen.findByLabelText("OCR provider")).toHaveValue("fixture");
    expect(screen.getByRole("option", { name: "Development fixture OCR" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "External OCR provider (not configured)" })).toBeDisabled();
    expect(await screen.findByText("Configured")).toBeInTheDocument();
    expect(
      await screen.findByText("Development upload adapter is local and deterministic for draft creation.")
    ).toBeInTheDocument();
    expect(await screen.findByText(/Upload creates a review draft\. Costs update only after confirmation\./)).toBeInTheDocument();
    expect(await screen.findByText("Latest OCR jobs")).toBeInTheDocument();
    expect(await screen.findByText("failed-upload.jpg")).toBeInTheDocument();
    expect(await screen.findByText("OCR provider is unavailable.")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Retry OCR job" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Cancel job" })).toBeInTheDocument();
  });
});
