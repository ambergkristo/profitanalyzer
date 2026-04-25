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

  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full border border-white/10 bg-black/25">
        <div
          className="bg-profit"
          style={{ width: `${(profitableCount / total) * 100}%` }}
        />
        <div
          className="bg-warning"
          style={{ width: `${(warningCount / total) * 100}%` }}
        />
        <div
          className="bg-danger"
          style={{ width: `${(lossCount / total) * 100}%` }}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs uppercase tracking-[0.16em] text-muted">
        <span>{profitableCount} profitable</span>
        <span>{warningCount} warning</span>
        <span>{lossCount} loss</span>
      </div>
    </div>
  );
}
