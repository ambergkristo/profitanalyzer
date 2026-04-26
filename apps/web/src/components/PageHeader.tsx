import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  badges?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions, badges }: PageHeaderProps) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr] xl:items-end">
      <div>
        <p className="text-[11px] uppercase tracking-[0.26em] text-accent">{eyebrow}</p>
        <h1 className="mt-4 font-display text-[2.6rem] leading-[0.95] text-text md:text-[3.6rem]">
          {title}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-muted">{description}</p>
      </div>
      <div className="flex flex-col gap-4 xl:items-end">
        {badges ? <div className="flex flex-wrap gap-2 xl:justify-end">{badges}</div> : null}
        {actions ? <div className="w-full xl:max-w-[28rem]">{actions}</div> : null}
      </div>
    </div>
  );
}
