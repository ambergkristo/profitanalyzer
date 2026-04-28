import { evaluateOcrQuality } from "../../../packages/core/src/index.js";
import { describe, expect, it, vi } from "vitest";
import {
  buildExternalProviderConfig,
  buildExternalProviderRuntimeConfig,
  createExternalOcrProviderAdapter,
  normalizeProviderInvoice,
  parseProviderJsonText
} from "../src/ocr/externalProvider.js";
import { OcrProviderExecutionError, OcrProviderNotConfiguredError } from "../src/ocr/shared.js";

describe("external OCR provider adapter", () => {
  it("builds an unconfigured provider config when env is missing", () => {
    const config = buildExternalProviderConfig({});

    expect(config.id).toBe("external_env");
    expect(config.isConfigured).toBe(false);
    expect(config.modelConfigured).toBe(false);
  });

  it("builds runtime config only when external env is enabled", () => {
    const runtimeConfig = buildExternalProviderRuntimeConfig({
      OCR_PROVIDER: "external_env",
      OCR_PROVIDER_API_KEY: "test-key",
      OCR_PROVIDER_MODEL: "gpt-4.1-mini"
    });

    expect(runtimeConfig).toMatchObject({
      apiKey: "test-key",
      model: "gpt-4.1-mini"
    });
    expect(runtimeConfig?.endpoint).toContain("/responses");
  });

  it("parses valid provider JSON into OCR invoice data", () => {
    const parsed = parseProviderJsonText(
      JSON.stringify({
        supplierName: "Metro Fresh Wholesale",
        invoiceNumber: "EXT-2001",
        invoiceDate: "2026-04-08",
        totalAmountCents: 27680,
        confidence: "medium",
        warnings: ["Synthetic provider response."],
        lines: [
          {
            rawProductName: "Parmesan Grated",
            quantity: 500,
            unit: "g",
            unitPriceCents: 700,
            lineTotalCents: 350000,
            confidence: "high",
            warnings: []
          }
        ]
      })
    );

    expect(parsed.supplierName).toBe("Metro Fresh Wholesale");
    expect(parsed.lines).toHaveLength(1);
    expect(parsed.lines[0]?.unit).toBe("g");
    expect(parsed.lines[0]?.confidence).toBe("high");
  });

  it("fails safely on invalid provider JSON", () => {
    expect(() => parseProviderJsonText("{not-json}")).toThrow(OcrProviderExecutionError);
  });

  it("returns manual-entry quality signals when provider output has no lines", () => {
    const parsed = normalizeProviderInvoice({
      supplierName: "Supplier",
      invoiceNumber: "EXT-2002",
      invoiceDate: "2026-04-09",
      totalAmountCents: 1000,
      confidence: "medium",
      warnings: [],
      lines: []
    });

    const quality = evaluateOcrQuality(parsed);

    expect(parsed.lines).toHaveLength(0);
    expect(quality.recommendedReviewMode).toBe("manual_entry_recommended");
  });

  it("flags invalid units and negative prices", () => {
    const parsed = normalizeProviderInvoice({
      supplierName: "Supplier",
      invoiceNumber: "EXT-2003",
      invoiceDate: "2026-04-09",
      totalAmountCents: 1000,
      confidence: "medium",
      warnings: [],
      lines: [
        {
          rawProductName: "Mystery Product",
          quantity: 2,
          unit: "crate",
          unitPriceCents: -100,
          lineTotalCents: null,
          confidence: "high",
          warnings: []
        }
      ]
    });

    expect(parsed.lines[0]?.unit).toBeUndefined();
    expect(parsed.lines[0]?.unitPriceCents).toBeUndefined();
    expect(parsed.lines[0]?.warnings.join(" ")).toContain("Unsupported unit");
    expect(parsed.lines[0]?.warnings.join(" ")).toContain("negative");
  });

  it("maps decimal money and unknown confidence safely", () => {
    const parsed = normalizeProviderInvoice({
      supplierName: "Supplier",
      invoiceNumber: "EXT-2004",
      invoiceDate: "2026-04-09",
      totalAmountCents: 12.4,
      confidence: "mystery",
      warnings: [],
      lines: [
        {
          rawProductName: "Cream",
          quantity: "1.5",
          unit: "ml",
          unitPriceCents: "4.25",
          lineTotalCents: null,
          confidence: "mystery",
          warnings: []
        }
      ]
    });

    expect(parsed.totalAmountCents).toBe(1240);
    expect(parsed.confidence).toBe("low");
    expect(parsed.lines[0]?.unitPriceCents).toBe(425);
    expect(parsed.lines[0]?.confidence).toBe("low");
    expect(parsed.warnings.join(" ")).toContain("converted from a decimal currency amount");
  });

  it("uses a mocked external provider response to create OCR output", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          output_text: JSON.stringify({
            supplierName: "Metro Fresh Wholesale",
            invoiceNumber: "EXT-2005",
            invoiceDate: "2026-04-08",
            totalAmountCents: 27680,
            confidence: "medium",
            warnings: [],
            lines: [
              {
                rawProductName: "Parmesan Grated",
                quantity: 500,
                unit: "g",
                unitPriceCents: 700,
                lineTotalCents: 350000,
                confidence: "high",
                warnings: []
              }
            ]
          })
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      )
    );

    const adapter = createExternalOcrProviderAdapter({
      env: {
        OCR_PROVIDER: "external_env",
        OCR_PROVIDER_API_KEY: "test-key",
        OCR_PROVIDER_MODEL: "gpt-4.1-mini"
      },
      fetchImpl: fetchMock
    });

    const result = await adapter.parse({
      fileName: "synthetic-provider-invoice.jpg",
      mimeType: "image/jpeg",
      fileSizeBytes: 1024,
      buffer: Buffer.from("fixture")
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.invoiceNumber).toBe("EXT-2005");
    expect(result.lines).toHaveLength(1);
  });

  it("returns a safe configuration error when external env is missing", async () => {
    const adapter = createExternalOcrProviderAdapter({
      env: {}
    });

    await expect(
      adapter.parse({
        fileName: "synthetic-provider-invoice.jpg",
        mimeType: "image/jpeg",
        fileSizeBytes: 1024,
        buffer: Buffer.from("fixture")
      })
    ).rejects.toThrow(OcrProviderNotConfiguredError);
  });
});
