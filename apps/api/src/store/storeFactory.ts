import type { AppStore } from "./types.js";
import { createMemoryStore } from "./memoryStore.js";
import { createFileStore } from "./fileStore.js";
import { createDatabaseStore } from "./databaseStore.js";
import { getAppMode, getAppVersion } from "../config.js";
import { getDataDir, getDatabaseUrl, getStoreDriver, resolveDataDir } from "./persistence.js";

export interface CreateStoreOptions {
  env?: NodeJS.ProcessEnv;
}

export function createStore(options: CreateStoreOptions = {}): AppStore {
  const environment = options.env ?? process.env;
  const appMode = getAppMode(environment);
  const driver = getStoreDriver(environment);
  const exportedFromAppVersion = getAppVersion(environment);

  if (driver === "file") {
    return createFileStore({
      appMode,
      dataDir: resolveDataDir({
        ...environment,
        DATA_DIR: getDataDir(environment)
      }),
      exportedFromAppVersion
    });
  }

  if (driver === "database") {
    return createDatabaseStore({
      appMode,
      connectionString: getDatabaseUrl(environment),
      exportedFromAppVersion
    });
  }

  return createMemoryStore({
    appMode,
    exportedFromAppVersion
  });
}
