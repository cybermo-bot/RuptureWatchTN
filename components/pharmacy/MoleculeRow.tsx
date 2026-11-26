import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { LevelBadge } from '@/components/LevelBadge';
import { Origins } from '@/components/Origins';
import { FormPicture } from '@/components/medicine/FormPicture';
import { formatDate } from '@/lib/format';
import { t } from '@/lib/i18n';
import type { FollowedMolecule } from '@/lib/pharmacy/data';

// A medicine as a row you tap across the whole width: name, level with its origin, since when.
// showcase: a medicine of the demonstration that this one-click demo pharmacy cannot report
// (pilot-1 item 3), tagged « démonstration »; the caller points the row at the medicine page.
export function MoleculeRow({
  molecule,
  href,
  large = false,
  label,
  showcase = false,
}: {
  molecule: FollowedMolecule;
  href: string;
  large?: boolean;
  label?: string;
  showcase?: boolean;
}) {
  const level = molecule.signal?.level ?? 'none';
  return (
    <Link
      href={href}
      aria-label={label}
      data-pulse={molecule.moleculeId}
      data-showcase={showcase ? '' : undefined}
      className="flex min-h-16 items-center justify-between gap-4 px-4 py-3 no-underline transition-colors duration-(--dur-fast) hover:bg-surface-subtle active:bg-surface-subtle"
    >
      <FormPicture />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className={`font-medium break-words text-ink ${large ? 'text-lg' : ''}`}>{molecule.name}</span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-muted">
          <LevelBadge level={level} />
          <Origins origins={molecule.signal?.evidence.origins} />
          {molecule.signal && level !== 'none' ? <span>{t('core.pharmacy.since', { date: formatDate(molecule.signal.since) })}</span> : null}
          {showcase ? (
            <span title={t('core.showcase.tagLabel')} className="inline-flex items-center rounded-sm border border-ink-muted px-1.5 text-xs leading-5 text-ink">
              <span className="sr-only">{t('core.showcase.tagLabel')}</span>
              <span aria-hidden="true">{t('core.showcase.tag')}</span>
            </span>
          ) : null}
        </span>
      </span>
      <ChevronRight size={20} aria-hidden="true" className="shrink-0 text-ink-muted rtl:-scale-x-100" />
    </Link>
  );
}
