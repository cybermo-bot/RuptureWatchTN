// Builds data/reference/governorate-areas.json for the pharmacy directory: for each governorate,
// its French and Arabic names (from the governorates table's migration), the centre used when a
// visitor picks it from the list instead of "Près de moi", and its bounding box.
//
//   npm run directory:areas
//
// Source: the geoBoundaries Tunisia ADM1 file (ODbL 1.0, © OpenStreetMap contributors, via
// geoBoundaries), see data/SOURCES.md. The centre is the area-weighted centroid of the outline.

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { bounds, centroid, polygonsOf, round5 } from '../lib/directory/geo';
import { ROOT } from './lib/script-env';

const SOURCE = join(ROOT, 'data/raw/geoboundaries/geoBoundaries-TUN-ADM1_simplified.geojson');
const MIGRATION = join(ROOT, 'supabase/migrations/20261121000200_reference_data.sql');
const OUT = join(ROOT, 'data/reference/governorate-areas.json');

interface Feature {
  properties: { shapeISO: string };
  geometry: { type: string; coordinates: unknown };
}

const names = new Map(
  [...readFileSync(MIGRATION, 'utf8').matchAll(/\('(TN-\d{2})', '([^']+)', '([^']+)'\)/g)].map((m) => [
    m[1],
    { nameFr: m[2], nameAr: m[3] },
  ]),
);
if (names.size !== 24) throw new Error(`Expected 24 governorates in the migration, found ${names.size}`);

const features = (JSON.parse(readFileSync(SOURCE, 'utf8')) as { features: Feature[] }).features;

const governorates = features
  .map((f) => {
    const code = f.properties.shapeISO;
    const name = names.get(code);
    if (!name) throw new Error(`Unknown governorate code in the boundary file: ${code}`);
    const polygons = polygonsOf(f.geometry);
    const c = centroid(polygons);
    const b = bounds(polygons);
    return {
      code,
      ...name,
      centre: { lat: round5(c.lat), lng: round5(c.lng) },
      bounds: { south: round5(b.south), west: round5(b.west), north: round5(b.north), east: round5(b.east) },
    };
  })
  .sort((a, b) => a.code.localeCompare(b.code));

if (governorates.length !== 24) throw new Error(`Expected 24 features, found ${governorates.length}`);

writeFileSync(
  OUT,
  `${JSON.stringify(
    {
      source: 'geoBoundaries gbOpen TUN ADM1 (2017), OpenStreetMap',
      licence: 'ODbL 1.0, © OpenStreetMap contributors, via geoBoundaries (www.geoboundaries.org)',
      method: 'centre: area-weighted centroid of the outline; bounds: bounding box of the outline',
      governorates,
    },
    null,
    2,
  )}\n`,
);
console.log(`Wrote ${governorates.length} governorates to ${OUT}`);
