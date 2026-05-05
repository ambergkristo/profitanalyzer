export type ThemeMode = "dark" | "light";

const storageKey = "profit-analyzer-theme";

export function readStoredTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "dark";
  }

  return window.localStorage.getItem(storageKey) === "light" ? "light" : "dark";
}

export function applyTheme(theme: ThemeMode) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.theme = theme;
}

export function persistTheme(theme: ThemeMode) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(storageKey, theme);
  }
  applyTheme(theme);
}
