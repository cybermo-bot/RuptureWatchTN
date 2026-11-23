'use client';

import { LocateFixed, Send } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState, useTransition } from 'react';
import { createRequest } from '@/app/(public)/medicaments/[moleculeId]/demande/actions';
import { buttonClass } from '@/components/Button';
import { governorateAt, type GovernorateMapFile } from '@/lib/geo/locate';
import { translator, type Locale } from '@/lib/i18n';
import { deviceId, myRequest, rememberRequest } from '@/lib/public/device';
import type { Governorate } from '@/lib/public/governorates';

// The request: where the visitor is, as a governorate, then one button. "Près de moi" finds
// the governorate on the phone (point in polygon on the map outlines, loaded only when
// tapped); the position itself is never sent. The phone keeps the request id to link back.

type Locating = 'idle' | 'locating' | 'denied' | 'unavailable' | 'outside';

export function RequestForm({ moleculeId, list, locale }: { moleculeId: string; list: Governorate[]; locale: Locale }) {
  const t = translator(locale);
  const router = useRouter();
  const selectId = useId();
  const [code, setCode] = useState('');
  const [locating, setLocating] = useState<Locating>('idle');
  const [located, setLocated] = useState<string | null>(null);
  const [error, setError] = useState<'invalid' | 'limited' | 'failed' | 'closed' | null>(null);
  const [openRequest, setOpenRequest] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const nameOf = (c: string) => list.find((g) => g.code === c)?.name ?? c;

  const locate = () => {
    if (!('geolocation' in navigator)) {
      setLocating('unavailable');
      return;
    }
    setLocating('locating');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const map = (await import('@/data/reference/governorates-map.json')).default as GovernorateMapFile;
        const found = governorateAt(pos.coords.latitude, pos.coords.longitude, map);
        if (found) {
          setCode(found);
          setLocated(found);
          setLocating('idle');
        } else {
          setLocating('outside');
        }
      },
      (err) => setLocating(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  };

  const send = () => {
    setError(null);
    if (!code) {
      setError('invalid');
      return;
    }
    startTransition(async () => {
      const result = await createRequest({
        moleculeId,
        governorate: code,
        deviceId: deviceId(),
      });
      if (result.ok) {
        rememberRequest(moleculeId, result.id, new Date(Date.now() + 3 * 3_600_000).toISOString());
        router.push(`/demandes/${result.id}`);
        return;
      }
      setError(result.error);
      if (result.error === 'limited') setOpenRequest(myRequest(moleculeId)?.id ?? null);
    });
  };

  const locatingText =
    locating === 'locating'
      ? t('public.request.locating')
      : locating === 'denied'
        ? t('public.request.denied')
        : locating === 'unavailable'
          ? t('public.request.unavailable')
          : locating === 'outside'
            ? t('public.request.outside')
            : located && located === code
              ? t('public.request.located', { governorate: nameOf(located) })
              : t('public.request.nearMeHint');

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
    >
      <fieldset className="flex flex-col gap-4">
        <legend className="pb-2 text-lg font-semibold text-ink">{t('public.request.areaTitle')}</legend>
        <div className="flex flex-col gap-2">
          <button type="button" onClick={locate} disabled={locating === 'locating'} className={buttonClass('secondary', 'self-start')}>
            <LocateFixed size={18} aria-hidden="true" />
            {t('public.request.nearMe')}
          </button>
          <p className="text-sm text-ink-muted" aria-live="polite">
            {locatingText}
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={selectId} className="text-sm font-medium text-ink">
            {t('public.request.governorateLabel')}
          </label>
          <select
            id={selectId}
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setError(null);
            }}
            className="min-h-12 w-full rounded-md border border-ink-muted bg-surface px-3 text-base text-ink focus:border-brand"
          >
            <option value="">{t('public.request.choose')}</option>
            {list.map((g) => (
              <option key={g.code} value={g.code}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      </fieldset>

      <div aria-live="polite">
        {error === 'invalid' ? <p className="text-ink">{t('public.request.invalid')}</p> : null}
        {error === 'failed' ? <p className="text-ink">{t('public.request.failed')}</p> : null}
        {error === 'closed' ? <p className="text-ink">{t('public.request.closed')}</p> : null}
        {error === 'limited' ? (
          <div className="panel flex flex-col gap-2 p-4">
            <p className="text-ink">{t('public.request.limited')}</p>
            {openRequest ? (
              <Link href={`/demandes/${openRequest}`} className="inline-flex min-h-12 items-center self-start text-brand underline">
                {t('public.request.limitedOpen')}
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="sticky bottom-20 flex flex-col gap-2 border-t border-line bg-surface pt-4 pb-2 sm:static sm:border-0 sm:pt-0">
        <button type="submit" disabled={pending} className={buttonClass('primary', 'w-full sm:w-auto sm:self-start')}>
          <Send size={18} aria-hidden="true" className="rtl:-scale-x-100" />
          {pending ? t('public.request.sending') : t('public.request.send')}
        </button>
        <p className="text-sm text-ink-muted">{t('public.request.stored')}</p>
      </div>
    </form>
  );
}
