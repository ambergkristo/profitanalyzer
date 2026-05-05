import { useEffect, useState } from "react";

import { applyTheme, persistTheme, readStoredTheme, type ThemeMode } from "../design/theme.js";

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>(() => readStoredTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    persistTheme(nextTheme);
  }

  return (
    <button
      aria-label="Toggle theme"
      className="rounded-full border border-border bg-panel px-3 py-2 text-xs font-semibold text-text transition hover:border-accent/50"
      onClick={toggleTheme}
      type="button"
    >
      {theme === "dark" ? "Dark" : "Light"}
    </button>
  );
}
