interface KpiCardProps {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "profit" | "warning" | "danger";
}

const toneMap = {
  default: "text-text",
  profit: "text-profit",
  warning: "text-warning",
  danger: "text-danger"
} as const;

export function KpiCard({ label, value, hint, tone = "default" }: KpiCardProps) {
  return (
    <div className="rounded-tile border border-border bg-panel p-5 shadow-telemetry">
      <p className="text-[11px] uppercase tracking-[0.22em] text-muted">{label}</p>
      <p className={`mt-3 font-display text-4xl font-semibold leading-none ${toneMap[tone]}`}>{value}</p>
      {hint ? <p className="mt-3 text-sm leading-6 text-muted">{hint}</p> : null}
      <div className="mt-4 h-px w-full bg-gradient-to-r from-white/10 to-transparent" />
    </div>
  );
}
