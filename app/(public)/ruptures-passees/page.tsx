import { ExternalLink } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { Ltr } from '@/components/public/Ltr';
import { PublicMain } from '@/components/public/PublicChrome';
import { readEpisodes, type Episode } from '@/lib/content/episodes';
import { getTranslator } from '@/lib/i18n-server';
import { formatPublicDate } from '@/lib/public/format';

// Track B: the archive of past shortages in Tunisia, from data/reference/episodes.csv (team
// file, a source link for every date). One row per episode, newest first. Labels and source
// names stay as written in the file.

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return { title: t('public.pages.pastShortages.title') };
}

function SourceLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center gap-1.5 text-brand underline">
      {children}
      <ExternalLink size={16} aria-hidden="true" />
    </a>
  );
}

export default async function PastShortagesPage() {
  const { t, locale } = await getTranslator();
  const file = readEpisodes();
  const episodes: Episode[] = [...file.episodes].sort((a, b) => b.tnFirstReport.date.localeCompare(a.tnFirstReport.date));
  const date = (d: string) => formatPublicDate(`${d}T12:00:00Z`, locale);

  return (
    <PublicMain narrow>
      <PageHeader title={t('public.pages.pastShortages.title')} description={t('public.past.intro')} />
      {episodes.length === 0 ? (
        <EmptyState title={t('public.past.building')} />
      ) : (
        <>
          <ul className="hairline-list border-y border-line">
            {episodes.map((e) => (
              <li key={e.line} className="flex flex-col gap-1 px-4 py-4">
                <h2 className="title-3 text-ink">
                  <Ltr>{e.label}</Ltr>
                </h2>
                <p className="text-ink">{t('public.past.started', { date: date(e.tnFirstReport.date) })}</p>
                <p className="text-ink-muted">{e.tnEnd ? t('public.past.ended', { date: date(e.tnEnd.date) }) : t('public.past.ongoing')}</p>
                {e.foreign ? (
                  <p className="text-ink-muted">
                    {t('public.past.foreign', { regulator: String.fromCharCode(0x2068) + e.foreign.regulator + String.fromCharCode(0x2069), date: date(e.foreign.date) })}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-x-5">
                  <SourceLink href={e.tnFirstReport.url}>{t('public.past.sourceStart')}</SourceLink>
                  {e.tnEnd ? <SourceLink href={e.tnEnd.url}>{t('public.past.sourceEnd')}</SourceLink> : null}
                  {e.foreign ? <SourceLink href={e.foreign.url}>{t('public.past.sourceForeign')}</SourceLink> : null}
                </div>
              </li>
            ))}
          </ul>
          <p className="text-sm text-ink-muted">{t('public.past.fileNote')}</p>
        </>
      )}
      <Link href="/retour" className="inline-flex min-h-12 items-center self-start text-brand underline">
        {t('public.past.replay')}
      </Link>
    </PublicMain>
  );
}
