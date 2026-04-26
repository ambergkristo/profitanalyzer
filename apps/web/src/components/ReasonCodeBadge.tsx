interface ReasonCodeBadgeProps {
  reasonCode: string;
}

export function ReasonCodeBadge({ reasonCode }: ReasonCodeBadgeProps) {
  return (
    <span className="inline-flex rounded-full border border-white/10 bg-black/25 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
      {reasonCode.replaceAll("_", " ")}
    </span>
  );
}
