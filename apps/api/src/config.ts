import type { AppMode, AppStore } from "./store/types.js";
import type { AuthMode } from "./auth/types.js";
import type { AuthService } from "./auth/service.js";
import type { OcrProviderRegistry } from "./ocr/providerRegistry.js";

const defaultVersion = "0.1.0";

export interface AppConfigResponse {
  appMode: AppMode;
  version: string;
  productionReadinessClaimed: false;
  storage: ReturnType<AppStore["getStorageInfo"]>;
  workspaceContext: ReturnType<AppStore["getStoreContext"]>;
  auth: {
    mode: AuthMode;
    required: boolean;
  };
  features: {
    invoiceIntake: boolean;
    ocrFixture: boolean;
    externalOcrConfigured: boolean;
    databaseConfigured: boolean;
  };
}

export interface DeepHealthResponse {
  ok: boolean;
  storage: ReturnType<AppStore["getStorageInfo"]>;
  appMode: AppMode;
  workspaceContext: ReturnType<AppStore["getStoreContext"]>;
  externalOcrConfigured: boolean;
  auth: AppConfigResponse["auth"];
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
  authService: AuthService,
  ocrRegistry: OcrProviderRegistry,
  environment: NodeJS.ProcessEnv = process.env
): AppConfigResponse {
  const externalProvider = ocrRegistry
    .getProviders()
    .find((provider) => provider.id === "external_env");

  return {
    appMode: getAppMode(environment),
    version: getAppVersion(environment),
    productionReadinessClaimed: false,
    storage: store.getStorageInfo(),
    workspaceContext: store.getStoreContext(),
    auth: {
      mode: authService.getMode(),
      required: authService.isAuthRequired()
    },
    features: {
      invoiceIntake: true,
      ocrFixture: true,
      externalOcrConfigured: externalProvider?.isConfigured ?? false,
      databaseConfigured: store.getStorageInfo().databaseConfigured ?? false
    }
  };
}

export function buildDeepHealth(
  store: AppStore,
  authService: AuthService,
  ocrRegistry: OcrProviderRegistry,
  environment: NodeJS.ProcessEnv = process.env
): DeepHealthResponse {
  const config = buildAppConfig(store, authService, ocrRegistry, environment);
  const storageChecks: DeepHealthResponse["checks"] = [];

  if (config.storage.driver === "memory") {
    storageChecks.push({
      key: "storage",
      status: "warn",
      message: config.storage.persistenceWarning ?? "Memory storage is active. Restarting the API resets pilot data."
    });
  } else if (config.storage.driver === "database") {
    storageChecks.push({
      key: "database_config",
      status: config.storage.databaseConfigured ? "pass" : "fail",
      message: config.storage.databaseConfigured
        ? "Database store is configured."
        : "Database store is selected, but DATABASE_URL is missing."
    });
    storageChecks.push({
      key: "database_connectivity",
      status: config.storage.readable && config.storage.writable ? "pass" : "fail",
      message: config.storage.readable && config.storage.writable
        ? "Database connectivity checks passed."
        : config.storage.persistenceWarning ?? "Database connectivity checks failed."
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
        : config.storage.driver === "database"
          ? Boolean(config.storage.databaseConfigured) &&
            config.storage.readable &&
            config.storage.writable
        : config.storage.readable && config.storage.writable,
    storage: config.storage,
    appMode: config.appMode,
    workspaceContext: config.workspaceContext,
    externalOcrConfigured: config.features.externalOcrConfigured,
    auth: config.auth,
    checks: [
      ...storageChecks,
      {
        key: "auth_mode",
        status: config.auth.required ? "pass" : config.appMode === "demo" ? "warn" : "fail",
        message: config.auth.required
          ? `Auth mode ${config.auth.mode} is active.`
          : config.appMode === "demo"
            ? "Demo mode allows no-auth access."
            : "Auth is disabled outside demo mode."
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
