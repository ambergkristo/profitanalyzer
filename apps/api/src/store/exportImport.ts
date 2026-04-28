import type { DatasetExportPayload } from "./types.js";

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isArrayOfObjects(value: unknown) {
  return Array.isArray(value) && value.every((item) => isObjectRecord(item));
}

export function isValidDatasetImportPayload(payload: unknown): payload is DatasetExportPayload {
  if (!isObjectRecord(payload)) {
    return false;
  }

  return (
    isObjectRecord(payload.dataset) &&
    isObjectRecord(payload.dataset.data) &&
    isArrayOfObjects(payload.ingredients) &&
    isArrayOfObjects(payload.recipes) &&
    isArrayOfObjects(payload.dishes) &&
    isArrayOfObjects(payload.suppliers) &&
    isArrayOfObjects(payload.supplierProductMatches) &&
    isArrayOfObjects(payload.costHistory) &&
    isArrayOfObjects(payload.alerts) &&
    isArrayOfObjects(payload.invoices) &&
    isArrayOfObjects(payload.ocrJobs)
  );
}

export function sanitizeImportedPayload(payload: DatasetExportPayload, targetDatasetId?: string): DatasetExportPayload {
  return {
    ...payload,
    dataset: {
      ...payload.dataset,
      id: targetDatasetId ?? payload.dataset.id,
      data: {
        ingredients: payload.ingredients.map((ingredient) => ({ ...ingredient })),
        recipes: payload.recipes.map((recipe) => ({
          ...recipe,
          ingredients: recipe.ingredients.map((ingredient) => ({ ...ingredient }))
        })),
        dishes: payload.dishes.map((dish) => ({ ...dish }))
      }
    },
    ingredients: payload.ingredients.map((ingredient) => ({ ...ingredient })),
    recipes: payload.recipes.map((recipe) => ({
      ...recipe,
      ingredients: recipe.ingredients.map((ingredient) => ({ ...ingredient }))
    })),
    dishes: payload.dishes.map((dish) => ({ ...dish })),
    suppliers: payload.suppliers.map((supplier) => ({ ...supplier })),
    supplierProductMatches: payload.supplierProductMatches.map((match) => ({ ...match })),
    costHistory: payload.costHistory.map((entry) => ({ ...entry })),
    alerts: payload.alerts.map((alert) => ({ ...alert })),
    invoices: payload.invoices.map((invoice) => ({
      ...invoice,
      invoice: { ...invoice.invoice },
      lines: invoice.lines.map((line) => ({ ...line })),
      supplierSuggestion: { ...invoice.supplierSuggestion },
      summary: { ...invoice.summary },
      confirmationSummary: invoice.confirmationSummary
        ? {
            ...invoice.confirmationSummary,
            topAffectedDishes: invoice.confirmationSummary.topAffectedDishes.map((dish) => ({
              ...dish
            }))
          }
        : undefined,
      affectedDishes: invoice.affectedDishes?.map((dish) => ({ ...dish })),
      alerts: invoice.alerts?.map((alert) => ({ ...alert })),
      ocrJob: invoice.ocrJob ? { ...invoice.ocrJob } : undefined,
      ocrResult: invoice.ocrResult
        ? {
            ...invoice.ocrResult,
            warnings: [...invoice.ocrResult.warnings],
            lines: invoice.ocrResult.lines.map((line) => ({
              ...line,
              warnings: [...line.warnings]
            }))
          }
        : undefined,
      qualityReport: invoice.qualityReport
        ? {
            ...invoice.qualityReport,
            warnings: [...invoice.qualityReport.warnings]
          }
        : undefined
    })),
    ocrJobs: payload.ocrJobs.map((job) => ({
      ...job,
      qualityReport: job.qualityReport
        ? {
            ...job.qualityReport,
            warnings: [...job.qualityReport.warnings]
          }
        : undefined
    }))
  };
}
