interface KpiCardProps {
  label: string;
  value: string;
  tone?: "default" | "profit" | "warning" | "danger";
}

const toneMap = {
  default: "text-text",
  profit: "text-profit",
  warning: "text-warning",
  danger: "text-danger"
} as const;

export function KpiCard({ label, value, tone = "default" }: KpiCardProps) {
  return (
    <div className="rounded-[1.75rem] border border-border bg-panel p-5 shadow-telemetry">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">{label}</p>
      <p className={`mt-3 font-display text-4xl font-semibold ${toneMap[tone]}`}>{value}</p>
      <div className="mt-4 h-px w-full bg-gradient-to-r from-white/10 to-transparent" />
    </div>
  );
}
