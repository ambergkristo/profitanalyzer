import { useState } from "react";

import { persistLanguage, readStoredLanguage, type LanguageCode } from "../design/i18n.js";

interface LanguageToggleProps {
  onChange: (language: LanguageCode) => void;
}

export function LanguageToggle({ onChange }: LanguageToggleProps) {
  const [language, setLanguage] = useState<LanguageCode>(() => readStoredLanguage());

  function setNextLanguage(nextLanguage: LanguageCode) {
    setLanguage(nextLanguage);
    persistLanguage(nextLanguage);
    onChange(nextLanguage);
  }

  return (
    <div aria-label="Language selector" className="flex rounded-full border border-border bg-panel p-1">
      {(["en", "et"] as const).map((candidate) => (
        <button
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
            language === candidate ? "bg-accent text-bg" : "text-muted hover:text-text"
          }`}
          key={candidate}
          onClick={() => setNextLanguage(candidate)}
          type="button"
        >
          {candidate.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
