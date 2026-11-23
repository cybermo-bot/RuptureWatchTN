import { useId, type InputHTMLAttributes, type ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  /** Icon drawn inside the field, at the start (a search glass). Decorative. */
  icon?: ReactNode;
  /** Large: the search field of the app screens. */
  large?: boolean;
}

// Always labelled. Font size 16 px or more so mobile browsers do not zoom on focus.
export function Input({ label, hint, id, icon, large = false, className = '', ...rest }: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        {icon ? (
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3.5 text-ink-muted">
            {icon}
          </span>
        ) : null}
        <input
          id={inputId}
          aria-describedby={hintId}
          className={`w-full rounded-md border border-ink-muted bg-surface text-ink placeholder:text-ink-muted focus:border-brand ${
            large ? 'min-h-14 text-[1.0625rem]' : 'min-h-12 text-base'
          } ${icon ? 'ps-11 pe-3.5' : 'px-3.5'} ${className}`}
          {...rest}
        />
      </div>
      {hint ? (
        <p id={hintId} className="text-sm text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
