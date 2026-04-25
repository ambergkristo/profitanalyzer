import type { DishStatus } from "../../../../packages/core/src/index.js";
import { getStatusLabel } from "../utils/format.js";

const styles: Record<DishStatus, string> = {
  profitable: "border-profit/30 bg-profit/10 text-profit",
  warning: "border-warning/30 bg-warning/10 text-warning",
  loss: "border-danger/30 bg-danger/10 text-danger"
};

interface StatusTagProps {
  status: DishStatus;
}

export function StatusTag({ status }: StatusTagProps) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${styles[status]}`}>
      {getStatusLabel(status)}
    </span>
  );
}
