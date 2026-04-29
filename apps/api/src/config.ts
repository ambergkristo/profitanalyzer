import type { AppMode, AppStore } from "./store/types.js";
import type { OcrProviderRegistry } from "./ocr/providerRegistry.js";

const defaultVersion = "0.1.0";

export interface AppConfigResponse {
  appMode: AppMode;
  version: string;
  storage: ReturnType<AppStore["getStorageInfo"]>;
  features: {
    invoiceIntake: boolean;
    ocrFixture: boolean;
    externalOcrConfigured: boolean;
  };
}

export interface DeepHealthResponse {
  ok: boolean;
  storage: ReturnType<AppStore["getStorageInfo"]>;
  appMode: AppMode;
  externalOcrConfigured: boolean;
  checks: Array<{
    key: string;
    status: "pass" | "warn" | "fail";
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
    storage: store.getStorageInfo(),
    features: {
      invoiceIntake: true,
      ocrFixture: true,
      externalOcrConfigured: externalProvider?.isConfigured ?? false
    }
  };
}

export function buildDeepHealth(
  store: AppStore,
  ocrRegistry: OcrProviderRegistry,
  environment: NodeJS.ProcessEnv = process.env
): DeepHealthResponse {
  const config = buildAppConfig(store, ocrRegistry, environment);
  const storageChecks: DeepHealthResponse["checks"] = [];

  if (config.storage.driver === "memory") {
    storageChecks.push({
      key: "storage",
      status: "warn",
      message: config.storage.persistenceWarning ?? "Memory storage is active. Restarting the API resets pilot data."
    });
  } else {
    storageChecks.push({
      key: "storage_readable",
      status: config.storage.readable ? "pass" : "fail",
      message: config.storage.readable
        ? `File storage is readable at ${config.storage.dataDir}.`
        : `File storage is not readable at ${config.storage.dataDir}.`
    });
    storageChecks.push({
      key: "storage_writable",
      status: config.storage.writable ? "pass" : "fail",
      message: config.storage.writable
        ? `File storage is writable at ${config.storage.dataDir}.`
        : `File storage is not writable at ${config.storage.dataDir}.`
    });
  }

  return {
    ok:
      config.storage.driver === "memory"
        ? true
        : config.storage.readable && config.storage.writable,
    storage: config.storage,
    appMode: config.appMode,
    externalOcrConfigured: config.features.externalOcrConfigured,
    checks: [
      ...storageChecks,
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
