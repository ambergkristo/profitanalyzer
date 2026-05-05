import type { AuthMode } from "./auth/types.js";
import type { AuthService } from "./auth/service.js";
import type { OcrProviderRegistry } from "./ocr/providerRegistry.js";
import {
  getAppBaseUrl,
  getAppMode,
  getAppVersion,
  getApiBaseUrl,
  getCorsOrigin,
  getLogLevel,
  getNodeEnv,
  isSessionSecretConfigured,
  type RuntimeCheck,
  validateEnvironmentProfile
} from "./runtime/profile.js";
import type { AppMode, AppStore } from "./store/types.js";

export { getAppMode, getAppVersion } from "./runtime/profile.js";

const defaultVersion = "0.1.0";

export interface AppConfigResponse {
  appMode: AppMode;
  nodeEnv: ReturnType<typeof getNodeEnv>;
  version: string;
  productionReadinessClaimed: false;
  storage: ReturnType<AppStore["getStorageInfo"]>;
  workspaceContext: ReturnType<AppStore["getStoreContext"]>;
  auth: {
    mode: AuthMode;
    required: boolean;
  };
  runtime: {
    logLevel: ReturnType<typeof getLogLevel>;
    appBaseUrlConfigured: boolean;
    apiBaseUrlConfigured: boolean;
    corsOriginConfigured: boolean;
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
  nodeEnv: ReturnType<typeof getNodeEnv>;
  workspaceContext: ReturnType<AppStore["getStoreContext"]>;
  externalOcrConfigured: boolean;
  auth: AppConfigResponse["auth"];
  checks: Array<{
    key: string;
    status: "pass" | "warn" | "fail";
    message: string;
  }>;
}

export interface ReadinessResponse {
  ok: boolean;
  appMode: AppMode;
  nodeEnv: ReturnType<typeof getNodeEnv>;
  productionReady: false;
  storage: {
    driver: ReturnType<AppStore["getStorageType"]>;
    databaseConfigured: boolean;
    databaseReachable: boolean | null;
  };
  auth: {
    mode: AuthMode;
    required: boolean;
    sessionSecretConfigured: boolean;
  };
  ocr: {
    provider: string;
    externalConfigured: boolean;
  };
  uploadStorage: {
    driver: "memory" | "local_file";
    maxFileSizeBytes: number;
  };
  checks: RuntimeCheck[];
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
    nodeEnv: getNodeEnv(environment),
    version: getAppVersion(environment) ?? defaultVersion,
    productionReadinessClaimed: false,
    storage: store.getStorageInfo(),
    workspaceContext: store.getStoreContext(),
    auth: {
      mode: authService.getMode(),
      required: authService.isAuthRequired()
    },
    runtime: {
      logLevel: getLogLevel(environment),
      appBaseUrlConfigured: Boolean(getAppBaseUrl(environment)),
      apiBaseUrlConfigured: Boolean(getApiBaseUrl(environment)),
      corsOriginConfigured: Boolean(getCorsOrigin(environment))
    },
    features: {
      invoiceIntake: true,
      ocrFixture: true,
      externalOcrConfigured: externalProvider?.isConfigured ?? false,
      databaseConfigured: store.getStorageInfo().databaseConfigured ?? false
    }
  };
}

function mapChecksForLegacyHealth(checks: RuntimeCheck[]) {
  return checks.map((check) => ({
    key: check.name,
    status: check.status === "skipped" ? "warn" : check.status,
    message: check.message
  }));
}

export function buildReadiness(
  store: AppStore,
  authService: AuthService,
  ocrRegistry: OcrProviderRegistry,
  environment: NodeJS.ProcessEnv = process.env
): ReadinessResponse {
  const storage = store.getStorageInfo();
  const validation = validateEnvironmentProfile({
    environment,
    storageInfo: storage,
    authMode: authService.getMode(),
    ocrRegistry
  });
  const provider = normalizeOcrProvider(environment.OCR_PROVIDER);

  return {
    ok: validation.ok,
    appMode: validation.profile.appMode,
    nodeEnv: validation.profile.nodeEnv,
    productionReady: false,
    storage: {
      driver: storage.driver,
      databaseConfigured: Boolean(storage.databaseConfigured),
      databaseReachable: storage.driver === "database" ? storage.readable && storage.writable : null
    },
    auth: {
      mode: authService.getMode(),
      required: authService.isAuthRequired(),
      sessionSecretConfigured: isSessionSecretConfigured(environment)
    },
    ocr: {
      provider,
      externalConfigured: validation.profile.externalOcrConfigured
    },
    uploadStorage: {
      driver: validation.profile.uploadStorageDriver,
      maxFileSizeBytes: validation.profile.uploadMaxFileSizeBytes
    },
    checks: validation.checks
  };
}

function normalizeOcrProvider(value: string | undefined) {
  const provider = value?.trim();
  if (provider === "external_env" || provider === "disabled") {
    return provider;
  }

  return "fixture";
}

export function buildDeepHealth(
  store: AppStore,
  authService: AuthService,
  ocrRegistry: OcrProviderRegistry,
  environment: NodeJS.ProcessEnv = process.env
): DeepHealthResponse {
  const config = buildAppConfig(store, authService, ocrRegistry, environment);
  const readiness = buildReadiness(store, authService, ocrRegistry, environment);

  return {
    ok: readiness.ok,
    storage: config.storage,
    appMode: config.appMode,
    nodeEnv: config.nodeEnv,
    workspaceContext: config.workspaceContext,
    externalOcrConfigured: config.features.externalOcrConfigured,
    auth: config.auth,
    checks: mapChecksForLegacyHealth(readiness.checks)
  };
}
