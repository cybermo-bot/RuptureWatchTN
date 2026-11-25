'use client';

// Pharmacies open near the patient (track C).
//
// - Google map showing: the search runs in the browser, through the Maps JavaScript API's Places
//   library (Place.searchNearby around the position, Place.searchByText inside a governorate's
//   outline), with the browser key restricted to our domains. The position goes only to Google.
//   Results stay in this component's memory: never stored, cached, logged or sent to our server
//   (CLAUDE.md rules 3 and 13).
// - OpenStreetMap fallback showing: the whole OpenStreetMap list is fetched from our server
//   (no position in the request) and sorted by distance here, on the phone.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PatientMap, type LatLng, type MapMarker, type MapProvider } from '@/components/maps/PatientMap';
import { Ltr } from '@/components/public/Ltr';
import { distanceMetres, nearest } from '@/lib/directory/geo';
import {
  fromGooglePlace,
  fromOsmPharmacy,
  GOOGLE_FIELDS,
  telHref,
  zoomFor,
  type DirectoryEntry,
  type GooglePlaceLike,
} from '@/lib/directory/entries';
import {
  isAlwaysOpen,
  isOpenAt,
  passesFilters,
  todayRanges,
  tunisWeekMinute,
  type HoursFilter,
} from '@/lib/directory/hours';
import { parseOsmFile, type OsmFile } from '@/lib/directory/osm';
import { translator, type Locale } from '@/lib/i18n';

const NO_PHARMACY_PINS: MapMarker[] = [];

export interface Area {
  code: string;
  name: string;
  centre: LatLng;
  bounds: { south: number; west: number; north: number; east: number };
}

type Origin = { kind: 'position'; point: LatLng } | { kind: 'area'; code: string };

type Results =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'osm_unavailable' }
  | { status: 'done'; source: MapProvider; origin: Origin; entries: DirectoryEntry[]; centred: boolean };

const RADIUS_M = 3000;
const MAX_RESULTS = 20;
const FILTERS: HoursFilter[] = ['now', 'tonight', 'weekend'];
const TUNISIA: LatLng = { lat: 34.2, lng: 9.6 };

let osmCache: Promise<OsmFile | null> | null = null;
function loadOsm(): Promise<OsmFile | null> {
  osmCache ??= fetch('/api/places/osm')
    .then(async (res) => (res.ok ? parseOsmFile(await res.json()) : null))
    .catch(() => {
      osmCache = null;
      return null;
    });
  return osmCache;
}

async function searchGoogle(origin: Origin, areas: Area[], locale: Locale): Promise<DirectoryEntry[]> {
  const { Place } = (await google.maps.importLibrary('places')) as google.maps.PlacesLibrary;
  const common = { fields: [...GOOGLE_FIELDS], maxResultCount: MAX_RESULTS, language: locale, region: 'tn' };
  let places: google.maps.places.Place[];
  if (origin.kind === 'position') {
    ({ places } = await Place.searchNearby({
      ...common,
      locationRestriction: { center: origin.point, radius: RADIUS_M },
      includedPrimaryTypes: ['pharmacy'],
      rankPreference: 'DISTANCE',
    }));
  } else {
    const area = areas.find((a) => a.code === origin.code);
    if (!area) return [];
    ({ places } = await Place.searchByText({
      ...common,
      textQuery: locale === 'ar' ? 'صيدلية' : 'pharmacie',
      includedType: 'pharmacy',
      useStrictTypeFiltering: true,
      locationRestriction: area.bounds,
    }));
  }
  return places
    .map((p) => fromGooglePlace(p as unknown as GooglePlaceLike))
    .filter((e): e is DirectoryEntry => e !== null)
    .map((e) => (origin.kind === 'position' ? { ...e, distance: distanceMetres(origin.point, e) } : e));
}

function searchOsm(file: OsmFile, origin: Origin, areas: Area[], locale: Locale): { entries: DirectoryEntry[]; centred: boolean } {
  if (origin.kind === 'position') {
    return { entries: nearest(file.pharmacies, origin.point, MAX_RESULTS).map((p) => ({ ...fromOsmPharmacy(p, locale), distance: p.distance })), centred: false };
  }
  const inArea = file.pharmacies.filter((p) => p.gov === origin.code);
  const centre = file.centres[origin.code] ?? areas.find((a) => a.code === origin.code)?.centre ?? TUNISIA;
  return {
    entries: nearest(inArea, centre, MAX_RESULTS).map((p) => ({ ...fromOsmPharmacy(p, locale), distance: p.distance })),
    centred: inArea.length > MAX_RESULTS,
  };
}

