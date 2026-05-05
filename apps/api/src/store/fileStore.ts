import fs from "node:fs";
import path from "node:path";

import { createMemoryStore } from "./memoryStore.js";
import { type AppMode, type AppStore, type DatasetExportPayload, type StorageInfo } from "./types.js";
import { hasDatasetImportShape, sanitizeImportedPayload } from "./exportImport.js";

interface FileStoreOptions {
  appMode: AppMode;
  dataDir: string;
  exportedFromAppVersion?: string;
}

interface StoreMetadata {
  version: 1;
  datasetIds: string[];
}

const metadataFileName = "metadata.json";

function ensureDirectory(dirPath: string) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJsonFile(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
}

function writeJsonFileAtomic(filePath: string, value: unknown) {
  const directory = path.dirname(filePath);
  ensureDirectory(directory);
  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(tempPath, filePath);
}

function datasetFilePath(baseDir: string, datasetId: string) {
  return path.join(baseDir, "datasets", `${datasetId}.json`);
}

function baselineFilePath(baseDir: string, datasetId: string) {
  return path.join(baseDir, "baselines", `${datasetId}.json`);
}

function metadataFilePath(baseDir: string) {
  return path.join(baseDir, metadataFileName);
}

function listJsonDatasetIds(directory: string) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name.replace(/\.json$/u, ""))
    .sort((left, right) => left.localeCompare(right));
}

function loadDatasetPayload(filePath: string): DatasetExportPayload {
  const raw = readJsonFile(filePath);

  if (!hasDatasetImportShape(raw)) {
    throw new Error(`Invalid dataset payload in ${path.basename(filePath)}.`);
  }

  return sanitizeImportedPayload(raw);
}

function buildMetadata(datasetIds: string[]): StoreMetadata {
  return {
    version: 1,
    datasetIds: [...datasetIds].sort((left, right) => left.localeCompare(right))
  };
}

