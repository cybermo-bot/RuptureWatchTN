import Link from 'next/link';
import { notFound } from 'next/navigation';
import { reportDeliveredAgain, unfollowMolecule, followMolecule } from '@/app/actions/pharmacy';
import { Button } from '@/components/Button';
import { Guidance } from '@/components/Guidance';
import { LevelBadge } from '@/components/LevelBadge';
import { Origins } from '@/components/Origins';
import { LevelExplanation } from '@/components/LevelExplanation';
import { OriginBadge } from '@/components/OriginBadge';
import { ReportTimingForm } from '@/components/ReportTimingForm';
import { formatDate } from '@/lib/format';
import { t } from '@/lib/i18n';
import { getMoleculeView } from '@/lib/pharmacy/data';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function MoleculePage({ params }: PageProps<'/pharmacie/molecule/[id]'>) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const view = await getMoleculeView(id);
  if (!view) notFound();

  const level = view.signal?.level ?? 'none';
  const reportedBefore = view.reports.some((r) => r.kind === 'not_delivered');
  const canSayDelivered = (level === 'likely' || level === 'confirmed') && reportedBefore;

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-3 border-b border-line pb-6">
        <Link href="/pharmacie" className="text-sm text-ink-muted">
          {t('core.molecule.backHome')}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight break-words text-ink sm:text-3xl">{view.name}</h1>
        <form action={view.followed ? unfollowMolecule : followMolecule}>
          <input type="hidden" name="molecule_id" value={view.id} />
          <button
            type="submit"
            className="min-h-12 text-sm font-medium text-brand underline underline-offset-4 hover:text-brand-strong"
          >
            {view.followed ? t('core.follow.unfollow') : t('core.follow.follow')}
          </button>
        </form>
      </header>

      <section aria-labelledby="niveau" className="flex flex-col gap-3">
        <h2 id="niveau" className="text-sm font-medium text-ink-muted">
          {t('core.molecule.levelTitle')}
        </h2>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <LevelBadge level={level} className="text-base" />
          <Origins origins={view.signal?.evidence.origins} />
          {view.signal && level !== 'none' ? (
            <span className="text-sm text-ink-muted">{t('core.molecule.since', { date: formatDate(view.signal.since) })}</span>
          ) : null}
        </p>
        {view.signal ? (
          <LevelExplanation rule={view.signal.rule} evidence={view.signal.evidence} />
        ) : (
          <p className="text-ink-muted">{t('core.molecule.noSignal')}</p>
        )}
      </section>

      <section aria-labelledby="signaler" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="signaler" className="text-lg font-semibold text-ink">
            {t('core.report.title')}
          </h2>
          <p className="text-sm text-ink-muted">
            {t('core.report.whenTitle')} {t('core.report.whenIntro')}
          </p>
        </div>
        <ReportTimingForm moleculeId={view.id} headingId="signaler" />
        {canSayDelivered ? (
          <form action={reportDeliveredAgain} className="flex flex-col gap-2 border-t border-line pt-5">
            <input type="hidden" name="molecule_id" value={view.id} />
            <p className="max-w-prose text-sm text-ink-muted">{t('core.report.deliveredAgainHint')}</p>
            <Button type="submit" variant="secondary" className="sm:self-start">
              {t('core.report.deliveredAgain')}
            </Button>
          </form>
        ) : null}
      </section>

      {level !== 'none' ? <Guidance level={level} /> : null}

      <section aria-labelledby="avis" className="flex flex-col gap-3">
        <h2 id="avis" className="text-sm font-medium text-ink-muted">
          {t('core.molecule.noticesTitle')}
        </h2>
        {view.notices.length === 0 ? (
          <p className="text-ink-muted">{t('core.molecule.noticesEmpty')}</p>
        ) : (
          <ul className="hairline-list border-y border-line">
            {view.notices.map((n) => (
              <li key={n.id} className="flex flex-col gap-1 py-3">
                <p className="flex flex-wrap items-center gap-2 text-ink">
                  <span className="font-medium">{n.source}</span>
                  <span>{t(`core.molecule.noticeStatus.${n.status}`)}</span>
                  <OriginBadge origin={n.origin} />
                </p>
                <p className="text-sm text-ink-muted">
                  <a href={n.url} rel="noopener noreferrer" target="_blank">
                    {t('core.molecule.noticeLink', { source: n.source })}
                  </a>
                  {', '}
                  {t('core.molecule.noticePublished', { date: formatDate(n.publishedAt) })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="mes-signalements" className="flex flex-col gap-3">
        <h2 id="mes-signalements" className="text-sm font-medium text-ink-muted">
          {t('core.molecule.myReportsTitle')}
        </h2>
        {view.reports.length === 0 ? (
          <p className="text-ink-muted">{t('core.molecule.myReportsEmpty')}</p>
        ) : (
          <ul className="hairline-list border-y border-line">
            {view.reports.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3">
                <span className="flex flex-col gap-0.5">
                  <span className="text-ink">{t(`core.molecule.kind.${r.kind}`)}</span>
                  <span className="text-sm text-ink-muted">
                    {formatDate(r.reportedAt)}
                    {r.orderedAt ? `, ${t('core.molecule.orderedOn', { date: formatDate(r.orderedAt) })}` : ''}
                  </span>
                </span>
                <span className="flex items-center gap-2 text-sm text-ink-muted">
                  <span>{t(`core.molecule.channel.${r.channel}`)}</span>
                  <OriginBadge origin={r.origin} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
