import {
  resolveFixtureOcrResult,
  type OcrParsedInvoiceResult,
  type OcrProvider,
  type OcrProviderConfig
} from "../../../../packages/core/src/index.js";
import {
  buildExternalProviderConfig,
  createExternalOcrProviderAdapter,
  type CreateExternalOcrProviderOptions
} from "./externalProvider.js";
import {
  OcrProviderExecutionError,
  OcrProviderNotConfiguredError,
  type OcrUploadPayload
} from "./shared.js";

const supportedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf"
] as const;

const maxFileSizeBytes = 10 * 1024 * 1024;

export function sanitizeUploadedFileName(fileName: string) {
  return fileName.replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").slice(0, 120) || "upload";
}

function buildFixtureConfig(): OcrProviderConfig {
  return {
    id: "fixture",
    displayName: "Development fixture OCR",
    isConfigured: true,
    isDefault: true,
    modelConfigured: false,
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
    modelConfigured: false,
    supportsMimeTypes: [...supportedMimeTypes],
    maxFileSizeBytes,
    mode: "disabled"
  };
}

function parseWithFixture(input: OcrUploadPayload): Promise<OcrParsedInvoiceResult> {
  return Promise.resolve(resolveFixtureOcrResult(sanitizeUploadedFileName(input.fileName)));
}

export interface OcrProviderHandler {
  config: OcrProviderConfig;
  parse(input: OcrUploadPayload): Promise<OcrParsedInvoiceResult>;
}

export interface OcrProviderRegistry {
  getProviders(): OcrProviderConfig[];
  getDefaultProvider(): OcrProviderConfig;
  getProvider(providerId?: string): OcrProviderHandler | null;
  parse(
    providerId: OcrProvider,
    input: OcrUploadPayload
  ): Promise<{ provider: OcrProviderConfig; result: OcrParsedInvoiceResult }>;
}

export function createOcrProviderRegistry(
  options: CreateExternalOcrProviderOptions = {}
): OcrProviderRegistry {
  const externalProviderAdapter = createExternalOcrProviderAdapter(options);
  const providers: Record<OcrProvider, OcrProviderHandler> = {
    fixture: {
      config: buildFixtureConfig(),
      parse: parseWithFixture
    },
    external_env: {
      config: {
        ...buildExternalProviderConfig(options.env),
        supportsMimeTypes: [...supportedMimeTypes],
        maxFileSizeBytes
      },
      parse: (input) => externalProviderAdapter.parse(input)
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
