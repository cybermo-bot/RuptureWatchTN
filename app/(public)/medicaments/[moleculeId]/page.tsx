import { ArrowLeft, ChevronDown, Info, MapPin, PackageCheck } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ButtonLink } from '@/components/Button';
import { LevelShape } from '@/components/LevelBadge';
import { OriginBadge } from '@/components/OriginBadge';
import { FormPicture } from '@/components/medicine/FormPicture';
import { FollowButton } from '@/components/public/FollowButton';
import { Ltr } from '@/components/public/Ltr';
import { PublicMain } from '@/components/public/PublicChrome';
import { plural } from '@/lib/i18n';
import { getTranslator } from '@/lib/i18n-server';
import { FreshnessLine } from '@/components/Freshness';
import { freshness } from '@/lib/freshness';
import { formatPublicDate, formatPublicTime } from '@/lib/public/format';
import { createAnonClient } from '@/lib/db/server';
import { publicArrival } from '@/lib/institutions/data';
import { LevelBand } from '@/components/charts/LevelBand';
import { getBrands, getPublicHistory, getPublicMolecule, getPublicPresentation, getPublicStatus } from '@/lib/public/medicine';
import { ShareStatus } from '@/components/public/ShareStatus';
import { OG_BASE } from '@/lib/og/meta';
import { publicStatusSentence, shareText, simulatedBanner, statusLines } from '@/lib/public/share';
import { SimulatedBanner } from '@/components/public/SimulatedBanner';
import { presentationText } from '@/lib/public/presentation';
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
  const { presentation: requestedPresentation } = await props.searchParams;
  const [status, brands, arrival, history, presentation] = await Promise.all([
    getPublicStatus(molecule.id),
    getBrands(molecule.id),
    // Only while "confirmée" (public_arrival): the date and its origin, never a level change.
    publicArrival(createAnonClient(), molecule.id).catch(() => null),
    // The 90-day strip: "confirmée" and "levée" periods only (public_molecule_history).
    getPublicHistory(molecule.id, HISTORY_DAYS).catch(() => null),
    requestedPresentation === undefined ? null : getPublicPresentation(molecule.id, requestedPresentation),
  ]);
  if (requestedPresentation !== undefined && !presentation) notFound();
  const requestHref = `/medicaments/${molecule.id}/demande${presentation ? `?presentation=${presentation.id}` : ''}`;

  const shown = status.level === 'confirmed' || status.level === 'cleared';
  // A simulated « confirmée » or « levée » says so first, in the strongest band (pilot-1 item 1).
  const banner = simulatedBanner(status, t);
  // "Mis à jour il y a …": the last evaluation of a shown status (never below "confirmée").
  const fresh = shown && status.evaluatedAt ? freshness(status.evaluatedAt, new Date()) : null;
  const body = shown ? t(status.level === 'confirmed' ? 'public.medicine.confirmedBody' : 'public.medicine.clearedBody') : null;
  const categories = [...new Set(brands.map((b) => b.vei_category).filter((c): c is 'V' | 'E' | 'I' => c !== null))];
  // One row per brand, its presentations folded underneath, labels as written in the CNAM list.
  const groups = [...Map.groupBy(brands, (b) => b.brand).entries()];
  const mixed = categories.length > 1;

  return (
    <PublicMain narrow>
      <Link href="/medicaments" className="-mb-3 inline-flex min-h-12 items-center gap-2 self-start text-sm font-medium text-brand underline">
        <ArrowLeft size={18} aria-hidden="true" className="rtl:-scale-x-100" />
        {t('public.medicine.back')}
      </Link>

      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <FormPicture label={presentation?.label} brand={presentation?.brand} locale={locale} className="size-14" />
          <div className="min-w-0">
            <h1 className="text-2xl leading-tight font-semibold tracking-tight break-words text-ink sm:text-3xl">
              <Ltr>{presentation ? presentationText(presentation, t) : molecule.name}</Ltr>
            </h1>
            {presentation ? (
              <p className="mt-1 text-sm text-ink-muted">
                {t('public.medicine.selectedMolecule', { name: `\u2068${molecule.name}\u2069` })}
              </p>
            ) : null}
          </div>
        </div>
      </header>

      {banner ? <SimulatedBanner text={banner} /> : null}

      <section aria-labelledby="status-title" className="flex flex-col gap-2.5 rounded-xl bg-surface-subtle p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-sm font-medium text-ink-muted">{t('public.medicine.statusTitle')}</p>
          {status.origins.map((origin) => (
            <OriginBadge key={origin} origin={origin} locale={locale} />
          ))}
        </div>
        <h2 id="status-title" className={`flex items-start gap-2.5 leading-snug font-semibold text-ink ${banner ? 'text-base' : 'text-xl'}`}>
          {status.level === 'confirmed' || status.level === 'cleared' ? (
            <span className={banner ? 'pt-0.5' : 'pt-1'}>
              <LevelShape level={status.level} size={banner ? 16 : 18} />
            </span>
          ) : null}
          <span>{publicStatusSentence(status, t, locale)}</span>
        </h2>
        <p className="max-w-[60ch] text-sm text-ink-muted">{t('public.medicine.statusScope')}</p>
        {arrival && status.level === 'confirmed' ? (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink">
            <PackageCheck size={18} aria-hidden="true" className="shrink-0 text-brand" />
            <span>{t('public.medicine.arrival', { date: formatPublicDate(arrival.expectedOn, locale) })}</span>
            <OriginBadge origin={arrival.origin} locale={locale} />
          </p>
        ) : null}
        <p className="text-sm text-ink-muted">{t('public.medicine.disclaimer')}</p>
      </section>

      <div className="flex flex-col gap-2">
        <ButtonLink href={requestHref} className="w-full sm:w-auto sm:self-start">
          <MapPin size={18} aria-hidden="true" />
          {t('public.medicine.ask')}
        </ButtonLink>
        <div className="flex flex-wrap items-start gap-x-4">
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
      </div>

      {history || shown ? (
        <details className="group border-y border-line">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-2 font-medium text-brand [&::-webkit-details-marker]:hidden">
            {t('public.medicine.statusDetails')}
            <ChevronDown size={18} aria-hidden="true" className="shrink-0 group-open:rotate-180" />
          </summary>
          <div className="flex flex-col gap-2 pb-4 text-sm text-ink-muted">
            {body ? <p>{body}</p> : null}
            {fresh && status.evaluatedAt ? (
              <p>
                <FreshnessLine
                  at={status.evaluatedAt}
                  text={fresh.unit === 'now' ? t('public.freshness.now') : plural(locale, `public.freshness.${fresh.unit}`, fresh.n)}
                  title={t('public.freshness.title', {
                    date: formatPublicDate(status.evaluatedAt, locale),
                    time: formatPublicTime(status.evaluatedAt, locale),
                  })}
                />
              </p>
            ) : null}
            {history ? (
              <>
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
                <p>{t('public.history.note')}</p>
              </>
            ) : null}
          </div>
        </details>
      ) : null}

      <section aria-labelledby="brands-title" className="flex flex-col gap-3">
        <h2 id="brands-title" className="text-lg font-semibold text-ink">
          {t('public.medicine.brandsTitle')}
        </h2>
        {brands.length > 0 ? (
          <>
            <p className="flex items-start gap-2 text-sm text-ink-muted">
              <Info size={17} aria-hidden="true" className="mt-0.5 shrink-0 text-brand" />
              {t('public.medicine.brandsCaution')}
            </p>
            <ul className="hairline-list border-y border-line">
              {groups.map(([brand, items]) => (
                <li key={brand}>
                  <details className="group">
                    <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-2 py-2 hover:bg-surface-subtle [&::-webkit-details-marker]:hidden">
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
                          <Link href={`/medicaments/${molecule.id}?presentation=${b.id}`} prefetch={false} aria-current={b.id === presentation?.id ? 'page' : undefined} className="inline-flex min-h-12 items-center gap-3">
                            <FormPicture label={b.label} brand={b.brand} locale={locale} />
                            <Ltr className="text-sm break-words">{b.label}</Ltr>
                          </Link>
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
