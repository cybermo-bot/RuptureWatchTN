import { ArrowLeft, ChevronDown, MapPin, PackageCheck } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ButtonLink } from '@/components/Button';
import { LevelShape } from '@/components/LevelBadge';
import { OriginBadge } from '@/components/OriginBadge';
import { FollowButton } from '@/components/public/FollowButton';
import { Ltr } from '@/components/public/Ltr';
import { PublicMain } from '@/components/public/PublicChrome';
import { getTranslator } from '@/lib/i18n-server';
import { FreshnessLine } from '@/components/Freshness';
import { freshness } from '@/lib/freshness';
import { formatPublicDate, formatPublicTime } from '@/lib/public/format';
import { createAnonClient } from '@/lib/db/server';
import { publicArrival } from '@/lib/institutions/data';
import { LevelBand } from '@/components/charts/LevelBand';
import { getBrands, getPublicHistory, getPublicMolecule, getPublicStatus } from '@/lib/public/medicine';
import { ShareStatus } from '@/components/public/ShareStatus';
import { OG_BASE } from '@/lib/og/meta';
import { shareText, statusLines } from '@/lib/public/share';
import { siteUrl } from '@/lib/site';

// Track B: the rumour check. What the public may know about a medicine (CLAUDE.md rule 10):
// "confirmée" with its date, "levée" after a confirmation, otherwise "Aucune rupture confirmée
// à ce jour". Then the other brands of the same molecule from the CNAM list, under the caution
// line (rule 11), the request to nearby pharmacies, and "Préviens-moi" (kept on the phone).

export const dynamic = 'force-dynamic';

const HISTORY_DAYS = 90;

export async function generateMetadata(props: PageProps<'/medicaments/[moleculeId]'>): Promise<Metadata> {
  const { t, locale } = await getTranslator();
  const molecule = await getPublicMolecule((await props.params).moleculeId).catch(() => null);
  if (!molecule) return { title: t('public.pages.medicine.title') };
  // A shared link shows the medicine and its public status (its card: opengraph-image.tsx).
  const status = await getPublicStatus(molecule.id).catch(() => null);
  const description = status ? statusLines(status, t, locale).join(' ') : undefined;
  return {
    title: molecule.name,
    description,
    metadataBase: new URL(siteUrl()),
    openGraph: { ...OG_BASE, locale: locale === 'ar' ? 'ar_TN' : 'fr_FR', title: molecule.name, description },
  };
}