export function PharmacyFinder({ locale, areas }: { locale: Locale; areas: Area[] }) {
  const t = useMemo(() => translator(locale), [locale]);
  const [provider, setProvider] = useState<MapProvider | null>(null);
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [results, setResults] = useState<Results>({ status: 'idle' });
  const [filters, setFilters] = useState<Set<HoursFilter>>(new Set());
  const [osmDate, setOsmDate] = useState<string | null>(null);
  const [now, setNow] = useState(() => tunisWeekMinute(new Date()));
  const [mapView, setMapView] = useState<{ key: string; center: LatLng; zoom: number }>({ key: 'tn', center: TUNISIA, zoom: 6 });

  useEffect(() => {
    const timer = setInterval(() => setNow(tunisWeekMinute(new Date())), 60_000);
    return () => clearInterval(timer);
  }, []);

  // The search runs from the visitor's actions (and again if the map changes provider).
  const providerRef = useRef<MapProvider | null>(null);
  const originRef = useRef<Origin | null>(null);
  const searchId = useRef(0);

  const run = useCallback(
    async (o: Origin, p: MapProvider) => {
      const id = ++searchId.current;
      const current = () => id === searchId.current;
      setResults({ status: 'loading' });
      try {
        if (p === 'google') {
          const entries = await searchGoogle(o, areas, locale);
          if (current()) setResults({ status: 'done', source: 'google', origin: o, entries, centred: false });
          return;
        }
        const file = await loadOsm();
        if (!current()) return;
        if (!file) return setResults({ status: 'osm_unavailable' });
        setOsmDate(file.fetchedAt);
        const { entries, centred } = searchOsm(file, o, areas, locale);
        setResults({ status: 'done', source: 'osm', origin: o, entries, centred });
      } catch {
        if (current()) setResults({ status: 'error' });
      }
    },
    [areas, locale],
  );

  const search = useCallback(
    (o: Origin) => {
      originRef.current = o;
      setOrigin(o);
      if (providerRef.current) void run(o, providerRef.current);
    },
    [run],
  );

  const onPosition = useCallback((point: LatLng) => search({ kind: 'position', point }), [search]);

  // Google content may only appear with the Google map: when the provider changes, search again
  // with the map now showing (or clear the list).
  const onProvider = useCallback(
    (p: MapProvider) => {
      const changed = providerRef.current !== p;
      providerRef.current = p;
      setProvider(p);
      if (!changed) return;
      if (originRef.current) void run(originRef.current, p);
      else setResults({ status: 'idle' });
    },
    [run],
  );

  const chooseArea = (code: string) => {
    const area = areas.find((a) => a.code === code);
    if (!area) return;
    setMapView({ key: code, center: area.centre, zoom: zoomFor(area.bounds) });
    search({ kind: 'area', code });
  };

  const toggle = (f: HoursFilter) =>
    setFilters((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });

  const done = results.status === 'done' ? results : null;
  const visible = useMemo(
    () => (done ? done.entries.filter((e) => passesFilters(e.hours, filters, now, e.nowHours)) : []),
    [done, filters, now],
  );

  const formatNumber = (n: number, digits: number) =>
    new Intl.NumberFormat(locale === 'ar' ? 'ar-TN' : 'fr-TN', { maximumFractionDigits: digits }).format(n);
  const distanceText = (m: number) =>
    m < 1000
      ? t('directory.list.distanceM', { n: formatNumber(Math.round(m / 10) * 10, 0) })
      : t('directory.list.distanceKm', { n: formatNumber(m / 1000, 1) });

  const areaName = (code: string) => areas.find((a) => a.code === code)?.name ?? code;
  const summary = (() => {
    if (!done) return null;
    const count = done.entries.length;
    if (done.origin.kind === 'position') return t('directory.list.aroundYou', { count });
    const name = areaName(done.origin.code);
    return done.centred
      ? t('directory.list.aroundGovernorateCentre', { count, name })
      : t('directory.list.aroundGovernorate', { count, name });
  })();

  const selectId = 'directory-area';

  return (
    <div className="flex flex-col gap-6" data-provider={provider ?? 'loading'}>
      {provider ? (
        <p className="border-s-2 border-line ps-3 text-ink">
          {provider === 'google' ? t('directory.source.google') : t('directory.source.osm')}
        </p>
      ) : null}

      <PatientMap
        key={mapView.key}
        markers={NO_PHARMACY_PINS}
        locale={locale}
        label={t('directory.list.mapLabel')}
        center={mapView.center}
        zoom={mapView.zoom}
        onPosition={onPosition}
        onProvider={onProvider}
      />
      <p className="-mt-3 text-sm text-ink-muted">{t('directory.where.positionHint')}</p>

      <div className="flex flex-col gap-2">
        <label htmlFor={selectId} className="font-medium text-ink">
          {t('directory.where.or')}
        </label>
        <select
          id={selectId}
          value={origin?.kind === 'area' ? origin.code : ''}
          onChange={(e) => chooseArea(e.target.value)}
          disabled={!provider}
          className="min-h-12 w-full max-w-sm rounded-md border border-line bg-surface px-3 text-ink disabled:opacity-50"
        >
          <option value="" disabled>
            {t('directory.where.choose')}
          </option>
          {areas.map((a) => (
            <option key={a.code} value={a.code}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="pb-2 font-medium text-ink">{t('directory.filters.legend')}</legend>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filters.has(f)}
              onClick={() => toggle(f)}
              className="inline-flex min-h-12 items-center gap-2 rounded-md border border-line px-4 text-ink aria-pressed:border-brand aria-pressed:bg-surface-subtle aria-pressed:font-medium"
            >
              <span aria-hidden="true" className="inline-block w-3 text-brand">
                {filters.has(f) ? '\u2713' : ''}
              </span>
              {t(`directory.filters.${f}`)}
            </button>
          ))}
        </div>
        <p className="text-sm text-ink-muted">{t('directory.filters.weekendHint')}</p>
      </fieldset>

      <section aria-labelledby="directory-list" aria-busy={results.status === 'loading'} className="flex flex-col gap-3">
        <h2 id="directory-list" className="text-lg font-semibold text-ink">
          {t('directory.list.heading')}
        </h2>
        <div aria-live="polite" className="flex flex-col gap-1 text-ink-muted">
          {results.status === 'idle' ? <p>{t('directory.list.start')}</p> : null}
          {results.status === 'loading' ? <p>{t('directory.list.loading')}</p> : null}
          {results.status === 'error' ? <p className="text-ink">{t('directory.list.error')}</p> : null}
          {summary ? <p>{summary}</p> : null}
          {done && filters.size > 0 && done.entries.length > 0 ? (
            <p>{t('directory.list.shown', { shown: visible.length, total: done.entries.length })}</p>
          ) : null}
        </div>

        {results.status === 'osm_unavailable' ? (
          <div className="border-y border-line py-8">
            <p className="font-medium text-ink">{t('directory.osm.unavailableTitle')}</p>
            <p className="max-w-prose text-ink-muted">{t('directory.osm.unavailableBody')}</p>
          </div>
        ) : null}

        {done && done.entries.length === 0 ? (
          <div className="border-y border-line py-8">
            <p className="font-medium text-ink">{t('directory.list.none')}</p>
            <p className="text-ink-muted">{t('directory.list.noneBody')}</p>
          </div>
        ) : null}

        {done && done.entries.length > 0 && visible.length === 0 ? (
          <div className="flex flex-col items-start gap-3 border-y border-line py-8">
            <p className="text-ink">{t('directory.list.noMatch')}</p>
            <button
              type="button"
              onClick={() => setFilters(new Set())}
              className="min-h-12 rounded-md border border-brand px-4 font-medium text-brand hover:bg-surface-subtle"
            >
              {t('directory.filters.clear')}
            </button>
          </div>
        ) : null}

        {visible.length > 0 ? (
          <ul className="hairline-list border-y border-line">
            {visible.map((e) => {
              const ranges = todayRanges(e.nowHours, now);
              const tel = e.phone ? telHref(e.phone) : null;
              return (
                <li key={e.id} className="flex flex-col gap-1 py-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                    <span className="font-medium text-ink">{e.name ?? t('directory.list.unnamed')}</span>
                    {e.distance !== undefined && done?.origin.kind === 'position' ? (
                      <span className="text-sm text-ink-muted">{distanceText(e.distance)}</span>
                    ) : null}
                  </div>
                  {e.address ? <span className="text-sm text-ink-muted">{e.address}</span> : null}
                  {e.nowHours === null ? (
                    <span className="text-sm text-ink-muted">{t('directory.list.noHours')}</span>
                  ) : (
                    <span className="text-sm text-ink">
                      <span className="font-medium">
                        {isOpenAt(e.nowHours, now) ? t('directory.list.openNow') : t('directory.list.closedNow')}
                      </span>
                      {' · '}
                      {isAlwaysOpen(e.nowHours) ? (
                        t('directory.list.alwaysOpen')
                      ) : ranges.length > 0 ? (
                        <>
                          {t('directory.list.today')} <Ltr>{ranges.join(', ')}</Ltr>
                        </>
                      ) : (
                        t('directory.list.closedToday')
                      )}
                    </span>
                  )}
                  <div className="flex flex-wrap gap-x-6 pt-1">
                    {tel ? (
                      <a href={tel} className="inline-flex min-h-12 items-center font-medium">
                        {t('directory.list.call')} <Ltr className="ms-2 font-normal text-ink-muted">{e.phone}</Ltr>
                      </a>
                    ) : null}
                    <a href={e.directionsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center font-medium">
                      {t('directory.list.directions')}
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}

        {done?.source === 'osm' ? (
          <div className="flex flex-col gap-1 text-sm text-ink-muted">
            {osmDate ? (
              <p>
                {t('directory.source.osmHours', {
                  date: new Intl.DateTimeFormat(locale === 'ar' ? 'ar-TN' : 'fr-FR', { dateStyle: 'long', timeZone: 'Africa/Tunis' }).format(new Date(osmDate)),
                })}
              </p>
            ) : null}
            <p>
              <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
                {t('directory.source.osmAttribution')}
              </a>
              {' · '}
              {t('directory.source.osmLicence')}
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
