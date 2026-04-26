interface MenuHealthBarProps {
  profitableCount: number;
  warningCount: number;
  lossCount: number;
}

export function MenuHealthBar({
  profitableCount,
  warningCount,
  lossCount
}: MenuHealthBarProps) {
  const total = Math.max(1, profitableCount + warningCount + lossCount);
  const profitablePercent = (profitableCount / total) * 100;
  const warningPercent = (warningCount / total) * 100;
  const lossPercent = (lossCount / total) * 100;

  return (
    <div>
      <div className="flex h-4 overflow-hidden rounded-full border border-white/10 bg-black/25">
        <div className="bg-profit" style={{ width: `${profitablePercent}%` }} />
        <div className="bg-warning" style={{ width: `${warningPercent}%` }} />
        <div className="bg-danger" style={{ width: `${lossPercent}%` }} />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Metric label="Profitable" value={profitableCount} percent={profitablePercent} tone="text-profit" />
        <Metric label="Warning" value={warningCount} percent={warningPercent} tone="text-warning" />
        <Metric label="Loss" value={lossCount} percent={lossPercent} tone="text-danger" />
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  percent,
  tone
}: {
  label: string;
  value: number;
  percent: number;
  tone: string;
}) {
  return (
    <div className="rounded-tile border border-white/8 bg-white/[0.02] px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-4">
        <p className={`font-display text-2xl ${tone}`}>{value}</p>
        <p className="text-xs uppercase tracking-[0.16em] text-muted">{percent.toFixed(0)}%</p>
      </div>
    </div>
  );
}