export default async function MedicinePage(props: PageProps<'/medicaments/[moleculeId]'>) {
  const { t, locale } = await getTranslator();
  const molecule = await getPublicMolecule((await props.params).moleculeId);
  if (!molecule) notFound();
  const [status, brands, arrival, history] = await Promise.all([
    getPublicStatus(molecule.id),
    getBrands(molecule.id),
    // Only while "confirmée" (public_arrival): the date and its origin, never a level change.
    publicArrival(createAnonClient(), molecule.id).catch(() => null),
    // The 90-day strip: "confirmée" and "levée" periods only (public_molecule_history).
    getPublicHistory(molecule.id, HISTORY_DAYS).catch(() => null),
  ]);

  const shown = status.level === 'confirmed' || status.level === 'cleared';
  // "Mis à jour il y a …": the last evaluation of a shown status (never below "confirmée").
  const fresh = shown && status.evaluatedAt ? freshness(status.evaluatedAt, new Date()) : null;
  const headline =
    status.level === 'confirmed' && status.since
      ? t('public.medicine.confirmed', {
          date: formatPublicDate(status.since, locale),
        })
      : status.level === 'cleared' && status.since
        ? t('public.medicine.cleared', {
            date: formatPublicDate(status.since, locale),
          })
        : t('public.medicine.none');
  const body =
    status.level === 'confirmed'
      ? t('public.medicine.confirmedBody')
      : status.level === 'cleared'
        ? t('public.medicine.clearedBody')
        : t('public.medicine.noneBody');
  const tone =
    status.level === 'confirmed' ? 'border-level-confirmed' : status.level === 'cleared' ? 'border-level-cleared' : 'border-line';
  const categories = [...new Set(brands.map((b) => b.vei_category).filter((c): c is 'V' | 'E' | 'I' => c !== null))];
  // One row per brand, its presentations folded underneath, labels as written in the CNAM list.
  const groups = [...Map.groupBy(brands, (b) => b.brand).entries()];
  const mixed = categories.length > 1;

  return (
    <PublicMain narrow>
      <Link href="/medicaments" className="inline-flex min-h-12 items-center gap-2 self-start text-brand underline">
        <ArrowLeft size={18} aria-hidden="true" className="rtl:-scale-x-100" />
        {t('public.medicine.back')}
      </Link>

      <header className="flex flex-col gap-1.5">
        <h1 className="text-2xl leading-tight font-semibold tracking-tight break-words text-ink sm:text-[1.75rem]">
          <Ltr>{molecule.name}</Ltr>
        </h1>
        {categories.length > 0 ? (
          <p className="text-sm text-ink-muted">
            {t('public.medicine.category', {
              category: categories.map((c) => t(`public.medicine.categories.${c}`)).join(', '),
            })}
          </p>
        ) : null}
      </header>

      <section aria-labelledby="status-title" className={`panel flex flex-col gap-3 border-s-4 p-5 ${tone}`}>
        <h2 id="status-title" className="text-sm font-medium text-ink-muted">
          {t('public.medicine.statusTitle')}
        </h2>
        <p className="flex items-start gap-3 text-xl leading-snug font-semibold text-ink">
          {shown ? (
            <span className="pt-1">
              <LevelShape level={status.level as 'confirmed' | 'cleared'} size={18} />
            </span>
          ) : null}
          <span>{headline}</span>
        </p>
        <p className="text-ink">{body}</p>
        {fresh && status.evaluatedAt ? (
          <p className="text-sm text-ink-muted">
            <FreshnessLine
              at={status.evaluatedAt}
              text={fresh.unit === 'now' ? t('public.freshness.now') : t(`public.freshness.${fresh.unit}`, { n: fresh.n })}
              title={t('public.freshness.title', {
                date: formatPublicDate(status.evaluatedAt, locale),
                time: formatPublicTime(status.evaluatedAt, locale),
              })}
            />
          </p>
        ) : null}
        {status.origins.length > 0 ? (
          <p className="flex flex-wrap gap-1.5">
            {status.origins.map((o) => (
              <OriginBadge key={o} origin={o} locale={locale} />
            ))}
          </p>
        ) : null}
        {arrival && status.level === 'confirmed' ? (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-ink">
            <PackageCheck size={18} aria-hidden="true" className="shrink-0 text-brand" />
            <span>{t('public.medicine.arrival', { date: formatPublicDate(arrival.expectedOn, locale) })}</span>
            <OriginBadge origin={arrival.origin} locale={locale} />
          </p>
        ) : null}
        <p className="border-t border-line pt-3 text-sm text-ink-muted">{t('public.medicine.disclaimer')}</p>
      </section>

      <div className="flex flex-col gap-4">
        <ButtonLink href={`/medicaments/${molecule.id}/demande`} className="w-full sm:w-auto sm:self-start">
          <MapPin size={18} aria-hidden="true" />
          {t('public.medicine.ask')}
        </ButtonLink>
        <FollowButton moleculeId={molecule.id} name={molecule.name} level={status.level} since={status.since} locale={locale} />
        <ShareStatus
          title={molecule.name}
          text={shareText(molecule.name, status, t, locale)}
          url={`${siteUrl()}/medicaments/${molecule.id}`}
          labels={{
            share: t('public.share.button'),
            whatsapp: t('public.share.whatsapp'),
            copy: t('public.share.copy'),
            copied: t('public.share.copied'),
            copyFailed: t('public.share.copyFailed'),
          }}
        />
      </div>

      {history ? (
        <section aria-label={t('public.history.title', { days: HISTORY_DAYS })} className="flex flex-col gap-1">
          <LevelBand
            events={history}
            days={HISTORY_DAYS}
            title={t('public.history.title', { days: HISTORY_DAYS })}
            text={{
              level: (level) => t(`public.history.levels.${level === 'confirmed' || level === 'cleared' ? level : 'none'}`),
              today: t('public.history.today'),
              axisStart: (from) => formatPublicDate(from, locale),
              beforeWindow: (from) => t('public.history.beforeWindow', { date: formatPublicDate(from, locale) }),
              fromDate: (date) => t('public.history.fromDate', { date: formatPublicDate(date, locale) }),
              noLevel: t('public.history.noLevel', { days: HISTORY_DAYS }),
            }}
          />
          <p className="text-xs text-ink-muted">{t('public.history.note')}</p>
        </section>
      ) : null}

      <section aria-labelledby="brands-title" className="flex flex-col gap-3">
        <h2 id="brands-title" className="text-lg font-semibold text-ink">
          {t('public.medicine.brandsTitle')}
        </h2>
        {brands.length > 0 ? (
          <>
            <p className="rounded-md border border-ink-muted px-4 py-3 font-medium text-ink">{t('public.medicine.brandsCaution')}</p>
            <ul className="panel hairline-list overflow-hidden">
              {groups.map(([brand, items]) => (
                <li key={brand}>
                  <details className="group">
                    <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 hover:bg-surface-subtle [&::-webkit-details-marker]:hidden">
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <Ltr className="self-start font-medium break-words text-ink">{brand}</Ltr>
                        <span className="text-sm text-ink-muted">
                          {items.length === 1
                            ? t('public.medicines.presentationsOne')
                            : t('public.medicines.presentations', {
                                n: items.length,
                              })}
                          {mixed && items[0].vei_category
                            ? ` · ${t('public.medicine.category', { category: t(`public.medicine.categories.${items[0].vei_category}`) })}`
                            : ''}
                        </span>
                      </span>
                      <ChevronDown
                        size={18}
                        aria-hidden="true"
                        className="shrink-0 text-ink-muted transition-transform group-open:rotate-180 motion-reduce:transition-none"
                      />
                    </summary>
                    <ul className="flex flex-col gap-1 px-4 pb-3">
                      {items.map((b) => (
                        <li key={b.id}>
                          <Ltr className="text-sm break-words text-ink-muted">{b.label}</Ltr>
                        </li>
                      ))}
                    </ul>
                  </details>
                </li>
              ))}
            </ul>
            <p className="text-sm text-ink-muted">{t('public.medicine.brandsSource')}</p>
          </>
        ) : (
          <p className="text-ink-muted">{t('public.medicine.brandsNone')}</p>
        )}
      </section>
    </PublicMain>
  );
}
