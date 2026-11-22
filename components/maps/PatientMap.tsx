'use client';

// The one patient map, shared by tracks B (pharmacies that answered "disponible") and
// C (pharmacies open near the patient).
//
// - With NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: Google Maps JavaScript API, with Google's own logo
//   and attribution, which the API draws and which must stay visible.
// - Without the key, if the script fails, times out, or Google refuses the key: Leaflet with
//   OpenStreetMap tiles and the OpenStreetMap attribution, same props, and a "carte de
//   secours" note.
// - Rule 13: Google Places results may only be shown on the Google map. onProvider tells the
//   page which map is showing, so it can hide Google content when the fallback is in use.
// - "Près de moi" asks the browser for the position only when tapped. The position stays on
//   the device: it moves the map and is handed to onPosition, nothing else. Our server only
//   ever receives a governorate or a delegation (or, for track C's live search, a position
//   it never stores or logs).
// - The map is a picture: pages must also list the same places as text.

import 'leaflet/dist/leaflet.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import { translator, type Locale } from '@/lib/i18n';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface MapMarker extends LatLng {
  id: string;
  /** Shown on hover and in the marker's popup, as plain text. */
  label: string;
  detail?: string;
}

export type MapProvider = 'google' | 'osm';

interface PatientMapProps {
  markers: MapMarker[];
  locale: Locale;
  /** Accessible name of the map. */
  label: string;
  center?: LatLng;
  zoom?: number;
  /** Show the "Près de moi" button. */
  nearMe?: boolean;
  onPosition?: (position: LatLng) => void;
  onProvider?: (provider: MapProvider) => void;
  className?: string;
}

// Centre of Tunisia, zoomed to show the whole country on a phone.
const TUNISIA: LatLng = { lat: 34.2, lng: 9.6 };
const GOOGLE_TIMEOUT_MS = 8000;
const BRAND = '#0E6B57';
const INK = '#10201B';

type Status = 'loading' | MapProvider;

interface MapHandle {
  setMarkers(markers: MapMarker[]): void;
  showPosition(p: LatLng, label: string): void;
  destroy(): void;
}

declare global {
  interface Window {
    gm_authFailure?: () => void;
    __rwGoogleMapsReady?: () => void;
  }
}

function popupNode(marker: MapMarker): HTMLElement {
  // Built with textContent: labels come from data and are never parsed as HTML.
  const box = document.createElement('div');
  const title = document.createElement('strong');
  title.textContent = marker.label;
  box.appendChild(title);
  if (marker.detail) {
    const detail = document.createElement('div');
    detail.textContent = marker.detail;
    box.appendChild(detail);
  }
  return box;
}

let googleScript: Promise<void> | null = null;

function loadGoogle(key: string, locale: Locale): Promise<void> {
  if (typeof google !== 'undefined' && typeof google.maps?.importLibrary === 'function') return Promise.resolve();
  if (googleScript) return googleScript;
  googleScript = new Promise<void>((resolve, reject) => {
    window.__rwGoogleMapsReady = () => resolve();
    const s = document.createElement('script');
    const params = new URLSearchParams({
      key,
      v: 'weekly',
      loading: 'async',
      callback: '__rwGoogleMapsReady',
      language: locale,
      region: 'TN',
    });
    s.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    s.async = true;
    s.onerror = () => reject(new Error('Google Maps script failed to load'));
    document.head.appendChild(s);
  }).catch((error: unknown) => {
    googleScript = null;
    throw error;
  });
  return googleScript;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);
}

async function createGoogleMap(el: HTMLElement, center: LatLng, zoom: number, mapId: string): Promise<MapHandle> {
  const { Map, InfoWindow } = (await google.maps.importLibrary('maps')) as google.maps.MapsLibrary;
  const { AdvancedMarkerElement, PinElement } = (await google.maps.importLibrary('marker')) as google.maps.MarkerLibrary;
  const map = new Map(el, {
    center,
    zoom,
    mapId,
    clickableIcons: false,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: false,
    gestureHandling: 'cooperative',
  });
  const info = new InfoWindow();
  let pins: google.maps.marker.AdvancedMarkerElement[] = [];
  let you: google.maps.marker.AdvancedMarkerElement | null = null;
  return {
    setMarkers(markers) {
      for (const p of pins) p.map = null;
      pins = markers.map((m) => {
        const pin = new PinElement({ background: BRAND, borderColor: INK, glyphColor: '#FFFFFF' });
        const marker = new AdvancedMarkerElement({ map, position: m, title: m.label, content: pin.element, gmpClickable: true });
        marker.addListener('click', () => {
          info.setContent(popupNode(m));
          info.open({ map, anchor: marker });
        });
        return marker;
      });
    },
    showPosition(p, label) {
      if (you) you.map = null;
      const dot = document.createElement('div');
      dot.style.cssText = `width:16px;height:16px;border-radius:50%;background:#fff;border:4px solid ${INK}`;
      you = new AdvancedMarkerElement({ map, position: p, title: label, content: dot });
      map.panTo(p);
      map.setZoom(Math.max(map.getZoom() ?? 0, 14));
    },
    destroy() {
      for (const p of pins) p.map = null;
      if (you) you.map = null;
    },
  };
}

