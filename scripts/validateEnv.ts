import fs from "node:fs";
import path from "node:path";

import { getAuthMode } from "../apps/api/src/auth/service.js";
import { validateEnvironmentProfile } from "../apps/api/src/runtime/profile.js";

function main() {
  const result = validateEnvironmentProfile({
    environment: process.env,
    authMode: getAuthMode(process.env)
  });

  if (!result.ok) {
    console.log("FAIL env validation");
    console.log(`appMode=${result.profile.appMode}`);
    console.log(`storeDriver=${result.profile.storeDriver}`);
    console.log(`uploadStorageDriver=${result.profile.uploadStorageDriver}`);
    console.log(`ocrProvider=${result.profile.ocrProvider}`);
    console.log(`billingProvider=${result.profile.billingProvider}`);
    console.log(`authMode=${result.profile.authMode}`);
    console.log("production readiness blockers:");
    for (const blocker of result.blockers) {
      console.log(` - ${blocker}`);
    }
    process.exitCode = 1;
    return;
  }

  if (result.profile.uploadStorageDriver === "local_file") {
    const uploadDir = path.resolve(process.env.UPLOAD_DATA_DIR?.trim() || ".uploads");
    try {
      fs.mkdirSync(uploadDir, { recursive: true });
      fs.accessSync(uploadDir, fs.constants.W_OK);
    } catch {
      console.log("FAIL env validation");
      console.log(`uploadDataDir=${uploadDir}`);
      console.log("production readiness blockers:");
      console.log(" - UPLOAD_DATA_DIR must be writable when UPLOAD_STORAGE_DRIVER=local_file.");
      process.exitCode = 1;
      return;
    }
  }

  console.log("PASS env validation");
  console.log(`appMode=${result.profile.appMode}`);
  console.log(`storeDriver=${result.profile.storeDriver}`);
  console.log(`uploadStorageDriver=${result.profile.uploadStorageDriver}`);
  console.log(`uploadMaxFileSizeBytes=${result.profile.uploadMaxFileSizeBytes}`);
  console.log(`ocrProvider=${result.profile.ocrProvider}`);
  console.log(`billingProvider=${result.profile.billingProvider}`);
  console.log(`billingProviderConfigured=${result.profile.billingProviderConfigured}`);
  console.log(`authMode=${result.profile.authMode}`);
  console.log(
    result.warnings.length === 0
      ? "warnings=none"
      : `warnings=${result.warnings.length}`
  );
  console.log(
    result.blockers.length === 0
      ? "productionReadinessBlockers=none"
      : `productionReadinessBlockers=${result.blockers.length}`
  );

  if (result.warnings.length > 0) {
    for (const warning of result.warnings) {
      console.log(` - ${warning}`);
    }
  }
}

main();
