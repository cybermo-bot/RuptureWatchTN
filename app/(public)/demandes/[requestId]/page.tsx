import { ArrowLeft, Clock, Phone } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { EmptyState } from '@/components/EmptyState';
import { OriginBadge } from '@/components/OriginBadge';
import { AnswersMap } from '@/components/public/AnswersMap';
import { AutoRefresh } from '@/components/public/AutoRefresh';
import { Ltr } from '@/components/public/Ltr';
import { PublicMain } from '@/components/public/PublicChrome';
import type { Translate } from '@/lib/i18n';
import { getTranslator } from '@/lib/i18n-server';
import { formatPublicTime } from '@/lib/public/format';
import { governorate } from '@/lib/public/governorates';
import { getPublicMolecule, getPublicStatus } from '@/lib/public/medicine';
import { getPublicRequest, hasPassed, minutesUntil } from '@/lib/public/request';

// Track B: the answers to one request, for whoever holds its random id (the visitor who made
// it). Counts of pharmacies asked and answering, "moins de 3" below three; only the pharmacies
// that said "disponible" and chose to show themselves, on the map and as a list.
// Refreshes every 10 seconds while the request is open (3 hours).

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return { title: t('public.request.pageTitle') };
}

const count = (value: string, t: Translate) => (value === '<3' ? t('public.request.lessThanThree') : value);

function timeLeft(expiresAt: string, t: Translate): string {
  const minutes = minutesUntil(expiresAt);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return t('public.request.minutes', { m });
  return m === 0 ? t('public.request.hours', { h }) : t('public.request.hoursMinutes', { h, m });
}

export default async function RequestPage(props: PageProps<'/demandes/[requestId]'>) {
  const { t, locale } = await getTranslator();
  const request = await getPublicRequest((await props.params).requestId);
  if (!request) {
    return (
      <PublicMain narrow>
        <EmptyState
          title={t('public.request.notFoundTitle')}
          body={t('public.request.notFoundBody')}
          action={
            <Link href="/medicaments" className="text-brand underline">
              {t('public.medicine.back')}
            </Link>
          }
        />
      </PublicMain>
    );
  }

  const [molecule, status] = await Promise.all([getPublicMolecule(request.molecule_id), getPublicStatus(request.molecule_id)]);
  const gov = governorate(request.governorate_code, locale);
  const expired = hasPassed(request.expires_at);
  const shown = request.available;
  const markers = shown
    .filter((a) => a.latitude !== null && a.longitude !== null)
    .map((a, i) => ({
      id: `${i}-${a.answered_at}`,
      lat: a.latitude as number,
      lng: a.longitude as number,
      label: a.display_name,
      detail: [
        a.public_address,
        t('public.request.answeredAt', {
          time: formatPublicTime(a.answered_at, locale),
        }),
      ]
        .filter(Boolean)
        .join(' · '),
    }));

  return (
    <PublicMain narrow>
      {!expired ? <AutoRefresh seconds={10} until={request.expires_at} /> : null}
      {molecule ? (
        <Link href={`/medicaments/${molecule.id}`} className="inline-flex min-h-12 items-center gap-2 self-start text-brand underline">
          <ArrowLeft size={18} aria-hidden="true" className="rtl:-scale-x-100" />
          {t('public.request.backToMedicine')}
        </Link>
      ) : null}

      <header className="flex flex-col gap-1.5">
        <h1 className="text-2xl leading-tight font-semibold tracking-tight text-ink sm:text-[1.75rem]">{t('public.request.pageTitle')}</h1>
        <p className="text-ink-muted">
          {t('public.request.for', {
            name: String.fromCharCode(0x2068) + (molecule?.name ?? '') + String.fromCharCode(0x2069),
            governorate: gov?.name ?? request.governorate_code,
          })}
        </p>
      </header>

      {expired ? (
        <EmptyState title={t('public.request.expiredTitle')} body={t('public.request.expiredBody')} />
      ) : (
        <section aria-label={t('public.request.pageTitle')} className="panel flex flex-col gap-4 p-5" aria-live="polite">
          <dl className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-0.5">
              <dt className="text-sm text-ink-muted">{t('public.request.asked')}</dt>
              <dd className="text-xl font-semibold text-ink">{count(request.asked, t)}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-sm text-ink-muted">{t('public.request.answered')}</dt>
              <dd className="text-xl font-semibold text-ink">{count(request.answered, t)}</dd>
            </div>
          </dl>
          <p className="inline-flex items-center gap-2 border-t border-line pt-3 text-sm text-ink-muted">
            <Clock size={16} aria-hidden="true" />
            {t('public.request.expiresIn', {
              time: timeLeft(request.expires_at, t),
            })}
          </p>
          <p className="text-sm text-ink-muted">{t('public.request.refresh')}</p>
        </section>
      )}

      <section aria-labelledby="available-title" className="flex flex-col gap-3">
        <h2 id="available-title" className="text-lg font-semibold text-ink">
          {t('public.request.availableTitle')}
        </h2>
        {shown.length > 0 ? (
          <>
            <p className="inline-flex items-center gap-2 rounded-md border border-ink-muted px-4 py-3 font-medium text-ink">
              <Phone size={18} aria-hidden="true" />
              {t('public.request.callFirst')}
            </p>
            {status.level === 'confirmed' ? <p className="font-medium text-ink">{t('public.request.prescription')}</p> : null}
            {markers.length > 0 && gov ? (
              <AnswersMap markers={markers} centre={gov.centre} label={t('public.request.mapLabel')} locale={locale} />
            ) : null}
            <ul className="panel hairline-list overflow-hidden" aria-label={t('public.request.listLabel')}>
              {shown.map((a, i) => (
                <li key={`${i}-${a.answered_at}`} className="flex flex-col gap-1 px-4 py-3">
                  <span className="flex flex-wrap items-center gap-2">
                    <Ltr className="font-medium text-ink">{a.display_name}</Ltr>
                    <OriginBadge origin={a.origin} locale={locale} />
                  </span>
                  {a.public_address ? <Ltr className="self-start text-sm text-ink-muted">{a.public_address}</Ltr> : null}
                  <span className="text-sm text-ink-muted">
                    {t('public.request.answeredAt', {
                      time: formatPublicTime(a.answered_at, locale),
                    })}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : expired ? (
          <p className="text-ink-muted">{t('public.request.availableNone')}</p>
        ) : (
          <EmptyState title={t('public.request.waitingTitle')} body={t('public.request.waitingBody')} />
        )}
        <p className="text-sm text-ink-muted">{t('public.request.hiddenNote')}</p>
      </section>
    </PublicMain>
  );
}
