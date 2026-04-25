interface StatePanelProps {
  title: string;
  message: string;
}

export function StatePanel({ title, message }: StatePanelProps) {
  return (
    <div className="rounded-[2rem] border border-border bg-panel p-8 shadow-telemetry">
      <h2 className="font-display text-3xl text-text">{title}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{message}</p>
    </div>
  );
}
