import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { LevelBadge } from '@/components/LevelBadge';
import { Origins } from '@/components/Origins';
import { formatDate } from '@/lib/format';
import { t } from '@/lib/i18n';
import type { FollowedMolecule } from '@/lib/pharmacy/data';

// A medicine as a row you tap across the whole width: name, level with its origin, since when.
export function MoleculeRow({ molecule, href, large = false, label }: { molecule: FollowedMolecule; href: string; large?: boolean; label?: string }) {
  const level = molecule.signal?.level ?? 'none';
  return (
    <Link
      href={href}
      aria-label={label}
      data-pulse={molecule.moleculeId}
      className="flex min-h-16 items-center justify-between gap-4 px-4 py-3 no-underline transition-colors duration-150 hover:bg-surface-subtle active:bg-surface-subtle"
    >
      <span className="flex min-w-0 flex-col gap-1">
        <span className={`font-medium break-words text-ink ${large ? 'text-lg' : ''}`}>{molecule.name}</span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-muted">
          <LevelBadge level={level} />
          <Origins origins={molecule.signal?.evidence.origins} />
          {molecule.signal && level !== 'none' ? <span>{t('core.pharmacy.since', { date: formatDate(molecule.signal.since) })}</span> : null}
        </span>
      </span>
      <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-ink-muted rtl:-scale-x-100" />
    </Link>
  );
}
