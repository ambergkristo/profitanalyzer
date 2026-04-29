import path from "node:path";

import type { PersistenceType } from "./types.js";

export function getStoreDriver(environment: NodeJS.ProcessEnv = process.env): PersistenceType {
  if (environment.STORE_DRIVER === "database") {
    return "database";
  }

  return environment.STORE_DRIVER === "file" ? "file" : "memory";
}

export function getDataDir(environment: NodeJS.ProcessEnv = process.env): string {
  return environment.DATA_DIR?.trim() || ".data";
}

export function resolveDataDir(environment: NodeJS.ProcessEnv = process.env): string {
  return path.resolve(process.cwd(), getDataDir(environment));
}

export function getDatabaseUrl(environment: NodeJS.ProcessEnv = process.env): string | undefined {
  const databaseUrl = environment.DATABASE_URL?.trim();
  return databaseUrl ? databaseUrl : undefined;
}
