interface ReasonCodeBadgeProps {
  reasonCode: string;
}

const reasonCodeTone: Record<string, string> = {
  SUPPLIER_PRICE_INCREASE: "border-danger/30 bg-danger/10 text-danger",
  INVOICE_COST_SPIKE: "border-warning/30 bg-warning/10 text-warning",
  INGREDIENT_PRICE_CHANGE: "border-accent/30 bg-accent/10 text-accent",
  DISH_MARGIN_AT_RISK: "border-warning/30 bg-warning/10 text-warning",
  COST_HISTORY_UPDATED: "border-profit/25 bg-profit/10 text-profit"
};

export function ReasonCodeBadge({ reasonCode }: ReasonCodeBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] ${
        reasonCodeTone[reasonCode] ?? "border-white/10 bg-black/25 text-muted"
      }`}
    >
      {reasonCode.replaceAll("_", " ")}
    </span>
  );
}
