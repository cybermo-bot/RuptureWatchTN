import type { Metadata } from 'next';
import Link from 'next/link';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { EpisodeCursor, type CursorEpisode } from '@/components/replay/EpisodeCursor';
import { SiteFooter, SiteHeader } from '@/components/SiteChrome';
import { episodeStats, readEpisodes, type Episode } from '@/lib/content/episodes';
import { formatDate } from '@/lib/format';
import { t } from '@/lib/i18n';

export const metadata: Metadata = { title: t('core.replay.title') };

// The replay of past shortages, from data/reference/episodes.csv. Public, no sign-in.
// Every figure is computed from the file; every date links to its source.

const DAY = 86_400_000;
const ms = (d: string) => Date.parse(`${d}T00:00:00Z`);

function leadText(e: Episode): string {
  if (!e.foreign || e.leadDays === null) return t('core.replay.miss');
  if (e.leadDays > 0) return t('core.replay.lead', { days: e.leadDays });
  if (e.leadDays === 0) return t('core.replay.sameDay');
  return t('core.replay.late', { days: -e.leadDays });
}

// Marker shapes, so the three dates never rely on colour alone.
function Marker({ kind }: { kind: 'foreign' | 'tn' | 'end' }) {
  const common = { width: 14, height: 14, viewBox: '0 0 16 16', 'aria-hidden': true as const, className: 'shrink-0' };
  if (kind === 'foreign')
    return (
      <svg {...common}>
        <path d="M8 1.5 L14.5 8 L8 14.5 L1.5 8 Z" fill="var(--surface)" stroke="var(--ink)" strokeWidth="2" />
      </svg>
    );
  if (kind === 'tn')
    return (
      <svg {...common}>
        <circle cx="8" cy="8" r="6.5" fill="var(--level-confirmed)" />
      </svg>
    );
  return (
    <svg {...common}>
      <path d="M2.5 8.5 L6.5 12.5 L13.5 4" fill="none" stroke="var(--level-cleared)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EpisodeTimeline({ e }: { e: Episode }) {
  const points = [
    e.foreign ? { kind: 'foreign' as const, date: e.foreign.date } : null,
    { kind: 'tn' as const, date: e.tnFirstReport.date },
    e.tnEnd ? { kind: 'end' as const, date: e.tnEnd.date } : null,
  ].filter((p): p is { kind: 'foreign' | 'tn' | 'end'; date: string } => p !== null);
  const min = Math.min(...points.map((p) => ms(p.date)));
  const max = Math.max(...points.map((p) => ms(p.date)));
  const span = Math.max(max - min, DAY);
  const pos = (d: string) => 4 + ((ms(d) - min) / span) * 92;
  return (
    <div role="img" aria-label={t('core.replay.timelineLabel', { label: e.label })} className="relative h-8" dir="ltr">
      <div className="absolute inset-x-0 top-1/2 h-px bg-line" />
      {points.map((p) => (
        <span key={p.kind} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: `${pos(p.date)}%` }}>
          <Marker kind={p.kind} />
        </span>
      ))}
    </div>
  );
}

function DateRow({ kind, label, date, url, source }: { kind: 'foreign' | 'tn' | 'end'; label: string; date: string; url: string; source?: string }) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
      <Marker kind={kind} />
      <span className="text-ink">{label}</span>
      <time dateTime={date} className="font-mono text-sm text-ink">
        {formatDate(date)}
      </time>
      <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center text-sm">
        {source ? t('core.replay.sourceNamed', { source }) : t('core.replay.source')}
      </a>
    </li>
  );
}

