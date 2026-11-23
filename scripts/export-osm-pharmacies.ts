// Exports the pharmacies of Tunisia from OpenStreetMap, for the directory's fallback list
// (used only when Google Maps is unavailable, CLAUDE.md rule 13).
//
//   npm run osm:export                       one Overpass query, saves the raw answer, builds the list
//   npm run osm:export -- --from <raw.json>  rebuilds the list from a raw answer already saved
//
// Writes data/raw/osm/overpass-pharmacies-<date>.json (the answer as received) and
// data/reference/osm-pharmacies.json (name, position, governorate, address, phone, the raw
// opening_hours tag and the regular week computed from it). Record the date in data/SOURCES.md.
// Licence: ODbL 1.0, © OpenStreetMap contributors. Attribution is shown under the list.

process.env.TZ = 'Africa/Tunis';

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import OpeningHours from 'opening_hours';
import { polygonsOf } from '../lib/directory/geo';
import type { OsmFile, OsmPharmacy } from '../lib/directory/osm';
import {
  centresOf,
  nextSunday,
  OVERPASS_QUERY,
  toPharmacy,
  weekFromOpeningHours,
  type GovernorateShape,
  type OpeningHoursCtor,
  type OverpassElement,
} from './lib/osm-pharmacies';
import { ROOT } from './lib/script-env';

// The main Overpass instance first, then two public mirrors (https://wiki.openstreetmap.org/wiki/Overpass_API#Public_Overpass_API_instances).
const OVERPASS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];
const BOUNDARIES = join(ROOT, 'data/raw/geoboundaries/geoBoundaries-TUN-ADM1_simplified.geojson');
const OUT = join(ROOT, 'data/reference/osm-pharmacies.json');

async function query(url: string): Promise<string> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'RuptureWatchTN student prototype (AOTN TSYP 14), one export',
    },
    body: new URLSearchParams({ data: OVERPASS_QUERY }).toString(),
    signal: AbortSignal.timeout(240_000),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const text = await res.text();
  if (!text.trimStart().startsWith('{')) throw new Error('the answer is not JSON (server busy?)');
  return text;
}

async function fetchRaw(): Promise<{ text: string; fetchedAt: Date; saved: string }> {
  const fetchedAt = new Date();
  let text: string | null = null;
  for (const url of OVERPASS) {
    console.log(`Querying ${url} …`);
    try {
      text = await query(url);
      break;
    } catch (error) {
      const cause = error instanceof Error && error.cause instanceof Error ? ` (${error.cause.message})` : '';
      console.log(`  failed: ${error instanceof Error ? error.message : String(error)}${cause}`);
    }
  }
  if (text === null) throw new Error('Every Overpass server failed. Try again in a few minutes.');
  const dir = join(ROOT, 'data/raw/osm');
  mkdirSync(dir, { recursive: true });
  const saved = join(dir, `overpass-pharmacies-${fetchedAt.toISOString().slice(0, 10)}.json`);
  writeFileSync(saved, text);
  return { text, fetchedAt, saved };
}

async function main() {
  const fromIndex = process.argv.indexOf('--from');
  const raw =
    fromIndex > 0
      ? (() => {
          const file = process.argv[fromIndex + 1];
          if (!file) throw new Error('--from needs a file');
          const body = JSON.parse(readFileSync(file, 'utf8')) as { osm3s?: { timestamp_osm_base?: string } };
          const stamp = body.osm3s?.timestamp_osm_base;
          return { text: readFileSync(file, 'utf8'), fetchedAt: stamp ? new Date(stamp) : new Date(), saved: file };
        })()
      : await fetchRaw();

  const body = JSON.parse(raw.text) as { elements?: OverpassElement[] };
  if (!Array.isArray(body.elements)) throw new Error('Unexpected Overpass answer: no "elements".');

  const shapes: GovernorateShape[] = (
    JSON.parse(readFileSync(BOUNDARIES, 'utf8')) as {
      features: { properties: { shapeISO: string }; geometry: { type: string; coordinates: unknown } }[];
    }
  ).features.map((f) => ({ code: f.properties.shapeISO, polygons: polygonsOf(f.geometry) }));

  const sunday = nextSunday(raw.fetchedAt);
  const week = (value: string) => weekFromOpeningHours(value, OpeningHours as unknown as OpeningHoursCtor, sunday);

  // The library prints its own warnings for values it cannot read; we count them instead.
  const consoleError = console.error;
  const consoleWarn = console.warn;
  console.error = () => {};
  console.warn = () => {};
  const pharmacies: OsmPharmacy[] = [];
  let holidayRulesIgnored = 0;
  try {
    for (const el of body.elements) {
      const r = toPharmacy(el, shapes, week);
      if (!r) continue;
      pharmacies.push(r.pharmacy);
      if (r.holidayRulesIgnored) holidayRulesIgnored += 1;
    }
  } finally {
    console.error = consoleError;
    console.warn = consoleWarn;
  }
  pharmacies.sort((a, b) => a.id.localeCompare(b.id));

  const file: OsmFile = {
    source: 'OpenStreetMap, Overpass API (amenity=pharmacy in Tunisia)',
    licence: 'ODbL 1.0',
    attribution: '© OpenStreetMap contributors',
    fetchedAt: raw.fetchedAt.toISOString(),
    referenceWeek: `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`,
    counts: {
      pharmacies: pharmacies.length,
      withHours: pharmacies.filter((p) => p.hoursRaw).length,
      hoursRead: pharmacies.filter((p) => p.hours).length,
      holidayRulesIgnored,
    },
    centres: centresOf(pharmacies),
    pharmacies,
  };
  const json = JSON.stringify(file);
  writeFileSync(OUT, `${json}\n`);

  const sha = createHash('sha256').update(raw.text).digest('hex');
  console.log(`Raw answer: ${relative(ROOT, raw.saved)} (${Buffer.byteLength(raw.text)} bytes, SHA-256 ${sha})`);
  console.log(`Wrote ${relative(ROOT, OUT)}: ${json.length} bytes`);
  console.log(
    `${file.counts.pharmacies} pharmacies, ${file.counts.withHours} with opening_hours, ${file.counts.hoursRead} read, ` +
      `${file.counts.holidayRulesIgnored} with holiday rules ignored, ${pharmacies.filter((p) => !p.gov).length} outside every governorate outline.`,
  );
  console.log(`Data timestamp: ${file.fetchedAt}. Reference week from Sunday ${file.referenceWeek}.`);
  console.log('Record the date and SHA-256 in data/SOURCES.md (OpenStreetMap section).');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
