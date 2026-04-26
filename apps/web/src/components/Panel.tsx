import type { PropsWithChildren } from "react";

type PanelTone = "default" | "elevated" | "subtle" | "profit" | "warning" | "danger";

interface PanelProps extends PropsWithChildren {
  className?: string;
  tone?: PanelTone;
}

const panelToneClass: Record<PanelTone, string> = {
  default: "border-border bg-panel",
  elevated: "border-white/10 bg-[color:var(--surface-2)]",
  subtle: "border-white/8 bg-black/20",
  profit: "border-profit/20 bg-profit/[0.06]",
  warning: "border-warning/25 bg-warning/[0.08]",
  danger: "border-danger/25 bg-danger/[0.08]"
};

export function Panel({ children, className = "", tone = "default" }: PanelProps) {
  return (
    <section
      className={`rounded-panel border p-6 shadow-telemetry ${panelToneClass[tone]} ${className}`.trim()}
    >
      {children}
    </section>
  );
}
