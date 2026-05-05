export type LanguageCode = "en" | "et";

const storageKey = "profit-analyzer-language";

export const translations = {
  en: {
    overview: "Overview",
    menu: "Menu",
    recipes: "Recipes",
    ingredients: "Ingredients",
    invoices: "Invoices",
    alerts: "Alerts",
    onboarding: "Onboarding",
    billing: "Billing",
    settings: "Settings",
    newInvoice: "New invoice",
    export: "Export",
    confirm: "Confirm",
    reviewRequired: "Review required"
  },
  et: {
    overview: "Ülevaade",
    menu: "Menüü",
    recipes: "Retseptid",
    ingredients: "Koostisosad",
    invoices: "Arved",
    alerts: "Hoiatused",
    onboarding: "Seadistus",
    billing: "Litsents",
    settings: "Seaded",
    newInvoice: "Uus arve",
    export: "Ekspordi",
    confirm: "Kinnita",
    reviewRequired: "Vajab ülevaatamist"
  }
} as const;

export function readStoredLanguage(): LanguageCode {
  if (typeof window === "undefined") {
    return "en";
  }

  return window.localStorage.getItem(storageKey) === "et" ? "et" : "en";
}

export function persistLanguage(language: LanguageCode) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(storageKey, language);
  }
}
