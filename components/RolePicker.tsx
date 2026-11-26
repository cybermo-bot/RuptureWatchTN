'use client';

import { Building2, Hospital, Landmark, Search, Stethoscope, Store, Truck, Users, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { signInAsDemoRole } from '@/app/actions/auth';
import { DEMO_ROLES, type DemoRole, type RoleGroup, type RoleIcon } from '@/lib/demo/roles';
import { t } from '@/lib/i18n';

// The secondary role picker keeps the full set of one-click demo roles. The public side uses a link.

const ICONS: Record<RoleIcon | 'public', LucideIcon> = {
  pharmacy: Store,
  hospital: Hospital,
  wholesaler: Truck,
  ministry: Landmark,
  central: Building2,
  order: Users,
  prescriber: Stethoscope,
  public: Search,
};

const GROUPS: RoleGroup[] = ['terrain', 'pilotage', 'public'];

function TileBody({ icon, label, hint }: { icon: LucideIcon; label: string; hint: string }) {
  const Icon = icon;
  return (
    <span className="flex flex-1 items-start gap-3 p-4">
      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-sm bg-surface-subtle text-brand">
        <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="font-semibold text-ink">{label}</span>
        <span className="text-sm text-ink-muted">{hint}</span>
      </span>
    </span>
  );
}

const TILE =
  'group panel flex h-full w-full flex-col overflow-hidden text-start no-underline transition-colors duration-(--dur-fast) hover:border-ink-muted disabled:cursor-wait';

function RoleTile({ role }: { role: DemoRole }) {
  const { pending, data } = useFormStatus();
  const chosen = pending ? String(data?.get('role') ?? '') : '';
  const label = t(role.labelKey);
  return (
    <li className={chosen && chosen !== role.key ? 'opacity-50' : ''}>
      <button type="submit" name="role" value={role.key} disabled={pending} aria-label={t('core.roles.signInAs', { role: label })} className={TILE}>
        <TileBody icon={ICONS[role.icon]} label={label} hint={t(role.hintKey)} />
      </button>
    </li>
  );
}

function Groups({ publicExtra }: { publicExtra?: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <div className="flex flex-col gap-8" aria-busy={pending}>
      {GROUPS.map((group) => {
        const roles = DEMO_ROLES.filter((r) => r.group === group);
        return (
          <section key={group} aria-labelledby={`groupe-${group}`} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <h3 id={`groupe-${group}`} className="text-lg font-semibold text-ink">
                {t(`core.home.roleGroups.${group}`)}
              </h3>
              <p className="text-sm text-ink-muted">{t(`core.home.roleGroupHints.${group}`)}</p>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {group === 'public' ? (
                <li>
                  <Link href="/medicaments" className={TILE}>
                    <TileBody icon={ICONS.public} label={t('core.home.publicRole.label')} hint={t('core.home.publicRole.hint')} />
                  </Link>
                </li>
              ) : null}
              {roles.map((role) => (
                <RoleTile key={role.key} role={role} />
              ))}
              {/* Desktop only: open the public side on a phone (components/home/PhoneQr.tsx). */}
              {group === 'public' && publicExtra ? <li className="hidden lg:block">{publicExtra}</li> : null}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export function RolePicker({ publicExtra }: { publicExtra?: ReactNode } = {}) {
  return (
    <form action={signInAsDemoRole}>
      <Groups publicExtra={publicExtra} />
    </form>
  );
}
