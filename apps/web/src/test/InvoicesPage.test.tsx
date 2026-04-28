import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { InvoicesPage } from "../pages/Invoices.js";

vi.mock("../api/client.js", () => ({
  apiClient: {
    getDemoDatasets: vi.fn(),
    getIngredients: vi.fn(),
    getSuppliers: vi.fn(),
    getInvoiceSamples: vi.fn(),
    parseMockInvoiceSample: vi.fn(),
    confirmInvoiceReview: vi.fn()
  }
}));

import { apiClient } from "../api/client.js";

describe("InvoicesPage", () => {
  beforeEach(() => {
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

    fireEvent.click((await screen.findAllByRole("button", { name: "Parse sample invoice" }))[0]);

    expect(await screen.findByText("Mystery Herb Mix")).toBeInTheDocument();
    expect(await screen.findByText("Ingredient match is unresolved and must be reviewed or ignored.")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Confirm cost updates" })).toBeDisabled();
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
});
