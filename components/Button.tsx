import Link from 'next/link';
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'quiet' | 'danger' | 'stage';
/** `pill` only for the main public and home actions (rw-design-system). */
type Shape = 'default' | 'pill';

const BASE =
  'inline-flex min-h-12 items-center justify-center gap-2 px-5 text-base font-medium no-underline transition-colors disabled:cursor-not-allowed disabled:opacity-60';

const VARIANT: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-strong hover:text-white',
  secondary: 'border border-line bg-surface text-ink hover:border-ink-muted hover:text-ink',
  quiet: 'px-2 text-brand underline hover:text-brand-strong',
  danger: 'bg-level-confirmed text-white hover:bg-level-confirmed/90 hover:text-white',
  stage: 'bg-scenario-accent text-stage hover:bg-on-stage hover:text-stage',
};

export function buttonClass(variant: Variant = 'primary', extra = '', shape: Shape = 'default') {
  return `${BASE} ${shape === 'pill' ? 'rounded-full' : 'rounded-sm'} ${VARIANT[variant]} ${extra}`;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  shape?: Shape;
  children: ReactNode;
}

export function Button({ variant = 'primary', shape = 'default', className = '', type = 'button', ...rest }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, className, shape)} {...rest} />;
}

interface ButtonLinkProps extends ComponentProps<typeof Link> {
  variant?: Variant;
  shape?: Shape;
}

export function ButtonLink({ variant = 'primary', shape = 'default', className = '', ...rest }: ButtonLinkProps) {
  return <Link className={buttonClass(variant, className, shape)} {...rest} />;
}
