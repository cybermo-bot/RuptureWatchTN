// The OpenStreetMap pharmacy list, for the directory's fallback when Google Maps is unavailable.
// The whole file is sent; the phone sorts it by distance, so the visitor's position never
// reaches our server (CLAUDE.md rule 3). Built from data/reference/osm-pharmacies.json
// (scripts/export-osm-pharmacies.ts); 404 until that file exists.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseOsmFile } from '@/lib/directory/osm';

export const dynamic = 'force-static';

const FILE = join(process.cwd(), 'data', 'reference', 'osm-pharmacies.json');

export function GET(): Response {
  const file = existsSync(FILE) ? parseOsmFile(JSON.parse(readFileSync(FILE, 'utf8'))) : null;
  if (!file) {
    return Response.json({ error: 'osm_unavailable' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }
  return Response.json(file, { headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' } });
}
