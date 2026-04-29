import type { AppStore } from "./types.js";
import { createMemoryStore } from "./memoryStore.js";
import { createFileStore } from "./fileStore.js";
import { getAppMode, getAppVersion } from "../config.js";
import { getDataDir, getStoreDriver, resolveDataDir } from "./persistence.js";

export interface CreateStoreOptions {
  env?: NodeJS.ProcessEnv;
}

export function createStore(options: CreateStoreOptions = {}): AppStore {
  const environment = options.env ?? process.env;
  const appMode = getAppMode(environment);
  const driver = getStoreDriver(environment);

  if (driver === "file") {
    return createFileStore({
      appMode,
      dataDir: resolveDataDir({
        ...environment,
        DATA_DIR: getDataDir(environment)
      }),
      exportedFromAppVersion: getAppVersion(environment)
    });
  }

  return createMemoryStore({
    appMode,
    exportedFromAppVersion: getAppVersion(environment)
  });
}
