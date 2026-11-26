import { LevelBadge } from '@/components/LevelBadge';
import { Origins } from '@/components/Origins';
import { FormPicture } from '@/components/medicine/FormPicture';
import { RowLink } from '@/components/ui/ListRow';
import { formatDate } from '@/lib/format';
import { t } from '@/lib/i18n';
import type { FollowedMolecule } from '@/lib/pharmacy/data';

const TAG = 'inline-flex items-center rounded-sm px-1.5 text-xs leading-5';

// A followed medicine as a ListRow: name, level with its origin, since when.
// isNew: the pharmacy has an unread alert for it (its level changed since it last looked).
// notice: a foreign regulator's notice is active for it (it never raises a level on its own).
// showcase: a medicine of the demonstration that this one-click demo pharmacy cannot report
// (pilot-1 item 3), tagged « démonstration »; the caller points the row at the medicine page.
export function MoleculeRow({
  molecule,
  href,
  large = false,
  label,
  showcase = false,
  isNew = false,
}: {
  molecule: FollowedMolecule;
  href: string;
  large?: boolean;
  label?: string;
  showcase?: boolean;
  isNew?: boolean;
}) {
  const level = molecule.signal?.level ?? 'none';
  const notice = (molecule.signal?.evidence.notices.length ?? 0) > 0;
  return (
    <RowLink
      href={href}
      ariaLabel={label}
      data={{ 'data-pulse': molecule.moleculeId, 'data-showcase': showcase ? '' : undefined, 'data-new': isNew ? '' : undefined }}
      leading={<FormPicture />}
      title={
        <>
          <span className={large ? 'text-lg' : undefined}>{molecule.name}</span>
          {isNew ? <span className={`${TAG} ms-2 bg-brand align-[0.125em] font-medium text-white`}>{t('core.pharmacy.today.new')}</span> : null}
        </>
      }
      meta={
        <>
          <LevelBadge level={level} />
          <Origins origins={molecule.signal?.evidence.origins} />
          {molecule.signal && level !== 'none' ? <span>{t('core.pharmacy.since', { date: formatDate(molecule.signal.since) })}</span> : null}
          {notice ? <span className={`${TAG} border border-ink-muted text-ink`}>{t('core.pharmacy.today.notice')}</span> : null}
          {showcase ? (
            <span title={t('core.showcase.tagLabel')} className={`${TAG} border border-ink-muted text-ink`}>
              <span className="sr-only">{t('core.showcase.tagLabel')}</span>
              <span aria-hidden="true">{t('core.showcase.tag')}</span>
            </span>
          ) : null}
        </>
      }
    />
  );
}