export function createFileStore(options: FileStoreOptions): AppStore {
  const baseStore = createMemoryStore({
    appMode: options.appMode,
    exportedFromAppVersion: options.exportedFromAppVersion
  });
  const datasetIds = new Set(baseStore.listDatasets().map((dataset) => dataset.id));
  const storageIssues: string[] = [];
  const baseDir = options.dataDir;
  const datasetsDir = path.join(baseDir, "datasets");
  const baselinesDir = path.join(baseDir, "baselines");
  const baselinePayloads = new Map<string, DatasetExportPayload>();
  let initFailed = false;

  function refreshMetadata() {
    writeJsonFileAtomic(metadataFilePath(baseDir), buildMetadata([...datasetIds]));
  }

  function writeDatasetPair(datasetId: string, current: DatasetExportPayload, baseline?: DatasetExportPayload) {
    writeJsonFileAtomic(datasetFilePath(baseDir, datasetId), current);
    writeJsonFileAtomic(baselineFilePath(baseDir, datasetId), baseline ?? current);
    datasetIds.add(datasetId);
    refreshMetadata();
  }

  function persistDatasetFromStore(datasetId: string) {
    if (initFailed) {
      return;
    }

    const payload = baseStore.exportDataset(datasetId);
    if (!payload) {
      return;
    }

    writeDatasetPair(datasetId, payload, baselinePayloads.get(datasetId));
  }

  function resolveDatasetId(datasetId?: string) {
    return datasetId ?? baseStore.getResolvedDataset()?.id;
  }

  try {
    ensureDirectory(baseDir);
    ensureDirectory(datasetsDir);
    ensureDirectory(baselinesDir);

    for (const dataset of baseStore.listDatasets()) {
      const baselinePath = baselineFilePath(baseDir, dataset.id);
      const currentPath = datasetFilePath(baseDir, dataset.id);
      const seededPayload = baseStore.exportDataset(dataset.id);

      if (!seededPayload) {
        continue;
      }

      if (!fs.existsSync(baselinePath)) {
        writeJsonFileAtomic(baselinePath, seededPayload);
      }

      if (!fs.existsSync(currentPath)) {
        writeJsonFileAtomic(currentPath, seededPayload);
      }
    }

    const discoveredDatasetIds = new Set([
      ...datasetIds,
      ...listJsonDatasetIds(datasetsDir),
      ...listJsonDatasetIds(baselinesDir)
    ]);

    for (const datasetId of [...discoveredDatasetIds].sort((left, right) => left.localeCompare(right))) {
      const baselinePath = baselineFilePath(baseDir, datasetId);
      const currentPath = datasetFilePath(baseDir, datasetId);

      const baselinePayload = fs.existsSync(baselinePath)
        ? loadDatasetPayload(baselinePath)
        : fs.existsSync(currentPath)
          ? loadDatasetPayload(currentPath)
          : undefined;

      if (!baselinePayload) {
        continue;
      }

      baselinePayloads.set(datasetId, sanitizeImportedPayload(baselinePayload, datasetId));

      const currentPayload = fs.existsSync(currentPath)
        ? loadDatasetPayload(currentPath)
        : baselinePayload;

      baseStore.importDataset(sanitizeImportedPayload(currentPayload, datasetId), datasetId);
      datasetIds.add(datasetId);
    }

    refreshMetadata();
  } catch (error) {
    initFailed = true;
    storageIssues.push(error instanceof Error ? error.message : "File store initialization failed.");
  }

  function getStorageInfo(): StorageInfo {
    let readable = false;
    let writable = false;

    try {
      fs.accessSync(baseDir, fs.constants.R_OK);
      readable = true;
    } catch {
      readable = false;
    }

    try {
      fs.accessSync(baseDir, fs.constants.W_OK);
      writable = true;
    } catch {
      writable = false;
    }

    return {
      driver: "file",
      dataDir: baseDir,
      dataDirConfigured: baseDir.trim().length > 0,
      readable,
      writable,
      persistenceWarning:
        storageIssues.length > 0
          ? storageIssues.join(" ")
          : writable
            ? "File storage is active for this pilot workspace."
            : "File storage is configured, but the data directory is not writable."
    };
  }

  return {
    ...baseStore,
    getStorageType() {
      return "file";
    },
    getStorageInfo,
    flushDataset(datasetId) {
      const resolvedDatasetId = resolveDatasetId(datasetId);

      if (!resolvedDatasetId || initFailed) {
        return false;
      }

      persistDatasetFromStore(resolvedDatasetId);
      return true;
    },
    flushDatasetAsync(datasetId) {
      return Promise.resolve(this.flushDataset(datasetId));
    },
    parseMockInvoice(sampleInvoiceId, datasetId) {
      const draft = baseStore.parseMockInvoice(sampleInvoiceId, datasetId);
      const resolvedDatasetId = resolveDatasetId(datasetId);
      if (draft && resolvedDatasetId) {
        persistDatasetFromStore(resolvedDatasetId);
      }
      return draft;
    },
    createManualInvoiceDraft(input, datasetId) {
      const draft = baseStore.createManualInvoiceDraft(input, datasetId);
      const resolvedDatasetId = resolveDatasetId(datasetId);
      if (draft && resolvedDatasetId) {
        persistDatasetFromStore(resolvedDatasetId);
      }
      return draft;
    },
    createOcrDraft(input, datasetId) {
      const draft = baseStore.createOcrDraft(input, datasetId);
      const resolvedDatasetId = resolveDatasetId(datasetId);
      if (draft && resolvedDatasetId) {
        persistDatasetFromStore(resolvedDatasetId);
      }
      return draft;
    },
    createFailedOcrJob(input, datasetId) {
      const job = baseStore.createFailedOcrJob(input, datasetId);
      const resolvedDatasetId = resolveDatasetId(datasetId);
      if (job && resolvedDatasetId) {
        persistDatasetFromStore(resolvedDatasetId);
      }
      return job;
    },
    createIngredient(input, datasetId) {
      const ingredient = baseStore.createIngredient(input, datasetId);
      const resolvedDatasetId = resolveDatasetId(datasetId);
      if (ingredient && resolvedDatasetId) {
        persistDatasetFromStore(resolvedDatasetId);
      }
      return ingredient;
    },
    updateIngredient(ingredientId, input, datasetId) {
      const ingredient = baseStore.updateIngredient(ingredientId, input, datasetId);
      const resolvedDatasetId = resolveDatasetId(datasetId);
      if (ingredient && resolvedDatasetId) {
        persistDatasetFromStore(resolvedDatasetId);
      }
      return ingredient;
    },
    createRecipe(input, datasetId) {
      const recipe = baseStore.createRecipe(input, datasetId);
      const resolvedDatasetId = resolveDatasetId(datasetId);
      if (recipe && resolvedDatasetId) {
        persistDatasetFromStore(resolvedDatasetId);
      }
      return recipe;
    },
    updateRecipe(recipeId, input, datasetId) {
      const recipe = baseStore.updateRecipe(recipeId, input, datasetId);
      const resolvedDatasetId = resolveDatasetId(datasetId);
      if (recipe && resolvedDatasetId) {
        persistDatasetFromStore(resolvedDatasetId);
      }
      return recipe;
    },
    createDish(input, datasetId) {
      const dish = baseStore.createDish(input, datasetId);
      const resolvedDatasetId = resolveDatasetId(datasetId);
      if (dish && resolvedDatasetId) {
        persistDatasetFromStore(resolvedDatasetId);
      }
      return dish;
    },
    updateDish(dishId, input, datasetId) {
      const dish = baseStore.updateDish(dishId, input, datasetId);
      const resolvedDatasetId = resolveDatasetId(datasetId);
      if (dish && resolvedDatasetId) {
        persistDatasetFromStore(resolvedDatasetId);
      }
      return dish;
    },
    createSupplier(input, datasetId) {
      const supplier = baseStore.createSupplier(input, datasetId);
      const resolvedDatasetId = resolveDatasetId(datasetId);
      if (supplier && resolvedDatasetId) {
        persistDatasetFromStore(resolvedDatasetId);
      }
      return supplier;
    },
    updateSupplier(supplierId, input, datasetId) {
      const supplier = baseStore.updateSupplier(supplierId, input, datasetId);
      const resolvedDatasetId = resolveDatasetId(datasetId);
      if (supplier && resolvedDatasetId) {
        persistDatasetFromStore(resolvedDatasetId);
      }
      return supplier;
    },
    updateRestaurantProfile(input, datasetId) {
      const profile = baseStore.updateRestaurantProfile(input, datasetId);
      const resolvedDatasetId = resolveDatasetId(datasetId);
      if (profile && resolvedDatasetId) {
        persistDatasetFromStore(resolvedDatasetId);
      }
      return profile;
    },
    updateOnboardingState(input, datasetId) {
      const state = baseStore.updateOnboardingState(input, datasetId);
      const resolvedDatasetId = resolveDatasetId(datasetId);
      if (state && resolvedDatasetId) {
        persistDatasetFromStore(resolvedDatasetId);
      }
      return state;
    },
    completeOnboardingStep(step, datasetId) {
      const state = baseStore.completeOnboardingStep(step, datasetId);
      const resolvedDatasetId = resolveDatasetId(datasetId);
      if (state && resolvedDatasetId) {
        persistDatasetFromStore(resolvedDatasetId);
      }
      return state;
    },
    skipOnboardingStep(step, datasetId) {
      const state = baseStore.skipOnboardingStep(step, datasetId);
      const resolvedDatasetId = resolveDatasetId(datasetId);
      if (state && resolvedDatasetId) {
        persistDatasetFromStore(resolvedDatasetId);
      }
      return state;
    },
    confirmInvoice(invoiceId, datasetId, input) {
      const result = baseStore.confirmInvoice(invoiceId, datasetId, input);
      const resolvedDatasetId = resolveDatasetId(datasetId);
      if (result && resolvedDatasetId) {
        persistDatasetFromStore(resolvedDatasetId);
      }
      return result;
    },
    resetDataset(datasetId) {
      const current = baseStore.exportDataset(datasetId);
      const baseline = baselinePayloads.get(datasetId);

      if (!current || !baseline) {
        return baseStore.resetDataset(datasetId);
      }

      baseStore.importDataset(sanitizeImportedPayload(baseline, datasetId), datasetId);
      persistDatasetFromStore(datasetId);

      return {
        datasetId,
        clearedInvoices: current.invoices.length,
        clearedCostHistory: current.costHistory.length,
        clearedAlerts: current.alerts.length,
        clearedOcrJobs: current.ocrJobs.length,
        restoredDishCount: baseline.dishes.length
      };
    },
    exportDataset(datasetId) {
      return baseStore.exportDataset(datasetId);
    },
    importDataset(payload, datasetId) {
      const targetDatasetId = datasetId ?? payload.dataset.id;
      const sanitized = sanitizeImportedPayload(payload, targetDatasetId);
      const result = baseStore.importDataset(sanitized, targetDatasetId);
      baselinePayloads.set(targetDatasetId, sanitizeImportedPayload(sanitized, targetDatasetId));
      writeDatasetPair(targetDatasetId, sanitized, sanitized);
      return result;
    }
  };
}
