import type { PropsWithChildren } from "react";

type PanelTone = "default" | "elevated" | "subtle" | "profit" | "warning" | "danger";

interface PanelProps extends PropsWithChildren {
  className?: string;
  tone?: PanelTone;
}

const panelToneClass: Record<PanelTone, string> = {
  default: "border-border bg-panel",
  elevated: "border-border bg-elevated",
  subtle: "border-border bg-elevated/70",
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
