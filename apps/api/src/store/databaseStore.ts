import type { AppStore } from "./types.js";

export class DatabaseStoreNotImplementedError extends Error {
  constructor() {
    super(
      "Database store is not implemented yet. Use STORE_DRIVER=memory or STORE_DRIVER=file for the controlled pilot package."
    );
    this.name = "DatabaseStoreNotImplementedError";
  }
}

export interface CreateDatabaseStoreOptions {
  connectionString?: string;
}

export function createDatabaseStore(options: CreateDatabaseStoreOptions = {}): AppStore {
  void options;
  throw new DatabaseStoreNotImplementedError();
}
