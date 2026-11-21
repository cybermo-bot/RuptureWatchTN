// Builds data/reference/governorates-map.json from the geoBoundaries Tunisia ADM1 file:
// projects to a flat plane, simplifies for a phone screen, writes one SVG path per governorate.
//
//   npm run map:build
//
// Source and licence (ODbL 1.0, © OpenStreetMap contributors, via geoBoundaries): data/SOURCES.md.

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/script-env';

const SOURCE = join(ROOT, 'data/raw/geoboundaries/geoBoundaries-TUN-ADM1_simplified.geojson');
const OUT = join(ROOT, 'data/reference/governorates-map.json');

// French names, same as the governorates table (supabase/migrations/..._reference_data.sql).
const NAMES: Record<string, string> = {
  'TN-11': 'Tunis', 'TN-12': 'Ariana', 'TN-13': 'Ben Arous', 'TN-14': 'La Manouba',
  'TN-21': 'Nabeul', 'TN-22': 'Zaghouan', 'TN-23': 'Bizerte', 'TN-31': 'Béja',
  'TN-32': 'Jendouba', 'TN-33': 'Le Kef', 'TN-34': 'Siliana', 'TN-41': 'Kairouan',
  'TN-42': 'Kasserine', 'TN-43': 'Sidi Bouzid', 'TN-51': 'Sousse', 'TN-52': 'Monastir',
  'TN-53': 'Mahdia', 'TN-61': 'Sfax', 'TN-71': 'Gafsa', 'TN-72': 'Tozeur',
  'TN-73': 'Kébili', 'TN-81': 'Gabès', 'TN-82': 'Médenine', 'TN-83': 'Tataouine',
};

const HEIGHT = 1000; // viewBox height in map units
const TOLERANCE = 1.2; // simplification tolerance, in map units (about 0.7 px on a phone)
const MIN_RING_AREA = 20; // drop islets smaller than this, in square map units (about 15 km²)

type Pt = [number, number];
type Ring = Pt[];
interface Feature {
  properties: { shapeISO: string; shapeName: string };
  geometry: { type: 'Polygon'; coordinates: Ring[] } | { type: 'MultiPolygon'; coordinates: Ring[][] };
}

function polygonsOf(f: Feature): Ring[][] {
  return f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
}

function area(ring: Ring): number {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  }
  return a / 2;
}

function centroid(ring: Ring): Pt {
  let x = 0;
  let y = 0;
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const f = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
    x += (ring[j][0] + ring[i][0]) * f;
    y += (ring[j][1] + ring[i][1]) * f;
    a += f;
  }
  return [x / (3 * a), y / (3 * a)];
}

/** Douglas–Peucker on a closed ring: split at the point farthest from the start, simplify each half. */
function simplifyRing(ring: Ring, tolerance: number): Ring {
  if (ring.length <= 4) return ring;
  let far = 1;
  let best = -1;
  for (let i = 1; i < ring.length - 1; i++) {
    const d = Math.hypot(ring[i][0] - ring[0][0], ring[i][1] - ring[0][1]);
    if (d > best) {
      best = d;
      far = i;
    }
  }
  const first = simplifyLine(ring.slice(0, far + 1), tolerance);
  const second = simplifyLine(ring.slice(far), tolerance);
  return [...first, ...second.slice(1)];
}

/** Douglas–Peucker on an open line. */
function simplifyLine(points: Ring, tolerance: number): Ring {
  if (points.length <= 4) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop()!;
    const [ax, ay] = points[s];
    const [bx, by] = points[e];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    let maxD = 0;
    let idx = -1;
    for (let i = s + 1; i < e; i++) {
      const d = Math.abs(dy * points[i][0] - dx * points[i][1] + bx * ay - by * ax) / len;
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (idx !== -1 && maxD > tolerance) {
      keep[idx] = 1;
      stack.push([s, idx], [idx, e]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

function main() {
  const geo = JSON.parse(readFileSync(SOURCE, 'utf8')) as { features: Feature[] };
  if (geo.features.length !== 24) throw new Error(`Expected 24 governorates, found ${geo.features.length}`);

  // Bounds in degrees.
  let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const f of geo.features)
    for (const poly of polygonsOf(f))
      for (const ring of poly)
        for (const [lon, lat] of ring) {
          minLon = Math.min(minLon, lon); maxLon = Math.max(maxLon, lon);
          minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
        }

  // Equirectangular projection, x scaled by cos(mean latitude). Adequate at this size.
  const k = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
  const scale = HEIGHT / (maxLat - minLat);
  const width = Math.ceil((maxLon - minLon) * k * scale);
  const project = ([lon, lat]: Pt): Pt => [(lon - minLon) * k * scale, (maxLat - lat) * scale];
  const fmt = (n: number) => String(Math.round(n * 10) / 10);

  const governorates = geo.features
    .map((f) => {
      const code = f.properties.shapeISO;
      const name = NAMES[code];
      if (!name) throw new Error(`Unknown governorate code ${code}`);
      let d = '';
      let largest: { ring: Ring; area: number } | null = null;
      for (const poly of polygonsOf(f)) {
        poly.forEach((ring, ringIndex) => {
          const projected = simplifyRing(ring.map(project), TOLERANCE);
          const a = Math.abs(area(projected));
          if (projected.length < 4 || a < MIN_RING_AREA) return;
          if (ringIndex === 0 && (!largest || a > largest.area)) largest = { ring: projected, area: a };
          d += `M${projected.slice(0, -1).map(([x, y]) => `${fmt(x)} ${fmt(y)}`).join('L')}Z`;
        });
      }
      if (!largest) throw new Error(`No drawable outline for ${code}`);
      const [cx, cy] = centroid((largest as { ring: Ring }).ring);
      return { code, name, d, label: [Math.round(cx), Math.round(cy)] as [number, number] };
    })
    .sort((a, b) => a.code.localeCompare(b.code));

  const out = {
    source: 'geoBoundaries gbOpen TUN ADM1 (2017), OpenStreetMap',
    licence: 'ODbL 1.0, © OpenStreetMap contributors, via geoBoundaries (www.geoboundaries.org)',
    viewBox: `0 0 ${width} ${HEIGHT}`,
    governorates,
  };
  const json = `${JSON.stringify(out)}\n`;
  writeFileSync(OUT, json, 'utf8');
  console.log(`Wrote ${OUT}: ${governorates.length} governorates, ${(json.length / 1024).toFixed(1)} KB, viewBox ${out.viewBox}`);
}

main();
