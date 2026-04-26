import type { ReactNode } from "react";

interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
  aside?: ReactNode;
}

export function SectionHeader({ eyebrow, title, description, aside }: SectionHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        <p className="text-[11px] uppercase tracking-[0.24em] text-muted">{eyebrow}</p>
        <h2 className="mt-3 font-display text-3xl leading-none text-text md:text-[2rem]">{title}</h2>
        {description ? <p className="mt-3 text-sm leading-6 text-muted">{description}</p> : null}
      </div>
      {aside ? <div className="shrink-0">{aside}</div> : null}
    </div>
  );
}
