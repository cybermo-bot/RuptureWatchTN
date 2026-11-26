'use client';

import { LocateFixed, Send } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState, useTransition } from 'react';
import { createRequest } from '@/app/(public)/medicaments/[moleculeId]/demande/actions';
import { buttonClass } from '@/components/Button';
import { FormPicture } from '@/components/medicine/FormPicture';
import { isPilot } from '@/lib/env';
import { governorateAt, type GovernorateMapFile } from '@/lib/geo/locate';
import { translator, type Locale } from '@/lib/i18n';
import { deviceId, myRequest, rememberRequest } from '@/lib/public/device';
import type { Governorate } from '@/lib/public/governorates';
import type { Brand } from '@/lib/public/medicine';
import { presentationText } from '@/lib/public/presentation';
import { Ltr } from './Ltr';

// The request: where the visitor is, as a governorate, then one button. "Près de moi" finds
// the governorate on the phone (point in polygon on the map outlines, loaded only when
// tapped); the position itself is never sent. The phone keeps the request id to link back.

type Locating = 'idle' | 'locating' | 'denied' | 'unavailable' | 'outside';

export function RequestForm({ molecule, presentation, list, locale }: { molecule: { id: string; name: string }; presentation: Brand | null; list: Governorate[]; locale: Locale }) {
  const t = translator(locale);
  const router = useRouter();
  const selectId = useId();
  const [code, setCode] = useState('');
  const [anyBrand, setAnyBrand] = useState(!presentation);
  const [locating, setLocating] = useState<Locating>('idle');
  const [located, setLocated] = useState<string | null>(null);
  const [error, setError] = useState<'invalid' | 'limited' | 'failed' | 'closed' | null>(null);
  const [openRequest, setOpenRequest] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const nameOf = (c: string) => list.find((g) => g.code === c)?.name ?? c;
  const product = presentation ? presentationText(presentation, t) : molecule.name;
  const requestedName = anyBrand ? t('public.request.anyBrand', { name: `\u2068${molecule.name}\u2069` }) : `\u2068${product}\u2069`;

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
        moleculeId: molecule.id,
        medicineId: anyBrand ? null : presentation?.id ?? null,
        governorate: code,
        deviceId: deviceId(),
      });
      if (result.ok) {
        rememberRequest(molecule.id, result.id, new Date(Date.now() + 3 * 3_600_000).toISOString());
        router.push(`/demandes/${result.id}`);
        return;
      }
      setError(result.error);
      if (result.error === 'limited') setOpenRequest(myRequest(molecule.id)?.id ?? null);
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
      {presentation ? (
        <fieldset className="flex flex-col gap-1">
          <legend className="pb-1 text-lg font-semibold text-ink">{t('public.request.product')}</legend>
          <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-sm px-2 py-1.5 font-medium has-checked:bg-surface-subtle hover:bg-surface-subtle">
            <input type="radio" name="scope" checked={!anyBrand} onChange={() => setAnyBrand(false)} disabled={pending} className="size-5 shrink-0 accent-brand" />
            <FormPicture label={presentation.label} brand={presentation.brand} locale={locale} />
            <Ltr>{product}</Ltr>
          </label>
          <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-sm px-2 py-1.5 text-ink-muted has-checked:bg-surface-subtle hover:bg-surface-subtle">
            <input type="radio" name="scope" checked={anyBrand} onChange={() => setAnyBrand(true)} disabled={pending} className="size-5 shrink-0 accent-brand" />
            {t('public.request.anyBrand', { name: `\u2068${molecule.name}\u2069` })}
          </label>
        </fieldset>
      ) : null}
      {anyBrand ? <p className="text-sm text-ink-muted">{t('public.medicine.brandsCaution')}</p> : null}
      <fieldset className="flex flex-col gap-4">
        <legend className="pb-2 text-lg font-semibold text-ink">{t('public.request.areaTitle')}</legend>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={selectId} className="text-sm font-medium text-ink">
            {t('public.request.governorateLabel')}
          </label>
          <select
            id={selectId}
            value={code}
            disabled={pending}
            onChange={(e) => {
              setCode(e.target.value);
              setError(null);
            }}
            className="min-h-12 w-full rounded-sm border border-ink-muted bg-surface px-3 text-base text-ink focus:border-brand"
          >
            <option value="">{t('public.request.choose')}</option>
            {list.map((g) => (
              <option key={g.code} value={g.code}>
                {g.name}
              </option>
            ))}
          </select>
          {/* The pilot site: say that few pharmacies take part yet (pilot-2 item 4). */}
          {isPilot() ? <p className="text-sm text-ink-muted">{t('public.request.pilotFew')}</p> : null}
        </div>
        <div className="flex flex-col gap-2">
          <button type="button" onClick={locate} disabled={pending || locating === 'locating'} className={buttonClass('quiet', 'self-start')}>
            <LocateFixed size={20} aria-hidden="true" />
            {t('public.request.nearMe')}
          </button>
          <p className="text-sm text-ink-muted" aria-live="polite">
            {locatingText}
          </p>
        </div>
      </fieldset>

      <div aria-live="polite" className="empty:hidden">
        {error === 'invalid' ? <p className="text-ink">{t('public.request.invalid')}</p> : null}
        {error === 'failed' ? <p className="text-ink">{t('public.request.failed')}</p> : null}
        {error === 'closed' ? <p className="text-ink">{t('public.request.closed')}</p> : null}
        {error === 'limited' ? (
          <div className="flex flex-col gap-2 border-t border-line pt-4">
            <p className="text-ink">{t('public.request.limited')}</p>
            {openRequest ? (
              <Link href={`/demandes/${openRequest}`} className="inline-flex min-h-12 items-center self-start text-brand underline">
                {t('public.request.limitedOpen')}
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 border-t border-line pt-4">
        <p className="text-sm font-medium text-ink" aria-live="polite">
          {code ? t('public.request.scope', { name: requestedName, governorate: nameOf(code) }) : t('public.request.scopeBeforeArea', { name: requestedName })}
        </p>
        <button type="submit" disabled={pending} className={buttonClass('primary', 'w-full sm:w-auto sm:self-start')}>
          <Send size={20} aria-hidden="true" className="rtl:-scale-x-100" />
          {pending ? t('public.request.sending') : t('public.request.send')}
        </button>
      </div>
      <p className="text-sm text-ink-muted">{t('public.request.stored')}</p>
    </form>
  );
}
