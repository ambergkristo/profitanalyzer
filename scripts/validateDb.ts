import { getAppMode, getAppVersion } from "../apps/api/src/config.js";
import { createDatabaseStore } from "../apps/api/src/store/databaseStore.js";

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    console.log("SKIPPED_DATABASE_VALIDATION");
    console.log("DATABASE_URL is not configured.");
    process.exitCode = 0;
    return;
  }

  const store = createDatabaseStore({
    appMode: getAppMode(process.env),
    connectionString: databaseUrl,
    exportedFromAppVersion: getAppVersion(process.env)
  });

  await store.initialize();

  const storage = store.getStorageInfo();
  const datasets = store.listDatasets();
  const mixedOverview = store.getOverview("mixed-restaurant");
  const mixedContext = store.getStoreContext("mixed-restaurant");
  const highMarginContext = store.getStoreContext("high-margin-bistro");

  if (!storage.databaseConfigured || !storage.readable || !storage.writable) {
    throw new Error("Database store did not report healthy connectivity.");
  }

  if (!mixedOverview) {
    throw new Error("Database store could not calculate analytics for mixed-restaurant.");
  }

  if (!mixedContext || !highMarginContext) {
    throw new Error("Database store did not resolve workspace context.");
  }

  if (
    mixedContext.workspaceId === highMarginContext.workspaceId &&
    mixedContext.restaurantId !== highMarginContext.restaurantId
  ) {
    throw new Error("Workspace isolation check failed: distinct restaurant datasets share one workspace.");
  }

  const exported = store.exportDataset("mixed-restaurant");

  if (!exported || exported.datasetId !== "mixed-restaurant") {
    throw new Error("Database export did not return the scoped dataset.");
  }

  console.log("PASS db validation");
  console.log(`datasets=${datasets.length}`);
  console.log(`storageDriver=${storage.driver}`);
  console.log(`workspace=${mixedContext.workspaceId}`);
  console.log(`restaurant=${mixedContext.restaurantId}`);
  console.log(`topActions=${mixedOverview.topActions.length}`);
}

main().catch((error) => {
  console.log("FAIL db validation");
  console.log(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
