import { Link } from "react-router-dom";

import { Panel } from "./Panel.js";

interface StatePanelAction {
  href: string;
  label: string;
}

interface StatePanelProps {
  title: string;
  message: string;
  tone?: "default" | "loading" | "empty" | "error";
  actions?: StatePanelAction[];
}

const toneClass = {
  default: "border-border",
  loading: "border-accent/20",
  empty: "border-warning/20",
  error: "border-danger/25"
} as const;

export function StatePanel({ title, message, tone = "default", actions }: StatePanelProps) {
  return (
    <Panel className={`p-8 ${toneClass[tone]}`}>
      <p className="text-[11px] uppercase tracking-[0.24em] text-muted">
        {tone === "loading" ? "Loading state" : tone === "empty" ? "Empty state" : tone === "error" ? "Error state" : "State"}
      </p>
      <h2 className="mt-4 font-display text-3xl text-text">{title}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{message}</p>
      {actions?.length ? (
        <div className="mt-6 flex flex-wrap gap-3">
          {actions.map((action) => (
            <Link
              key={action.href}
              className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-text transition hover:border-accent/40 hover:text-accent"
              to={action.href}
            >
              {action.label}
            </Link>
          ))}
        </div>
      ) : null}
    </Panel>
  );
}
