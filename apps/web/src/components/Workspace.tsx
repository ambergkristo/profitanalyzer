import type { PropsWithChildren, ReactNode } from "react";

type WorkspaceTone = "default" | "muted" | "accent" | "success" | "warning" | "danger";

interface WorkspacePageProps extends PropsWithChildren {
  className?: string;
}

interface WorkspaceHeaderProps {
  title: string;
  eyebrow?: string;
  description?: string;
  actions?: ReactNode;
  meta?: ReactNode;
}

interface WorkspaceGridProps extends PropsWithChildren {
  columns?: "main-context" | "balanced" | "three";
  className?: string;
}

interface WorkspacePanelProps extends PropsWithChildren {
  className?: string;
  tone?: WorkspaceTone;
}

interface CompactMetricProps {
  label: string;
  value: ReactNode;
  tone?: WorkspaceTone;
}

const toneClass: Record<WorkspaceTone, string> = {
  default: "border-border bg-panel",
  muted: "border-border bg-elevated",
  accent: "border-accent/30 bg-accent/10",
  success: "border-success/30 bg-success/10",
  warning: "border-warning/30 bg-warning/10",
  danger: "border-danger/30 bg-danger/10"
};

const metricToneClass: Record<WorkspaceTone, string> = {
  default: "text-text",
  muted: "text-muted",
  accent: "text-accent",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger"
};

export function WorkspacePage({ children, className = "" }: WorkspacePageProps) {
  return <div className={`grid h-full min-h-[calc(100vh-7rem)] gap-4 ${className}`.trim()}>{children}</div>;
}

export function WorkspaceHeader({ actions, description, eyebrow, meta, title }: WorkspaceHeaderProps) {
  return (
    <header className="flex flex-col gap-4 rounded-[2rem] border border-border bg-panel px-5 py-4 shadow-telemetry lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">{eyebrow}</p>
        ) : null}
        <h1 className="mt-2 text-3xl font-bold tracking-[-0.05em] text-text md:text-4xl">{title}</h1>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{description}</p> : null}
        {meta ? <div className="mt-3 flex flex-wrap gap-2">{meta}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function WorkspaceToolbar({ children, className = "" }: WorkspacePageProps) {
  return (
    <div className={`flex flex-col gap-3 rounded-[1.5rem] border border-border bg-panel px-4 py-3 shadow-telemetry md:flex-row md:items-center md:justify-between ${className}`.trim()}>
      {children}
    </div>
  );
}

export function WorkspaceGrid({ children, className = "", columns = "main-context" }: WorkspaceGridProps) {
  const columnClass =
    columns === "balanced"
      ? "xl:grid-cols-2"
      : columns === "three"
        ? "xl:grid-cols-[0.9fr_1.1fr_0.9fr]"
        : "xl:grid-cols-[minmax(0,1fr)_24rem]";

  return <div className={`grid min-h-0 gap-4 ${columnClass} ${className}`.trim()}>{children}</div>;
}

export function WorkspaceList({ children, className = "" }: WorkspacePageProps) {
  return <div className={`work-scroll min-h-0 space-y-3 overflow-y-auto pr-1 ${className}`.trim()}>{children}</div>;
}

export function WorkspaceDetailPanel({ children, className = "", tone = "default" }: WorkspacePanelProps) {
  return (
    <aside className={`rounded-[2rem] border p-5 shadow-telemetry ${toneClass[tone]} ${className}`.trim()}>
      {children}
    </aside>
  );
}

export function ContextPanel({ children, className = "", tone = "default" }: WorkspacePanelProps) {
  return (
    <section className={`rounded-[2rem] border p-5 shadow-telemetry ${toneClass[tone]} ${className}`.trim()}>
      {children}
    </section>
  );
}

export function EmptyWorkspaceState({ action, message, title }: { title: string; message: string; action?: ReactNode }) {
  return (
    <div className="rounded-[1.5rem] border border-border bg-elevated p-5">
      <p className="text-lg font-semibold text-text">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted">{message}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function WorkspaceActionBar({ children, className = "" }: WorkspacePageProps) {
  return <div className={`flex flex-wrap items-center gap-2 ${className}`.trim()}>{children}</div>;
}

export function CompactMetric({ label, tone = "default", value }: CompactMetricProps) {
  return (
    <div className="rounded-[1.35rem] border border-border bg-elevated p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className={`mt-2 text-2xl font-bold tracking-[-0.04em] ${metricToneClass[tone]}`}>{value}</p>
    </div>
  );
}

export function MobilePanelStack({ children, className = "" }: WorkspacePageProps) {
  return <div className={`grid gap-4 lg:hidden ${className}`.trim()}>{children}</div>;
}
