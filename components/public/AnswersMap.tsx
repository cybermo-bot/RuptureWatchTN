'use client';

import { useMemo } from 'react';
import { PatientMap, type LatLng } from '@/components/maps/PatientMap';
import type { Locale } from '@/lib/i18n';

// The pharmacies that said "disponible" and chose to show themselves, on the patient map.
// Their names and addresses come from our own data (organisations), not from Google.
export interface AnswerMarker {
  id: string;
  lat: number;
  lng: number;
  label: string;
  detail: string;
}

export function AnswersMap({ markers, centre, label, locale }: { markers: AnswerMarker[]; centre: LatLng; label: string; locale: Locale }) {
  // The page re-renders every 10 s: only a real change of markers moves the map.
  const key = markers.map((m) => m.id).join(',');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stable = useMemo(() => markers, [key]);
  return <PatientMap markers={stable} locale={locale} label={label} center={centre} zoom={11} fitToMarkers className="h-72 sm:h-96" />;
}
