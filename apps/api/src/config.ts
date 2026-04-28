import type { AppMode, AppStore } from "./store/types.js";
import type { OcrProviderRegistry } from "./ocr/providerRegistry.js";

const defaultVersion = "0.1.0";

export interface AppConfigResponse {
  appMode: AppMode;
  version: string;
  features: {
    invoiceIntake: boolean;
    ocrFixture: boolean;
    externalOcrConfigured: boolean;
    persistence: ReturnType<AppStore["getStorageType"]>;
  };
}

export interface DeepHealthResponse {
  ok: boolean;
  storage: ReturnType<AppStore["getStorageType"]>;
  appMode: AppMode;
  externalOcrConfigured: boolean;
  checks: Array<{
    key: string;
    status: "pass" | "warn";
    message: string;
  }>;
}

export function getAppMode(environment: NodeJS.ProcessEnv = process.env): AppMode {
  return environment.APP_MODE === "pilot" ? "pilot" : "demo";
}

export function getAppVersion(environment: NodeJS.ProcessEnv = process.env): string {
  return environment.npm_package_version ?? defaultVersion;
}

export function buildAppConfig(
  store: AppStore,
  ocrRegistry: OcrProviderRegistry,
  environment: NodeJS.ProcessEnv = process.env
): AppConfigResponse {
  const externalProvider = ocrRegistry
    .getProviders()
    .find((provider) => provider.id === "external_env");

  return {
    appMode: getAppMode(environment),
    version: getAppVersion(environment),
    features: {
      invoiceIntake: true,
      ocrFixture: true,
      externalOcrConfigured: externalProvider?.isConfigured ?? false,
      persistence: store.getStorageType()
    }
  };
}

export function buildDeepHealth(
  store: AppStore,
  ocrRegistry: OcrProviderRegistry,
  environment: NodeJS.ProcessEnv = process.env
): DeepHealthResponse {
  const config = buildAppConfig(store, ocrRegistry, environment);

  return {
    ok: true,
    storage: config.features.persistence,
    appMode: config.appMode,
    externalOcrConfigured: config.features.externalOcrConfigured,
    checks: [
      {
        key: "storage",
        status: config.features.persistence === "memory" ? "warn" : "pass",
        message:
          config.features.persistence === "memory"
            ? "Memory storage is active. Restarting the API resets pilot data."
            : "Persistent storage is active."
      },
      {
        key: "invoice_intake",
        status: "pass",
        message: "Invoice review-confirm workflow is available."
      },
      {
        key: "ocr_provider",
        status: config.features.externalOcrConfigured ? "pass" : "warn",
        message: config.features.externalOcrConfigured
          ? "External OCR provider is configured."
          : "External OCR provider is not configured. Fixture OCR remains available."
      }
    ]
  };
}
