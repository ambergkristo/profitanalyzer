import type { DishActionSeverity } from "../types.js";

const styles: Record<DishActionSeverity, string> = {
  critical: "border-danger/40 bg-danger/15 text-danger",
  high: "border-warning/35 bg-warning/12 text-warning",
  medium: "border-accent/35 bg-accent/10 text-accent",
  low: "border-profit/30 bg-profit/10 text-profit"
};

interface SeverityBadgeProps {
  severity: DishActionSeverity;
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${styles[severity]}`}>
      {severity}
    </span>
  );
}