async function createOsmMap(el: HTMLElement, center: LatLng, zoom: number): Promise<MapHandle> {
  const L = (await import('leaflet')).default;
  const map = L.map(el, { center: [center.lat, center.lng], zoom, scrollWheelZoom: false });
  map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);
  const layer = L.layerGroup().addTo(map);
  let you: L.CircleMarker | null = null;
  return {
    setMarkers(markers) {
      layer.clearLayers();
      for (const m of markers) {
        L.circleMarker([m.lat, m.lng], { radius: 9, color: INK, weight: 2, fillColor: BRAND, fillOpacity: 0.9 })
          .bindTooltip(m.label)
          .bindPopup(popupNode(m))
          .addTo(layer);
      }
    },
    showPosition(p, label) {
      you?.remove();
      you = L.circleMarker([p.lat, p.lng], { radius: 7, color: INK, weight: 4, fillColor: '#FFFFFF', fillOpacity: 1 })
        .bindTooltip(label)
        .addTo(map);
      map.setView([p.lat, p.lng], Math.max(map.getZoom(), 14));
    },
    destroy() {
      map.remove();
    },
  };
}

export function PatientMap({
  markers,
  locale,
  label,
  center = TUNISIA,
  zoom = 6,
  nearMe = true,
  onPosition,
  onProvider,
  className = 'h-80 sm:h-96',
}: PatientMapProps) {
  const t = translator(locale);
  const container = useRef<HTMLDivElement>(null);
  const handle = useRef<MapHandle | null>(null);
  const markersRef = useRef(markers);
  const [status, setStatus] = useState<Status>('loading');
  const [positionMessage, setPositionMessage] = useState<string | null>(null);

  // Create the map once: Google if possible, otherwise OpenStreetMap.
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    let cancelled = false;
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';

    const startOsm = async () => {
      if (cancelled) return;
      handle.current?.destroy();
      el.replaceChildren();
      const h = await createOsmMap(el, center, zoom);
      if (cancelled) return h.destroy();
      handle.current = h;
      h.setMarkers(markersRef.current);
      setStatus('osm');
      onProvider?.('osm');
    };

    (async () => {
      if (!key) return startOsm();
      try {
        // Google calls this when it refuses the key (wrong referrer, quota, billing).
        window.gm_authFailure = () => void startOsm();
        await withTimeout(loadGoogle(key, locale), GOOGLE_TIMEOUT_MS);
        const h = await createGoogleMap(el, center, zoom, mapId);
        if (cancelled) return h.destroy();
        handle.current = h;
        h.setMarkers(markersRef.current);
        setStatus('google');
        onProvider?.('google');
      } catch {
        await startOsm();
      }
    })();

    return () => {
      cancelled = true;
      handle.current?.destroy();
      handle.current = null;
    };
    // Created once per mount; markers are updated by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    markersRef.current = markers;
    handle.current?.setMarkers(markers);
  }, [markers]);

  const locate = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setPositionMessage(t('public.map.positionUnavailable'));
      return;
    }
    setPositionMessage(t('public.map.locating'));
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const p = { lat: coords.latitude, lng: coords.longitude };
        handle.current?.showPosition(p, t('public.map.you'));
        setPositionMessage(t('public.map.positionNote'));
        onPosition?.(p);
      },
      (error) =>
        setPositionMessage(
          error.code === error.PERMISSION_DENIED ? t('public.map.positionDenied') : t('public.map.positionUnavailable'),
        ),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  }, [onPosition, t]);

  return (
    <div className="flex flex-col gap-3">
      {nearMe ? (
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={locate}
            disabled={status === 'loading'}
            className="inline-flex min-h-12 w-fit items-center rounded-md border border-brand px-4 font-medium text-brand hover:bg-surface-subtle disabled:opacity-50"
          >
            {t('public.map.nearMe')}
          </button>
          <p aria-live="polite" className="text-sm text-ink-muted">
            {positionMessage}
          </p>
        </div>
      ) : null}
      <div className="relative">
        {/* Maps draw left to right whatever the page direction. */}
        <div
          ref={container}
          dir="ltr"
          role="region"
          aria-label={label}
          data-provider={status}
          className={`w-full overflow-hidden rounded-md border border-line bg-surface-subtle ${className}`}
        />
        {status === 'loading' ? (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-ink-muted">{t('public.map.loading')}</p>
        ) : null}
      </div>
      {status === 'osm' ? <p className="text-sm text-ink-muted">{t('public.map.fallbackNote')}</p> : null}
    </div>
  );
}
