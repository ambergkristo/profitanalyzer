import type { DishStatus } from "../../../../packages/core/src/index.js";

export function formatEuro(cents: number): string {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2
  }).format(cents / 100);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function getStatusLabel(status: DishStatus): string {
  switch (status) {
    case "loss":
      return "Loss";
    case "warning":
      return "Warning";
    case "profitable":
      return "Profitable";
  }
}
