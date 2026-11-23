// The OpenStreetMap pharmacy list used when Google Maps is unavailable (CLAUDE.md, stack).
// Produced by scripts/export-osm-pharmacies.ts as data/reference/osm-pharmacies.json, served by
// /api/places/osm, sorted by distance on the phone. ODbL 1.0, attribution "© OpenStreetMap".

import type { WeekInterval } from './hours';

export interface OsmPharmacy {
  /** "node/123", "way/456": the OpenStreetMap element. */
  id: string;
  name: string | null;
  nameAr: string | null;
  lat: number;
  lng: number;
  /** ISO 3166-2:TN code of the governorate the point falls in, or null near a border. */
  gov: string | null;
  address: string | null;
  phone: string | null;
  /** The opening_hours tag as written in OpenStreetMap. */
  hoursRaw: string | null;
  /** The regular week computed from hoursRaw at export time; null when absent or unreadable. */
  hours: WeekInterval[] | null;
}

export interface OsmFile {
  source: string;
  licence: string;
  attribution: string;
  /** ISO time of the Overpass query. */
  fetchedAt: string;
  /** Sunday of the week used to turn opening_hours into a regular week. */
  referenceWeek: string;
  counts: { pharmacies: number; withHours: number; hoursRead: number; holidayRulesIgnored: number };
  /** Mean position of the pharmacies of each governorate: where the list centres when it is picked. */
  centres: Record<string, { lat: number; lng: number; pharmacies: number }>;
  pharmacies: OsmPharmacy[];
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const strOrNull = (v: unknown) => v === null || typeof v === 'string';

/** Checks the file's shape before the page trusts it. Returns null when it is not a valid export. */
export function parseOsmFile(value: unknown): OsmFile | null {
  if (!value || typeof value !== 'object') return null;
  const f = value as Partial<OsmFile>;
  if (typeof f.fetchedAt !== 'string' || !Array.isArray(f.pharmacies) || !f.centres) return null;
  for (const p of f.pharmacies) {
    if (!p || typeof p.id !== 'string' || !isNum(p.lat) || !isNum(p.lng)) return null;
    if (!strOrNull(p.name) || !strOrNull(p.address) || !strOrNull(p.phone) || !strOrNull(p.gov)) return null;
    if (p.hours !== null && !(Array.isArray(p.hours) && p.hours.every((iv) => Array.isArray(iv) && iv.length === 2 && iv.every(isNum)))) {
      return null;
    }
  }
  return f as OsmFile;
}
