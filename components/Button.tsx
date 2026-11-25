import Link from 'next/link';
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'quiet' | 'stage';

const BASE =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-5 text-base font-medium no-underline transition-colors disabled:cursor-not-allowed disabled:opacity-60';

const VARIANT: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-strong hover:text-white',
  secondary: 'border border-line bg-surface text-ink hover:border-ink-muted hover:text-ink',
  quiet: 'px-2 text-brand underline hover:text-brand-strong',
  stage: 'bg-scenario-accent text-stage hover:bg-on-stage hover:text-stage',
};

export function buttonClass(variant: Variant = 'primary', extra = '') {
  return `${BASE} ${VARIANT[variant]} ${extra}`;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

export function Button({ variant = 'primary', className = '', type = 'button', ...rest }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, className)} {...rest} />;
}

interface ButtonLinkProps extends ComponentProps<typeof Link> {
  variant?: Variant;
}

export function ButtonLink({ variant = 'primary', className = '', ...rest }: ButtonLinkProps) {
  return <Link className={buttonClass(variant, className)} {...rest} />;
}
