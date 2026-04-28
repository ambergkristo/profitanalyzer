import {
  resolveFixtureOcrResult,
  type OcrParsedInvoiceResult,
  type OcrProvider,
  type OcrProviderConfig
} from "../../../../packages/core/src/index.js";

const supportedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf"
] as const;

const maxFileSizeBytes = 10 * 1024 * 1024;

export class OcrProviderNotConfiguredError extends Error {
  constructor(providerId: OcrProvider) {
    super(`OCR provider "${providerId}" is not configured.`);
    this.name = "OcrProviderNotConfiguredError";
  }
}

export class OcrProviderExecutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OcrProviderExecutionError";
  }
}

export interface OcrUploadPayload {
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  buffer: Buffer;
}

interface OcrProviderHandler {
  config: OcrProviderConfig;
  parse(input: OcrUploadPayload): Promise<OcrParsedInvoiceResult>;
}

export function sanitizeUploadedFileName(fileName: string) {
  return fileName.replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").slice(0, 120) || "upload";
}

function buildExternalConfig(): OcrProviderConfig {
  const isConfigured = Boolean(
    process.env.OCR_PROVIDER === "external_env" &&
      process.env.OCR_PROVIDER_API_KEY &&
      process.env.OCR_PROVIDER_ENDPOINT &&
      process.env.OCR_PROVIDER_MODEL
  );

  return {
    id: "external_env",
    displayName: "External OCR Provider",
    isConfigured,
    isDefault: false,
    supportsMimeTypes: [...supportedMimeTypes],
    maxFileSizeBytes,
    mode: "external"
  };
}

function buildFixtureConfig(): OcrProviderConfig {
  return {
    id: "fixture",
    displayName: "Fixture OCR Adapter",
    isConfigured: true,
    isDefault: true,
    supportsMimeTypes: [...supportedMimeTypes],
    maxFileSizeBytes,
    mode: "development"
  };
}

function buildDisabledConfig(): OcrProviderConfig {
  return {
    id: "disabled",
    displayName: "Disabled OCR Provider",
    isConfigured: false,
    isDefault: false,
    supportsMimeTypes: [],
    maxFileSizeBytes: 0,
    mode: "disabled"
  };
}

function parseWithFixture(input: OcrUploadPayload): Promise<OcrParsedInvoiceResult> {
  return Promise.resolve(resolveFixtureOcrResult(sanitizeUploadedFileName(input.fileName)));
}

function parseWithExternalEnv(): Promise<OcrParsedInvoiceResult> {
  if (
    !process.env.OCR_PROVIDER_API_KEY ||
    !process.env.OCR_PROVIDER_ENDPOINT ||
    !process.env.OCR_PROVIDER_MODEL
  ) {
    throw new OcrProviderNotConfiguredError("external_env");
  }

  return Promise.reject(
    new OcrProviderExecutionError(
      "External OCR provider seam is configured architecturally but not implemented in this repo yet."
    )
  );
}

export function createOcrProviderRegistry() {
  const providers: Record<OcrProvider, OcrProviderHandler> = {
    fixture: {
      config: buildFixtureConfig(),
      parse: parseWithFixture
    },
    external_env: {
      config: buildExternalConfig(),
      parse: parseWithExternalEnv
    },
    disabled: {
      config: buildDisabledConfig(),
      parse: () => Promise.reject(new OcrProviderExecutionError("OCR provider is disabled."))
    }
  };

  return {
    getProviders(): OcrProviderConfig[] {
      return Object.values(providers).map((provider) => provider.config);
    },
    getDefaultProvider(): OcrProviderConfig {
      return providers.fixture.config;
    },
    getProvider(providerId?: string): OcrProviderHandler | null {
      if (!providerId) {
        return providers.fixture;
      }

      if (!Object.hasOwn(providers, providerId)) {
        return null;
      }

      return providers[providerId as OcrProvider];
    },
    parse(providerId: OcrProvider, input: OcrUploadPayload) {
      const provider = providers[providerId];

      if (!provider) {
        return Promise.reject(new OcrProviderExecutionError(`Unknown OCR provider "${providerId}".`));
      }

      if (!provider.config.isConfigured) {
        return Promise.reject(new OcrProviderNotConfiguredError(providerId));
      }

      return provider.parse(input).then((result) => ({
        provider: provider.config,
        result
      }));
    }
  };
}

export function isAllowedMimeType(provider: OcrProviderConfig, mimeType: string) {
  return provider.supportsMimeTypes.includes(mimeType);
}
