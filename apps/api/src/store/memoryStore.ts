import { createDataStore } from "../data.js";
import type { AppMode, AppStore } from "./types.js";
import { createPilotWorkspaceDefinition } from "./seedStore.js";

export interface CreateMemoryStoreOptions {
  appMode?: AppMode;
}

export function createMemoryStore(options: CreateMemoryStoreOptions = {}): AppStore {
  const extraDatasets =
    options.appMode === "pilot" ? [createPilotWorkspaceDefinition()] : [];

  return createDataStore({
    extraDatasets
  });
}
