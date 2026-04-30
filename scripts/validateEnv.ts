import fs from "node:fs";
import path from "node:path";

const allowedAppModes = ["demo", "pilot"] as const;
const allowedStoreDrivers = ["memory", "file", "database"] as const;
const allowedOcrProviders = ["fixture", "external_env", "disabled"] as const;
const allowedAuthModes = ["disabled", "dev"] as const;

function main() {
  const appMode = process.env.APP_MODE?.trim() || "demo";
  const storeDriver = process.env.STORE_DRIVER?.trim() || "memory";
  const ocrProvider = process.env.OCR_PROVIDER?.trim() || "fixture";
  const authMode = process.env.AUTH_MODE?.trim() || "dev";
  const dataDir = process.env.DATA_DIR?.trim() || ".data";
  const failures: string[] = [];
  const warnings: string[] = [];

  if (!allowedAppModes.includes(appMode as (typeof allowedAppModes)[number])) {
    failures.push(`APP_MODE must be one of: ${allowedAppModes.join(", ")}.`);
  }

  if (!allowedStoreDrivers.includes(storeDriver as (typeof allowedStoreDrivers)[number])) {
    failures.push(`STORE_DRIVER must be one of: ${allowedStoreDrivers.join(", ")}.`);
  }

  if (!allowedOcrProviders.includes(ocrProvider as (typeof allowedOcrProviders)[number])) {
    failures.push(`OCR_PROVIDER must be one of: ${allowedOcrProviders.join(", ")}.`);
  }

  if (!allowedAuthModes.includes(authMode as (typeof allowedAuthModes)[number])) {
    failures.push(`AUTH_MODE must be one of: ${allowedAuthModes.join(", ")}.`);
  }

  if (appMode === "pilot" && storeDriver === "memory") {
    warnings.push("APP_MODE=pilot with STORE_DRIVER=memory means data resets when the API restarts.");
  }

  if (appMode === "pilot" && authMode === "disabled") {
    warnings.push("APP_MODE=pilot with AUTH_MODE=disabled weakens workspace access control.");
  }

  if (storeDriver === "file") {
    const resolvedDataDir = path.resolve(process.cwd(), dataDir);

    try {
      fs.mkdirSync(resolvedDataDir, { recursive: true });
      fs.accessSync(resolvedDataDir, fs.constants.R_OK | fs.constants.W_OK);
    } catch {
      failures.push(`DATA_DIR is not readable and writable: ${resolvedDataDir}`);
    }
  }

  if (storeDriver === "database" && !process.env.DATABASE_URL?.trim()) {
    failures.push("DATABASE_URL is required when STORE_DRIVER=database.");
  }

  if (ocrProvider === "external_env") {
    if (!process.env.OCR_PROVIDER_API_KEY?.trim()) {
      failures.push("OCR_PROVIDER_API_KEY is required when OCR_PROVIDER=external_env.");
    }

    if (!process.env.OCR_PROVIDER_MODEL?.trim()) {
      failures.push("OCR_PROVIDER_MODEL is required when OCR_PROVIDER=external_env.");
    }
  }

  if (failures.length > 0) {
    console.log("FAIL env validation");
    console.log(`appMode=${appMode}`);
    console.log(`storeDriver=${storeDriver}`);
    console.log(`ocrProvider=${ocrProvider}`);
    console.log(`authMode=${authMode}`);
    for (const failure of failures) {
      console.log(` - ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("PASS env validation");
  console.log(`appMode=${appMode}`);
  console.log(`storeDriver=${storeDriver}`);
  console.log(`ocrProvider=${ocrProvider}`);
  console.log(`authMode=${authMode}`);
  if (warnings.length === 0) {
    console.log("warnings=none");
    return;
  }

  console.log("warnings:");
  for (const warning of warnings) {
    console.log(` - ${warning}`);
  }
}

main();
