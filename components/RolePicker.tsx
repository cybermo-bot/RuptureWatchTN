'use client';

import { useFormStatus } from 'react-dom';
import { signInAsDemoRole } from '@/app/actions/auth';
import { DEMO_ROLES, type DemoRole } from '@/lib/demo/roles';
import { t } from '@/lib/i18n';

function RoleButton({ role }: { role: DemoRole }) {
  const { pending } = useFormStatus();
  const label = t(role.labelKey);
  return (
    <button
      type="submit"
      name="role"
      value={role.key}
      disabled={pending}
      aria-label={t('roles.signInAs', { role: label })}
      className="group flex min-h-16 w-full items-center gap-4 px-1 py-3.5 text-start transition-colors hover:bg-surface disabled:cursor-wait"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-medium text-ink">{label}</span>
        <span className="text-sm text-ink-muted">{t(role.hintKey)}</span>
      </span>
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        aria-hidden="true"
        className="shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-brand rtl:-scale-x-100"
      >
        <path d="M6 3.5 L10.5 8 L6 12.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function RoleList() {
  const { pending, data } = useFormStatus();
  const chosen = pending ? String(data?.get('role') ?? '') : '';
  return (
    <ul className="hairline-list border-y border-line" aria-busy={pending}>
      {DEMO_ROLES.map((role) => (
        <li key={role.key} className={chosen && chosen !== role.key ? 'opacity-50' : ''}>
          <RoleButton role={role} />
        </li>
      ))}
    </ul>
  );
}

export function RolePicker() {
  return (
    <form action={signInAsDemoRole}>
      <RoleList />
    </form>
  );
}
