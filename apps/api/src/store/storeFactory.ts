import type { AppStore } from "./types.js";
import { createMemoryStore } from "./memoryStore.js";

export function createStore(): AppStore {
  return createMemoryStore();
}
