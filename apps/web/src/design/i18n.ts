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
    reviewRequired: "Review required",
    reviewBeforeCostsUpdate: "Review required before costs update",
    theme: "Theme",
    language: "Language",
    workspace: "Workspace",
    recipeBuilder: "Recipe builder",
    ingredientCosts: "Ingredient costs",
    invoiceCostIntake: "Invoice cost intake",
    supplierCostPressure: "Supplier cost pressure",
    workspaceAccess: "Workspace access"
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
    reviewRequired: "Vajab ülevaatamist",
    reviewBeforeCostsUpdate: "Kulud muutuvad alles pärast ülevaatamist",
    theme: "Teema",
    language: "Keel",
    workspace: "Tööala",
    recipeBuilder: "Retseptikoostaja",
    ingredientCosts: "Koostisosade kulud",
    invoiceCostIntake: "Arvete kulusisestus",
    supplierCostPressure: "Tarnijakulude surve",
    workspaceAccess: "Tööala ligipääs"
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
