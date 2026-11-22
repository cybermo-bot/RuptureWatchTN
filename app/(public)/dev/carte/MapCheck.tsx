'use client';

import { useMemo, useState } from 'react';
import { PatientMap, type MapProvider } from '@/components/maps/PatientMap';
import { translator, type Locale } from '@/lib/i18n';

// Two fictional points in central Tunis (the positions of demo pharmacies A and B, which are
// themselves fictional and away from any listed pharmacy).
export function MapCheck({ locale }: { locale: Locale }) {
  const t = translator(locale);
  const [provider, setProvider] = useState<MapProvider | null>(null);
  const markers = useMemo(
    () => [
      { id: 'test-1', lat: 36.803, lng: 10.176, label: t('public.map.testPage.marker1'), detail: t('public.map.testPage.detail') },
      { id: 'test-2', lat: 36.799, lng: 10.185, label: t('public.map.testPage.marker2'), detail: t('public.map.testPage.detail') },
    ],
    [t],
  );
  return (
    <div className="flex flex-col gap-4" data-provider={provider ?? 'loading'}>
      <PatientMap
        markers={markers}
        locale={locale}
        label={t('public.map.label')}
        center={{ lat: 36.801, lng: 10.18 }}
        zoom={15}
        onProvider={setProvider}
      />
      <ul className="hairline-list border-y border-line">
        {markers.map((m) => (
          <li key={m.id} className="py-3">
            <span className="font-medium text-ink">{m.label}</span>
            {' · '}
            <span className="text-ink-muted">{m.detail}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
