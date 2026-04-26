import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type ActionButtonVariant = "primary" | "secondary" | "ghost" | "profit";

interface ActionButtonProps
  extends PropsWithChildren,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  variant?: ActionButtonVariant;
}

const variantClass: Record<ActionButtonVariant, string> = {
  primary: "bg-accent text-bg hover:opacity-90",
  secondary: "border border-border bg-black/20 text-text hover:border-accent/40 hover:text-accent",
  ghost: "border border-white/10 bg-white/[0.03] text-muted hover:text-text",
  profit: "border border-profit/35 bg-profit/10 text-profit hover:border-profit/60"
};

export function ActionButton({
  children,
  disabled,
  onClick,
  type = "button",
  variant = "secondary",
  ...props
}: ActionButtonProps) {
  return (
    <button
      className={`rounded-full px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${variantClass[variant]}`}
      disabled={disabled}
      onClick={onClick}
      {...props}
      type={type}
    >
      {children}
    </button>
  );
}
