// Pure parts of the OpenStreetMap pharmacy export, unit tested in tests/osm-export.test.ts.

import { normalise, WEEK, type WeekInterval } from '../../lib/directory/hours';
import { inPolygon, round5, type Polygon } from '../../lib/directory/geo';
import type { OsmFile, OsmPharmacy } from '../../lib/directory/osm';

/** Every pharmacy in Tunisia, with a centre point for ways and relations. */
export const OVERPASS_QUERY = `[out:json][timeout:180];
area["ISO3166-1"="TN"][admin_level=2]->.tn;
nwr["amenity"="pharmacy"](area.tn);
out center tags;`;

export interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

/** A constructor with the opening_hours.js interface we use. */
export type OpeningHoursCtor = new (
  value: string,
  nominatim: object | null,
  options: object,
) => { getOpenIntervals(from: Date, to: Date): [Date, Date, boolean, string | undefined][] };

/** Drops the rules about public and school holidays: the library has no Tunisian calendar. */
export function withoutHolidayRules(raw: string): string | null {
  const kept = raw
    .split(';')
    .map((r) => r.trim())
    .filter((r) => r && !/\b(PH|SH)\b/.test(r));
  return kept.length ? kept.join('; ') : null;
}

/**
 * Turns an opening_hours value into a regular week, by evaluating it over the reference week
 * (Sunday 00:00 to Sunday 00:00, in the time zone of the process: set TZ=Africa/Tunis).
 * Intervals marked "unknown" by the library count as closed.
 */
export function weekFromOpeningHours(
  raw: string,
  OH: OpeningHoursCtor,
  referenceSunday: Date,
): { hours: WeekInterval[] | null; holidayRulesIgnored: boolean } {
  const to = new Date(referenceSunday.getTime() + WEEK * 60_000);
  const evaluate = (value: string) =>
    new OH(value, { lat: 36.8, lon: 10.18, address: { country_code: 'tn', state: '' } }, { mode: 0, tag_key: 'opening_hours' })
      .getOpenIntervals(referenceSunday, to)
      .filter(([, , unknown]) => !unknown)
      .map(([a, b]): WeekInterval => [
        Math.round((a.getTime() - referenceSunday.getTime()) / 60_000),
        Math.round((b.getTime() - referenceSunday.getTime()) / 60_000),
      ]);
  try {
    return { hours: normalise(evaluate(raw)), holidayRulesIgnored: false };
  } catch {
    const stripped = withoutHolidayRules(raw);
    if (stripped === null || stripped === raw) return { hours: null, holidayRulesIgnored: false };
    try {
      return { hours: normalise(evaluate(stripped)), holidayRulesIgnored: true };
    } catch {
      return { hours: null, holidayRulesIgnored: false };
    }
  }
}

const clean = (v: string | undefined) => {
  const s = v?.replace(/\s+/g, ' ').trim();
  return s ? s : null;
};

export function addressOf(tags: Record<string, string>): string | null {
  const street = [clean(tags['addr:housenumber']), clean(tags['addr:street'])].filter(Boolean).join(' ');
  const parts = [street || null, clean(tags['addr:city'] ?? tags['addr:place'])].filter(Boolean);
  return parts.length ? parts.join(', ') : clean(tags['addr:full']);
}

export interface GovernorateShape {
  code: string;
  polygons: Polygon[];
}

export function governorateOf(p: { lat: number; lng: number }, shapes: readonly GovernorateShape[]): string | null {
  return shapes.find((s) => s.polygons.some((poly) => inPolygon(p, poly)))?.code ?? null;
}

export function toPharmacy(
  el: OverpassElement,
  shapes: readonly GovernorateShape[],
  week: (raw: string) => { hours: WeekInterval[] | null; holidayRulesIgnored: boolean },
): { pharmacy: OsmPharmacy; holidayRulesIgnored: boolean } | null {
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  const tags = el.tags ?? {};
  const hoursRaw = clean(tags.opening_hours);
  const computed = hoursRaw ? week(hoursRaw) : { hours: null, holidayRulesIgnored: false };
  const point = { lat: round5(lat), lng: round5(lng) };
  return {
    pharmacy: {
      id: `${el.type}/${el.id}`,
      name: clean(tags['name:fr']) ?? clean(tags.name),
      nameAr: clean(tags['name:ar']),
      ...point,
      gov: governorateOf(point, shapes),
      address: addressOf(tags),
      phone: clean(tags.phone ?? tags['contact:phone']),
      hoursRaw,
      hours: computed.hours,
    },
    holidayRulesIgnored: computed.holidayRulesIgnored,
  };
}

/** Mean position of each governorate's pharmacies. */
export function centresOf(pharmacies: readonly OsmPharmacy[]): OsmFile['centres'] {
  const sums = new Map<string, { lat: number; lng: number; n: number }>();
  for (const p of pharmacies) {
    if (!p.gov) continue;
    const s = sums.get(p.gov) ?? { lat: 0, lng: 0, n: 0 };
    s.lat += p.lat;
    s.lng += p.lng;
    s.n += 1;
    sums.set(p.gov, s);
  }
  return Object.fromEntries(
    [...sums.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([code, s]) => [code, { lat: round5(s.lat / s.n), lng: round5(s.lng / s.n), pharmacies: s.n }]),
  );
}

/** The Sunday (00:00 local time) after `date`. */
export function nextSunday(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + (7 - d.getDay()));
  return d;
}
