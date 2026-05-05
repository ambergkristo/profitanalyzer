import type { AuthMode } from "../auth/types.js";
import type { OcrProviderRegistry } from "../ocr/providerRegistry.js";
import type { AppMode, PersistenceType, StorageInfo } from "../store/types.js";

export type RuntimeNodeEnv = "development" | "test" | "production";
export type RuntimeCheckStatus = "pass" | "warn" | "fail" | "skipped";
export type LogLevel = "debug" | "info" | "warn" | "error";
export type OcrProviderId = "fixture" | "external_env" | "disabled";
export type BillingProviderId = "none" | "manual" | "stripe_future";

const allowedNodeEnvs = ["development", "test", "production"] as const;
const allowedAppModes = ["demo", "pilot", "production"] as const;
const allowedAuthModes = ["disabled", "dev", "production_future"] as const;
const allowedStoreDrivers = ["memory", "file", "database"] as const;
const allowedOcrProviders = ["fixture", "external_env", "disabled"] as const;
const allowedLogLevels = ["debug", "info", "warn", "error"] as const;
const allowedUploadStorageDrivers = ["memory", "local_file"] as const;
const allowedBillingProviders = ["none", "manual", "stripe_future"] as const;
const obviousPlaceholderValues = new Set([
  "",
  "changeme",
  "change-me",
  "replace-me",
  "replace_with_real_value",
  "your_api_key_here",
  "your_model_here"
]);

export interface RuntimeCheck {
  name: string;
  status: RuntimeCheckStatus;
  message: string;
}

export interface RuntimeProfileSnapshot {
  nodeEnv: RuntimeNodeEnv;
  appMode: AppMode;
  storeDriver: PersistenceType;
  authMode: AuthMode;
  ocrProvider: OcrProviderId;
  logLevel: LogLevel;
  uploadStorageDriver: "memory" | "local_file";
  billingProvider: BillingProviderId;
  billingProviderConfigured: boolean;
  uploadDataDirConfigured: boolean;
  uploadMaxFileSizeBytes: number;
  databaseConfigured: boolean;
  externalOcrConfigured: boolean;
  sessionSecretConfigured: boolean;
  appBaseUrlConfigured: boolean;
  apiBaseUrlConfigured: boolean;
  corsOriginConfigured: boolean;
}

export interface EnvironmentValidationResult {
  ok: boolean;
  warnings: string[];
  blockers: string[];
  checks: RuntimeCheck[];
  profile: RuntimeProfileSnapshot;
}

function isAllowedValue<T extends readonly string[]>(
  value: string,
  allowed: T
): value is T[number] {
  return (allowed as readonly string[]).includes(value);
}

function normalizeEnvValue(value: string | undefined, fallback: string) {
  return value?.trim() || fallback;
}

function isConfigured(value: string | undefined) {
  return Boolean(value?.trim());
}

function isPlaceholderValue(value: string | undefined) {
  const normalized = value?.trim().toLowerCase() ?? "";
  return obviousPlaceholderValues.has(normalized);
}

function buildCheck(name: string, status: RuntimeCheckStatus, message: string): RuntimeCheck {
  return { name, status, message };
}

function isValidOriginList(value: string | undefined) {
  if (!value?.trim()) {
    return false;
  }

  const parts = value
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (parts.length === 0 || parts.some((part) => part === "*")) {
    return false;
  }

  return parts.every((part) => /^https?:\/\/[^/\s]+/u.test(part));
}

export function getNodeEnv(environment: NodeJS.ProcessEnv = process.env): RuntimeNodeEnv {
  const nodeEnv = normalizeEnvValue(environment.NODE_ENV, "development");
  return isAllowedValue(nodeEnv, allowedNodeEnvs) ? nodeEnv : "development";
}

export function getAppMode(environment: NodeJS.ProcessEnv = process.env): AppMode {
  const appMode = normalizeEnvValue(environment.APP_MODE, "demo");
  if (appMode === "pilot" || appMode === "production") {
    return appMode;
  }

  return "demo";
}

export function getLogLevel(environment: NodeJS.ProcessEnv = process.env): LogLevel {
  const nodeEnv = getNodeEnv(environment);
  const fallbackLevel = nodeEnv === "production" ? "info" : nodeEnv === "test" ? "warn" : "debug";
  const configured = normalizeEnvValue(environment.LOG_LEVEL, fallbackLevel);
  return isAllowedValue(configured, allowedLogLevels) ? configured : "info";
}