export default function ReplayPage() {
  const file = readEpisodes();
  const stats = episodeStats(file.episodes);
  const cursorEpisodes: CursorEpisode[] = file.episodes.map((e) => ({
    key: `ep-${e.line}`,
    label: e.label,
    moleculeDci: e.moleculeDci,
    tnDate: e.tnFirstReport.date,
    endDate: e.tnEnd?.date ?? null,
    foreign: e.foreign,
  }));

  return (
    <>
      <SiteHeader />
      <main id="contenu" className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-12 px-5 py-8 sm:px-8 sm:py-12">
        <PageHeader title={t('core.replay.title')} description={t('core.replay.intro')} />

        {file.status === 'absent' ? (
          <EmptyState title={t('core.replay.emptyTitle')} body={t('core.replay.emptyBody')} />
        ) : file.missingColumns.length ? (
          <EmptyState title={t('core.replay.badFormatTitle')} body={t('core.replay.badFormatBody', { columns: file.missingColumns.join(', ') })} />
        ) : file.episodes.length === 0 ? (
          <EmptyState title={t('core.replay.emptyTitle')} body={t('core.replay.emptyBody')} />
        ) : (
          <>
            <section aria-labelledby="resume" className="flex flex-col gap-3">
              <h2 id="resume" className="text-lg font-semibold text-ink">
                {t('core.replay.statsTitle')}
              </h2>
              <dl className="hairline-list max-w-2xl border-y border-line">
                <div className="flex justify-between gap-6 py-3">
                  <dt className="text-ink-muted">{t('core.replay.statEpisodes')}</dt>
                  <dd className="font-mono text-ink">{stats.episodes}</dd>
                </div>
                <div className="flex justify-between gap-6 py-3">
                  <dt className="text-ink-muted">{t('core.replay.statEarlier')}</dt>
                  <dd className="font-mono text-ink">{stats.earlier}</dd>
                </div>
                <div className="flex justify-between gap-6 py-3">
                  <dt className="text-ink-muted">{t('core.replay.statMedian')}</dt>
                  <dd className="text-end font-mono text-ink">
                    {stats.medianLeadDays === null
                      ? t('core.replay.statMedianNone')
                      : t('core.replay.statMedianValue', { days: stats.medianLeadDays })}
                  </dd>
                </div>
              </dl>
              <p className="max-w-prose text-sm text-ink-muted">{t('core.replay.statsNote')}</p>
              {file.rejected.length ? (
                <p className="max-w-prose text-sm text-ink">
                  {t('core.replay.rejected', { n: file.rejected.length, lines: file.rejected.map((r) => r.line).join(', ') })}
                </p>
              ) : null}
            </section>

            <section aria-labelledby="machine" className="flex max-w-2xl flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h2 id="machine" className="text-lg font-semibold text-ink">
                  {t('core.replay.cursorTitle')}
                </h2>
                <p className="text-ink-muted">{t('core.replay.cursorIntro')}</p>
              </div>
              <EpisodeCursor episodes={cursorEpisodes} />
            </section>

            <section aria-labelledby="episodes" className="flex flex-col gap-3">
              <h2 id="episodes" className="text-lg font-semibold text-ink">
                {t('core.replay.episodesTitle')}
              </h2>
              <ol className="hairline-list border-y border-line">
                {file.episodes.map((e) => (
                  <li key={e.line} className="flex flex-col gap-3 py-6">
                    <div className="flex flex-col gap-1">
                      <h3 className="font-semibold break-words text-ink">{e.moleculeDci}</h3>
                      <p className="text-ink-muted">{e.label}</p>
                    </div>
                    <EpisodeTimeline e={e} />
                    <p className={e.earlier ? 'font-medium text-ink' : 'text-ink'}>{leadText(e)}</p>
                    <ul className="flex flex-col">
                      {e.foreign ? (
                        <DateRow kind="foreign" label={`${t('core.replay.foreignMarker')} (${e.foreign.regulator})`} date={e.foreign.date} url={e.foreign.url} />
                      ) : null}
                      <DateRow
                        kind="tn"
                        label={t('core.replay.tnMarker')}
                        date={e.tnFirstReport.date}
                        url={e.tnFirstReport.url}
                        source={e.tnFirstReport.source || undefined}
                      />
                      {e.tnEnd ? (
                        <DateRow kind="end" label={t('core.replay.endMarker')} date={e.tnEnd.date} url={e.tnEnd.url} />
                      ) : (
                        <li className="py-2 text-sm text-ink-muted">{t('core.replay.noEnd')}</li>
                      )}
                    </ul>
                    {e.notes ? <p className="max-w-prose text-sm text-ink-muted">{e.notes}</p> : null}
                  </li>
                ))}
              </ol>
            </section>
          </>
        )}

        <Link href="/methode#garde-fous" className="flex min-h-12 w-fit items-center">
          {t('core.explanation.methodLink')}
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
