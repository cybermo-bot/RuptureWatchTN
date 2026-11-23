// Which governorate a position falls in, computed on the visitor's phone: the position is
// projected like the SVG map (data/reference/governorates-map.json) and tested against each
// governorate's outline (even-odd rule). Only the governorate code ever leaves the phone.
// The outlines are simplified (about 1 km): near a border, the visitor can correct the choice.

export interface GovernorateMapFile {
  projection: { minLon: number; maxLat: number; k: number; scale: number };
  governorates: { code: string; d: string }[];
}

type Ring = [number, number][];

/** The rings of an SVG path made only of absolute M, L and Z commands, as the map script writes them. */
export function ringsOf(d: string): Ring[] {
  return d
    .split('M')
    .filter(Boolean)
    .map((part) =>
      part
        .replace(/Z/g, '')
        .split('L')
        .map((pair) => pair.trim().split(/\s+/).map(Number) as [number, number]),
    );
}

function inside(x: number, y: number, ring: Ring): boolean {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/** The governorate code at a position, or null outside every governorate. */
export function governorateAt(lat: number, lng: number, map: GovernorateMapFile): string | null {
  const { minLon, maxLat, k, scale } = map.projection;
  const x = (lng - minLon) * k * scale;
  const y = (maxLat - lat) * scale;
  for (const g of map.governorates) {
    let hits = 0;
    for (const ring of ringsOf(g.d)) if (inside(x, y, ring)) hits++;
    if (hits % 2 === 1) return g.code;
  }
  return null;
}