export function getAppVersion(environment: NodeJS.ProcessEnv = process.env): string {
  return environment.npm_package_version?.trim() || "0.1.0";
}

export function getApiBaseUrl(environment: NodeJS.ProcessEnv = process.env) {
  return environment.API_BASE_URL?.trim() || undefined;
}

export function getAppBaseUrl(environment: NodeJS.ProcessEnv = process.env) {
  return environment.APP_BASE_URL?.trim() || undefined;
}

export function getCorsOrigin(environment: NodeJS.ProcessEnv = process.env) {
  return environment.CORS_ORIGIN?.trim() || undefined;
}

export function isSessionSecretConfigured(environment: NodeJS.ProcessEnv = process.env) {
  return isConfigured(environment.SESSION_SECRET) && !isPlaceholderValue(environment.SESSION_SECRET);
}

export function validateEnvironmentProfile(input: {
  environment?: NodeJS.ProcessEnv;
  storageInfo?: StorageInfo;
  authMode: AuthMode;
  ocrRegistry?: OcrProviderRegistry;
}): EnvironmentValidationResult {
  const environment = input.environment ?? process.env;
  const rawNodeEnv = normalizeEnvValue(environment.NODE_ENV, "development");
  const nodeEnv = isAllowedValue(rawNodeEnv, allowedNodeEnvs) ? rawNodeEnv : "development";
  const rawAppMode = normalizeEnvValue(environment.APP_MODE, "demo");
  const rawStoreDriver = normalizeEnvValue(environment.STORE_DRIVER, "memory");
  const rawAuthMode = normalizeEnvValue(environment.AUTH_MODE, "dev");
  const rawOcrProvider = normalizeEnvValue(environment.OCR_PROVIDER, "fixture");
  const rawLogLevel = normalizeEnvValue(
    environment.LOG_LEVEL,
    nodeEnv === "production" ? "info" : nodeEnv === "test" ? "warn" : "debug"
  );
  const rawUploadStorageDriver = normalizeEnvValue(environment.UPLOAD_STORAGE_DRIVER, "memory");
  const rawBillingProvider = normalizeEnvValue(environment.BILLING_PROVIDER, "none");
  const uploadMaxFileSizeBytes = Number(environment.UPLOAD_MAX_FILE_SIZE_BYTES ?? 10 * 1024 * 1024);

  const checks: RuntimeCheck[] = [];
  const warnings: string[] = [];
  const blockers: string[] = [];

  const appMode = isAllowedValue(rawAppMode, allowedAppModes) ? rawAppMode : "demo";
  const storeDriver = isAllowedValue(rawStoreDriver, allowedStoreDrivers) ? rawStoreDriver : "memory";
  const authMode = isAllowedValue(rawAuthMode, allowedAuthModes) ? rawAuthMode : "dev";
  const ocrProvider = isAllowedValue(rawOcrProvider, allowedOcrProviders)
    ? rawOcrProvider
    : "fixture";
  const logLevel = isAllowedValue(rawLogLevel, allowedLogLevels) ? rawLogLevel : "info";
  const uploadStorageDriver = isAllowedValue(rawUploadStorageDriver, allowedUploadStorageDrivers)
    ? rawUploadStorageDriver
    : "memory";
  const billingProvider = isAllowedValue(rawBillingProvider, allowedBillingProviders)
    ? rawBillingProvider
    : "none";

  const sessionSecretConfigured = isSessionSecretConfigured(environment);
  const appBaseUrlConfigured = isConfigured(environment.APP_BASE_URL);
  const apiBaseUrlConfigured = isConfigured(environment.API_BASE_URL);
  const corsOriginConfigured = isConfigured(environment.CORS_ORIGIN);
  const databaseConfigured = isConfigured(environment.DATABASE_URL);
  const billingProviderConfigured =
    billingProvider === "stripe_future"
      ? isConfigured(environment.BILLING_PROVIDER_SECRET_KEY) &&
        !isPlaceholderValue(environment.BILLING_PROVIDER_SECRET_KEY)
      : true;
  const externalOcrConfigured =
    ocrProvider === "external_env"
      ? isConfigured(environment.OCR_PROVIDER_API_KEY) &&
        !isPlaceholderValue(environment.OCR_PROVIDER_API_KEY) &&
        isConfigured(environment.OCR_PROVIDER_MODEL) &&
        !isPlaceholderValue(environment.OCR_PROVIDER_MODEL)
      : (input.ocrRegistry?.getProviders().find((provider) => provider.id === "external_env")?.isConfigured ??
        false);

  const snapshot: RuntimeProfileSnapshot = {
    nodeEnv,
    appMode,
    storeDriver,
    authMode,
    ocrProvider,
    logLevel,
    uploadStorageDriver,
    billingProvider,
    billingProviderConfigured,
    uploadDataDirConfigured: isConfigured(environment.UPLOAD_DATA_DIR),
    uploadMaxFileSizeBytes:
      Number.isFinite(uploadMaxFileSizeBytes) && uploadMaxFileSizeBytes > 0
        ? Math.floor(uploadMaxFileSizeBytes)
        : 0,
    databaseConfigured,
    externalOcrConfigured,
    sessionSecretConfigured,
    appBaseUrlConfigured,
    apiBaseUrlConfigured,
    corsOriginConfigured
  };

  function pushCheck(name: string, status: RuntimeCheckStatus, message: string) {
    checks.push(buildCheck(name, status, message));
    if (status === "fail") {
      blockers.push(message);
      return;
    }

    if (status === "warn") {
      warnings.push(message);
    }
  }

  pushCheck(
    "node_env",
    isAllowedValue(rawNodeEnv, allowedNodeEnvs) ? "pass" : "fail",
    isAllowedValue(rawNodeEnv, allowedNodeEnvs)
      ? `NODE_ENV is ${rawNodeEnv}.`
      : `NODE_ENV must be one of: ${allowedNodeEnvs.join(", ")}.`
  );

  pushCheck(
    "app_mode",
    isAllowedValue(rawAppMode, allowedAppModes) ? "pass" : "fail",
    isAllowedValue(rawAppMode, allowedAppModes)
      ? `APP_MODE is ${rawAppMode}.`
      : `APP_MODE must be one of: ${allowedAppModes.join(", ")}.`
  );

  pushCheck(
    "store_driver",
    isAllowedValue(rawStoreDriver, allowedStoreDrivers) ? "pass" : "fail",
    isAllowedValue(rawStoreDriver, allowedStoreDrivers)
      ? `STORE_DRIVER is ${rawStoreDriver}.`
      : `STORE_DRIVER must be one of: ${allowedStoreDrivers.join(", ")}.`
  );

  pushCheck(
    "auth_mode",
    isAllowedValue(rawAuthMode, allowedAuthModes) ? "pass" : "fail",
    isAllowedValue(rawAuthMode, allowedAuthModes)
      ? `AUTH_MODE is ${rawAuthMode}.`
      : `AUTH_MODE must be one of: ${allowedAuthModes.join(", ")}.`
  );

  pushCheck(
    "log_level",
    isAllowedValue(rawLogLevel, allowedLogLevels) ? "pass" : "fail",
    isAllowedValue(rawLogLevel, allowedLogLevels)
      ? `LOG_LEVEL is ${rawLogLevel}.`
      : `LOG_LEVEL must be one of: ${allowedLogLevels.join(", ")}.`
  );

  pushCheck(
    "upload_storage_driver",
    isAllowedValue(rawUploadStorageDriver, allowedUploadStorageDrivers) ? "pass" : "fail",
    isAllowedValue(rawUploadStorageDriver, allowedUploadStorageDrivers)
      ? `UPLOAD_STORAGE_DRIVER is ${rawUploadStorageDriver}.`
      : `UPLOAD_STORAGE_DRIVER must be one of: ${allowedUploadStorageDrivers.join(", ")}.`
  );

  pushCheck(
    "upload_max_file_size",
    Number.isFinite(uploadMaxFileSizeBytes) && uploadMaxFileSizeBytes > 0 ? "pass" : "fail",
    Number.isFinite(uploadMaxFileSizeBytes) && uploadMaxFileSizeBytes > 0
      ? `UPLOAD_MAX_FILE_SIZE_BYTES is ${Math.floor(uploadMaxFileSizeBytes)}.`
      : "UPLOAD_MAX_FILE_SIZE_BYTES must be a positive number."
  );

  pushCheck(
    "billing_provider",
    isAllowedValue(rawBillingProvider, allowedBillingProviders) ? "pass" : "fail",
    isAllowedValue(rawBillingProvider, allowedBillingProviders)
      ? `BILLING_PROVIDER is ${rawBillingProvider}.`
      : `BILLING_PROVIDER must be one of: ${allowedBillingProviders.join(", ")}.`
  );

  pushCheck(
    "billing_provider_config",
    billingProvider === "stripe_future"
      ? billingProviderConfigured
        ? "warn"
        : appMode === "production"
          ? "fail"
          : "warn"
      : "pass",
    billingProvider === "stripe_future"
      ? billingProviderConfigured
        ? "Stripe future provider env is present, but live checkout is intentionally not implemented."
        : appMode === "production"
          ? "BILLING_PROVIDER_SECRET_KEY is required when BILLING_PROVIDER=stripe_future in production mode."
          : "Stripe future provider is selected but not configured; checkout remains disabled."
      : `Billing provider ${billingProvider} does not require external credentials.`
  );

  pushCheck(
    "billing_production",
    appMode === "production"
      ? billingProvider === "none" || billingProvider === "manual"
        ? "warn"
        : "warn"
      : "skipped",
    appMode === "production"
      ? billingProvider === "none" || billingProvider === "manual"
        ? "Production mode has no live payment provider; this is acceptable only before paid launch."
        : "Production mode uses a future billing provider seam; live checkout is still not implemented."
      : "Production billing rules are not required for this mode."
  );

  pushCheck(
    "upload_storage_production",
    appMode === "production"
      ? uploadStorageDriver === "local_file"
        ? "warn"
        : "fail"
      : "skipped",
    appMode === "production"
      ? uploadStorageDriver === "local_file"
        ? "Local upload file storage requires a persistent disk or external storage before production launch."
        : "APP_MODE=production cannot rely on memory upload storage."
      : "Production upload storage rules are not required for this mode."
  );

  pushCheck(
    "database_url",
    storeDriver === "database"
      ? databaseConfigured
        ? "pass"
        : "fail"
      : "skipped",
    storeDriver === "database"
      ? databaseConfigured
        ? "DATABASE_URL is configured for database storage."
        : "DATABASE_URL is required when STORE_DRIVER=database."
      : "DATABASE_URL is not required for this storage driver."
  );

  const authRequiresSessionSecret = appMode !== "demo" && authMode !== "disabled";
  pushCheck(
    "session_secret",
    authRequiresSessionSecret
      ? sessionSecretConfigured
        ? "pass"
        : "fail"
      : "skipped",
    authRequiresSessionSecret
      ? sessionSecretConfigured
        ? "SESSION_SECRET is configured."
        : "SESSION_SECRET is required in non-demo authenticated modes."
      : "SESSION_SECRET is not required for this mode."
  );

  pushCheck(
    "ocr_provider",
    ocrProvider === "external_env"
      ? externalOcrConfigured
        ? "pass"
        : "fail"
      : ocrProvider === "fixture" && appMode === "production"
        ? "warn"
        : "pass",
    ocrProvider === "external_env"
      ? externalOcrConfigured
        ? "External OCR provider environment is configured."
        : "OCR_PROVIDER_API_KEY and OCR_PROVIDER_MODEL are required when OCR_PROVIDER=external_env."
      : ocrProvider === "fixture" && appMode === "production"
        ? "Production mode is still relying on fixture OCR."
        : `OCR provider ${ocrProvider} is allowed.`
  );

  pushCheck(
    "production_auth",
    appMode === "production"
      ? authMode === "production_future"
        ? "warn"
        : "fail"
      : "skipped",
    appMode === "production"
      ? authMode === "production_future"
        ? "Production mode uses the placeholder production auth mode and still needs a real identity provider."
        : "APP_MODE=production cannot use AUTH_MODE=dev or AUTH_MODE=disabled."
      : "Production auth rules are not required for this mode."
  );

  pushCheck(
    "production_storage",
    appMode === "production"
      ? storeDriver === "database"
        ? "pass"
        : "fail"
      : appMode === "pilot" && storeDriver === "memory"
        ? "warn"
        : "skipped",
    appMode === "production"
      ? storeDriver === "database"
        ? "Production mode uses the database store driver."
        : "APP_MODE=production requires STORE_DRIVER=database."
      : appMode === "pilot" && storeDriver === "memory"
        ? "APP_MODE=pilot with STORE_DRIVER=memory resets data on restart."
        : "No production storage blocker for this mode."
  );

  pushCheck(
    "production_urls",
    appMode === "production"
      ? appBaseUrlConfigured && apiBaseUrlConfigured
        ? "pass"
        : "fail"
      : "skipped",
    appMode === "production"
      ? appBaseUrlConfigured && apiBaseUrlConfigured
        ? "APP_BASE_URL and API_BASE_URL are configured."
        : "APP_BASE_URL and API_BASE_URL are required in production mode."
      : "Production base URLs are not required for this mode."
  );

  pushCheck(
    "cors_origin",
    appMode === "production"
      ? isValidOriginList(environment.CORS_ORIGIN)
        ? "pass"
        : "fail"
      : corsOriginConfigured
        ? isValidOriginList(environment.CORS_ORIGIN)
          ? "pass"
          : "warn"
        : "skipped",
    appMode === "production"
      ? isValidOriginList(environment.CORS_ORIGIN)
        ? "CORS_ORIGIN is configured with explicit HTTP(S) origins."
        : "CORS_ORIGIN must list explicit HTTP(S) origins in production mode."
      : corsOriginConfigured
        ? isValidOriginList(environment.CORS_ORIGIN)
          ? "CORS_ORIGIN is explicitly configured."
          : "CORS_ORIGIN should contain explicit HTTP(S) origins."
        : "CORS_ORIGIN is not required for this mode."
  );

  if (appMode === "production" && rawNodeEnv !== "production") {
    pushCheck(
      "production_node_env",
      "fail",
      "APP_MODE=production requires NODE_ENV=production."
    );
  } else if (appMode !== "production") {
    pushCheck("production_node_env", "skipped", "NODE_ENV strict production rule is not required.");
  }

  if (appMode !== "demo" && authMode === "disabled") {
    pushCheck(
      "disabled_auth_non_demo",
      "warn",
      "AUTH_MODE=disabled outside demo mode weakens workspace access control."
    );
  }

  if (appMode === "production") {
    if (isPlaceholderValue(environment.SESSION_SECRET)) {
      pushCheck("placeholder_session_secret", "fail", "SESSION_SECRET cannot use a placeholder value in production mode.");
    }

    if (storeDriver === "database" && /user:password@/iu.test(environment.DATABASE_URL ?? "")) {
      pushCheck("placeholder_database_url", "fail", "DATABASE_URL cannot use documentation placeholder credentials in production mode.");
    }

    if (ocrProvider === "external_env" && isPlaceholderValue(environment.OCR_PROVIDER_API_KEY)) {
      pushCheck("placeholder_ocr_secret", "fail", "OCR_PROVIDER_API_KEY cannot use a placeholder value in production mode.");
    }
  }

  if (input.storageInfo && storeDriver === "database" && databaseConfigured) {
    pushCheck(
      "database_reachability",
      input.storageInfo.readable && input.storageInfo.writable ? "pass" : "fail",
      input.storageInfo.readable && input.storageInfo.writable
        ? "Database storage reports readable and writable."
        : input.storageInfo.persistenceWarning ?? "Database storage is not reachable."
    );
  } else if (input.storageInfo && storeDriver === "file") {
    pushCheck(
      "file_storage",
      input.storageInfo.readable && input.storageInfo.writable ? "pass" : "warn",
      input.storageInfo.readable && input.storageInfo.writable
        ? "File storage is readable and writable."
        : input.storageInfo.persistenceWarning ?? "File storage is not fully writable."
    );
  } else if (storeDriver === "memory") {
    pushCheck(
      "memory_storage",
      appMode === "production" ? "fail" : "warn",
      appMode === "production"
        ? "Memory storage is not acceptable in production mode."
        : "Memory storage resets data on restart."
    );
  }

  return {
    ok: blockers.length === 0,
    warnings,
    blockers,
    checks,
    profile: snapshot
  };
}
