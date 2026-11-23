// Small geometry helpers for the pharmacy directory. Pure functions.

export interface Point {
  lat: number;
  lng: number;
}

const R = 6_371_000;
const rad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in metres. */
export function distanceMetres(a: Point, b: Point): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** The `limit` items nearest to `from`, nearest first, each with its distance. */
export function nearest<T extends Point>(items: readonly T[], from: Point, limit: number): (T & { distance: number })[] {
  return items
    .map((item) => ({ ...item, distance: distanceMetres(from, item) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}

// GeoJSON rings are [lng, lat] pairs.
export type Ring = [number, number][];
export type Polygon = Ring[];

/** Ray casting on the outer ring, holes excluded. */
export function inPolygon(p: Point, polygon: Polygon): boolean {
  const inside = (ring: Ring) => {
    let c = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (yi > p.lat !== yj > p.lat && p.lng < ((xj - xi) * (p.lat - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  if (!polygon.length || !inside(polygon[0])) return false;
  return !polygon.slice(1).some(inside);
}

/** Area-weighted centroid of the outer rings (planar, good enough at governorate scale). */
export function centroid(polygons: readonly Polygon[]): Point {
  let a = 0;
  let x = 0;
  let y = 0;
  for (const polygon of polygons) {
    const ring = polygon[0];
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [x0, y0] = ring[j];
      const [x1, y1] = ring[i];
      const f = x0 * y1 - x1 * y0;
      a += f;
      x += (x0 + x1) * f;
      y += (y0 + y1) * f;
    }
  }
  return { lat: y / (3 * a), lng: x / (3 * a) };
}

export interface Bounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

export function bounds(polygons: readonly Polygon[]): Bounds {
  const b = { south: Infinity, west: Infinity, north: -Infinity, east: -Infinity };
  for (const polygon of polygons) {
    for (const [lng, lat] of polygon[0]) {
      b.south = Math.min(b.south, lat);
      b.north = Math.max(b.north, lat);
      b.west = Math.min(b.west, lng);
      b.east = Math.max(b.east, lng);
    }
  }
  return b;
}

/** Polygon or MultiPolygon geometry as a list of polygons. */
export function polygonsOf(geometry: { type: string; coordinates: unknown }): Polygon[] {
  if (geometry.type === 'Polygon') return [geometry.coordinates as Polygon];
  if (geometry.type === 'MultiPolygon') return geometry.coordinates as Polygon[];
  return [];
}

const round = (n: number, digits: number) => Math.round(n * 10 ** digits) / 10 ** digits;
export const round5 = (n: number) => round(n, 5);
