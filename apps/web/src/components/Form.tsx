import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  PropsWithChildren,
  SelectHTMLAttributes,
  TextareaHTMLAttributes
} from "react";

const inputClass =
  "mt-2 w-full rounded-tile border border-border bg-elevated px-4 py-3 text-text outline-none transition placeholder:text-muted/65 focus:border-accent/60 focus:ring-2 focus:ring-accent/15";

interface FieldLabelProps extends PropsWithChildren, LabelHTMLAttributes<HTMLLabelElement> {
  label: string;
  hint?: string;
}

export function FieldLabel({ children, className = "", hint, label, ...props }: FieldLabelProps) {
  return (
    <label className={`block text-sm text-muted ${className}`.trim()} {...props}>
      <span className="font-medium text-muted">{label}</span>
      {hint ? <span className="mt-1 block text-xs leading-5 text-muted/80">{hint}</span> : null}
      {children}
    </label>
  );
}

export function TextInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${inputClass} ${className}`.trim()} {...props} />;
}

export function NumberInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${inputClass} ${className}`.trim()} type="number" {...props} />;
}

export function SelectInput({ children, className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${inputClass} ${className}`.trim()} {...props}>
      {children}
    </select>
  );
}

export function TextArea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${inputClass} min-h-28 resize-y ${className}`.trim()} {...props} />;
}

export function FieldError({ children }: PropsWithChildren) {
  return children ? <p className="mt-2 text-sm leading-5 text-danger">{children}</p> : null;
}

export function FormRow({ children, className = "" }: PropsWithChildren<{ className?: string }>) {
  return <div className={`grid gap-3 md:grid-cols-2 ${className}`.trim()}>{children}</div>;
}

export function FormSection({ children, className = "" }: PropsWithChildren<{ className?: string }>) {
  return <section className={`rounded-panel border border-border bg-panel p-5 ${className}`.trim()}>{children}</section>;
}
