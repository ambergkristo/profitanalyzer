interface MetricStripItem {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "profit" | "warning" | "danger";
}

interface MetricStripProps {
  items: MetricStripItem[];
}

const toneClass: Record<NonNullable<MetricStripItem["tone"]>, string> = {
  default: "border-white/8 bg-white/[0.02]",
  profit: "border-profit/25 bg-profit/[0.08]",
  warning: "border-warning/25 bg-warning/[0.08]",
  danger: "border-danger/25 bg-danger/[0.08]"
};

export function MetricStrip({ items }: MetricStripProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className={`rounded-tile border p-4 ${toneClass[item.tone ?? "default"]}`}
        >
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">{item.label}</p>
          <p className="mt-3 font-display text-3xl text-text">{item.value}</p>
          {item.hint ? <p className="mt-3 text-sm leading-6 text-muted">{item.hint}</p> : null}
        </div>
      ))}
    </div>
  );
}
