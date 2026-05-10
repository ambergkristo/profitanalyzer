import { PrismaClient } from "@prisma/client";

import { createDataStore } from "../data.js";
import {
  buildDatabaseStorageInfo,
  buildStoreContext,
  loadDatabaseDatasets,
  persistDatasetPayload,
  seedDatabaseDatasetsIfEmpty
} from "./databasePersistence.js";
import type {
  AppMode,
  AppStore,
  DatasetExportPayload,
  StorageInfo
} from "./types.js";

export class DatabaseStoreConfigurationError extends Error {
  constructor(message = "STORE_DRIVER=database requires DATABASE_URL.") {
    super(message);
    this.name = "DatabaseStoreConfigurationError";
  }
}

export class DatabaseStoreInitializationError extends Error {
  constructor(message = "Database store is still initializing.") {
    super(message);
    this.name = "DatabaseStoreInitializationError";
  }
}

export interface CreateDatabaseStoreOptions {
  appMode: AppMode;
  connectionString?: string;
  exportedFromAppVersion?: string;
}

function createBaseStore(options: CreateDatabaseStoreOptions) {
  return createDataStore({
    extraDatasets: [],
    includeDemoDatasets: false,
    exportedFromAppVersion: options.exportedFromAppVersion
  });
}

export function createDatabaseStore(options: CreateDatabaseStoreOptions): AppStore {
  const baseStore = createBaseStore(options);
  const prisma = options.connectionString
    ? new PrismaClient({
        datasources: {
          db: {
            url: options.connectionString
          }
        }
      })
    : null;
  const exportedFromAppVersion = options.exportedFromAppVersion ?? "0.1.0";
  const baselinePayloads = new Map<string, DatasetExportPayload>();
  let storageInfo: StorageInfo = buildDatabaseStorageInfo(
    Boolean(prisma),
    false,
    prisma
      ? "Database storage is configured and awaiting initialization."
      : "STORE_DRIVER=database requires DATABASE_URL."
  );
  let initialized = false;
  let initializationError: Error | null = null;
  let initializationPromise: Promise<void> | null = null;

  function assertOperational() {
    if (!prisma) {
      throw new DatabaseStoreConfigurationError();
    }

    if (initializationError) {
      throw initializationError;
    }

    if (!initialized) {
      throw new DatabaseStoreInitializationError();
    }
  }

  async function persistCurrentDataset(datasetId: string) {
    if (!prisma) {
      throw new DatabaseStoreConfigurationError();
    }

    assertOperational();
    const payload = baseStore.exportDataset(datasetId);

    if (!payload) {
      return false;
    }

    const baseline = baselinePayloads.get(datasetId) ?? payload;
    await persistDatasetPayload(prisma, payload, baseline);
    return true;
  }

  async function initialize() {
    if (initializationPromise) {
      return initializationPromise;
    }

    initializationPromise = (async () => {
      if (!prisma) {
        initializationError = new DatabaseStoreConfigurationError();
        storageInfo = buildDatabaseStorageInfo(false, false, initializationError.message);
        throw initializationError;
      }

      try {
        await prisma.$connect();
        await seedDatabaseDatasetsIfEmpty(prisma, {
          appMode: options.appMode,
          exportedFromAppVersion
        });

        const datasets = await loadDatabaseDatasets(prisma, exportedFromAppVersion);
        for (const dataset of datasets) {
          baseStore.importDataset(dataset.current, dataset.current.dataset.id);
          baselinePayloads.set(dataset.current.dataset.id, dataset.baseline);
        }

        initialized = true;
        initializationError = null;
        storageInfo = buildDatabaseStorageInfo(true, true, "Database storage is active.");
      } catch (error) {
        initializationError =
          error instanceof Error
            ? error
            : new DatabaseStoreInitializationError("Database initialization failed.");
        storageInfo = buildDatabaseStorageInfo(true, false, initializationError.message);
        throw initializationError;
      }
    })();

    return initializationPromise;
  }

  const overrides: Partial<AppStore> = {
    restaurantData: baseStore.restaurantData,
    async initialize() {
      return initialize();
    },
    getStoreContext(datasetId?: string) {
      if (!initialized) {
        return null;
      }

      const resolved = baseStore.getResolvedDataset(datasetId);
      return resolved ? buildStoreContext(resolved.id) : null;
    },
    getStorageType() {
      return "database";
    },
    getStorageInfo() {
      return { ...storageInfo };
    },
    flushDataset(datasetId: string) {
      void persistCurrentDataset(datasetId);
      return true;
    },
    async flushDatasetAsync(datasetId: string) {
      return persistCurrentDataset(datasetId);
    },
    resetDataset(datasetId: string) {
      assertOperational();
      const baseline = baselinePayloads.get(datasetId);
      if (!baseline) {
        return baseStore.resetDataset(datasetId);
      }

      const current = baseStore.exportDataset(datasetId);
      baseStore.importDataset(baseline, datasetId);

      return {
        datasetId,
        clearedInvoices: current?.invoices.length ?? 0,
        clearedCostHistory: current?.costHistory.length ?? 0,
        clearedAlerts: current?.alerts.length ?? 0,
        clearedOcrJobs: current?.ocrJobs.length ?? 0,
        restoredDishCount: baseline.dishes.length
      };
    },
    importDataset(payload, datasetId) {
      assertOperational();
      const targetDatasetId = datasetId ?? payload.dataset.id;
      const result = baseStore.importDataset(payload, targetDatasetId);
      baselinePayloads.set(targetDatasetId, payload);
      return result;
    }
  };

  const proxiedStore: AppStore = new Proxy(baseStore, {
    get(target, property) {
      if (typeof property !== "string") {
        return undefined;
      }

      const key = property as keyof AppStore;

      if (Object.prototype.hasOwnProperty.call(overrides, key)) {
        return overrides[key];
      }

      const value = target[key];
      if (typeof value !== "function") {
        return value;
      }

      const method = value as (this: AppStore, ...methodArgs: unknown[]) => unknown;

      return (...args: unknown[]) => {
        assertOperational();
        return method.apply(target, args);
      };
    }
  });

  return proxiedStore;
}
