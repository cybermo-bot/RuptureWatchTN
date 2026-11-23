import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import OpeningHours from 'opening_hours';
import { describe, expect, it } from 'vitest';
import areas from '../data/reference/governorate-areas.json';
import { centroid, distanceMetres, inPolygon, nearest, polygonsOf } from '@/lib/directory/geo';
import { fromGooglePlace, fromOsmPharmacy, GOOGLE_FIELDS, telHref, zoomFor } from '@/lib/directory/entries';
import { parseOsmFile } from '@/lib/directory/osm';
import {
  addressOf,
  centresOf,
  nextSunday,
  toPharmacy,
  weekFromOpeningHours,
  withoutHolidayRules,
  type GovernorateShape,
  type OpeningHoursCtor,
} from '../scripts/lib/osm-pharmacies';

const ROOT = join(__dirname, '..');
const geojson = JSON.parse(
  readFileSync(join(ROOT, 'data/raw/geoboundaries/geoBoundaries-TUN-ADM1_simplified.geojson'), 'utf8'),
) as { features: { properties: { shapeISO: string }; geometry: { type: string; coordinates: unknown } }[] };
const shapes: GovernorateShape[] = geojson.features.map((f) => ({
  code: f.properties.shapeISO,
  polygons: polygonsOf(f.geometry),
}));

describe('governorate areas file', () => {
  it('has the 24 governorates of the database, with their French and Arabic names', () => {
    const migration = readFileSync(join(ROOT, 'supabase/migrations/20261121000200_reference_data.sql'), 'utf8');
    const db = [...migration.matchAll(/\('(TN-\d{2})', '([^']+)', '([^']+)'\)/g)]
      .map((m) => [m[1], m[2], m[3]])
      .sort((a, b) => a[0].localeCompare(b[0]));
    expect(areas.governorates.map((g) => [g.code, g.nameFr, g.nameAr])).toEqual(db);
  });

  it('matches the boundary file: each centre is the outline centroid, inside its bounds', () => {
    for (const g of areas.governorates) {
      const c = centroid(shapes.find((s) => s.code === g.code)!.polygons);
      expect(g.centre.lat).toBeCloseTo(c.lat, 4);
      expect(g.centre.lng).toBeCloseTo(c.lng, 4);
      expect(g.centre.lat).toBeGreaterThan(g.bounds.south);
      expect(g.centre.lat).toBeLessThan(g.bounds.north);
    }
  });

  it('gives a governorate zoom that fits a phone', () => {
    const tunis = areas.governorates.find((g) => g.code === 'TN-11')!;
    const tataouine = areas.governorates.find((g) => g.code === 'TN-83')!;
    expect(zoomFor(tunis.bounds)).toBeGreaterThan(zoomFor(tataouine.bounds));
    expect(zoomFor(tataouine.bounds)).toBeGreaterThanOrEqual(7);
  });
});

describe('geometry', () => {
  it('places a point of central Tunis in Tunis and one of Sfax in Sfax', () => {
    expect(shapes.find((s) => s.polygons.some((p) => inPolygon({ lat: 36.8, lng: 10.18 }, p)))?.code).toBe('TN-11');
    expect(shapes.find((s) => s.polygons.some((p) => inPolygon({ lat: 34.74, lng: 10.76 }, p)))?.code).toBe('TN-61');
  });

  it('measures distances and sorts by them', () => {
    const d = distanceMetres({ lat: 36.8, lng: 10.18 }, { lat: 34.74, lng: 10.76 });
    expect(d / 1000).toBeGreaterThan(225);
    expect(d / 1000).toBeLessThan(240);
    const near = nearest([{ id: 'far', lat: 35, lng: 10 }, { id: 'close', lat: 36.81, lng: 10.18 }], { lat: 36.8, lng: 10.18 }, 1);
    expect(near.map((n) => n.id)).toEqual(['close']);
  });
});

describe('OpenStreetMap export', () => {
  const OH = OpeningHours as unknown as OpeningHoursCtor;
  // The script sets TZ=Africa/Tunis; here the reference Sunday is built in the test's own zone,
  // which is enough to check the conversion (the offsets are relative to that Sunday).
  const sunday = nextSunday(new Date(2026, 10, 22, 12));

  it('finds the Sunday after a date', () => {
    expect(sunday.getDay()).toBe(0);
    expect(sunday.getDate()).toBe(29);
  });

  it('turns an opening_hours value into a regular week', () => {
    const { hours } = weekFromOpeningHours('Mo-Fr 08:00-13:00,15:00-20:00; Sa 08:00-13:00', OH, sunday);
    expect(hours).toHaveLength(11);
    expect(hours![0]).toEqual([1440 + 480, 1440 + 780]);
    expect(weekFromOpeningHours('24/7', OH, sunday).hours).toEqual([[0, 7 * 1440]]);
  });

  it('ignores holiday rules the library cannot evaluate for Tunisia, and says so', () => {
    expect(withoutHolidayRules('Mo-Sa 08:00-20:00; PH off')).toBe('Mo-Sa 08:00-20:00');
    const r = weekFromOpeningHours('Mo-Sa 08:00-20:00; PH off', OH, sunday);
    expect(r.holidayRulesIgnored).toBe(true);
    expect(r.hours).toHaveLength(6);
  });

  it('gives null for a value it cannot read, never a guess', () => {
    const silent = console.error;
    console.error = () => {};
    try {
      expect(weekFromOpeningHours('ouvert le matin', OH, sunday).hours).toBeNull();
    } finally {
      console.error = silent;
    }
  });

  it('builds a pharmacy from an Overpass element, with its governorate', () => {
    const r = toPharmacy(
      {
        type: 'node',
        id: 42,
        lat: 36.8001234,
        lon: 10.1801234,
        tags: { amenity: 'pharmacy', name: 'Pharmacie Exemple', 'addr:street': 'Rue de Test', phone: '+216 71 000 000', opening_hours: '24/7' },
      },
      shapes,
      (v) => weekFromOpeningHours(v, OH, sunday),
    )!;
    expect(r.pharmacy).toMatchObject({ id: 'node/42', name: 'Pharmacie Exemple', lat: 36.80012, lng: 10.18012, gov: 'TN-11', address: 'Rue de Test' });
    expect(r.pharmacy.hours).toEqual([[0, 7 * 1440]]);
    expect(toPharmacy({ type: 'way', id: 1, tags: {} }, shapes, () => ({ hours: null, holidayRulesIgnored: false }))).toBeNull();
  });

  it('writes an address only from address tags', () => {
    expect(addressOf({ 'addr:housenumber': '12', 'addr:street': 'Avenue X', 'addr:city': 'Sfax' })).toBe('12 Avenue X, Sfax');
    expect(addressOf({})).toBeNull();
  });

  it('centres a governorate on the mean position of its pharmacies', () => {
    const base = { name: null, nameAr: null, address: null, phone: null, hoursRaw: null, hours: null };
    const c = centresOf([
      { ...base, id: 'a', lat: 34, lng: 10, gov: 'TN-61' },
      { ...base, id: 'b', lat: 35, lng: 11, gov: 'TN-61' },
      { ...base, id: 'c', lat: 30, lng: 9, gov: null },
    ]);
    expect(c).toEqual({ 'TN-61': { lat: 34.5, lng: 10.5, pharmacies: 2 } });
  });

  it('rejects a file that is not an export', () => {
    expect(parseOsmFile({})).toBeNull();
    expect(parseOsmFile({ fetchedAt: 'x', centres: {}, pharmacies: [{ id: 'node/1', lat: 'a' }] })).toBeNull();
  });
});

describe('directory entries', () => {
  it('asks Google only for the fields the list shows', () => {
    expect([...GOOGLE_FIELDS].sort()).toEqual(
      ['currentOpeningHours', 'displayName', 'formattedAddress', 'googleMapsURI', 'id', 'location', 'nationalPhoneNumber', 'regularOpeningHours'].sort(),
    );
  });

  it('reads a Google place', () => {
    const e = fromGooglePlace({
      id: 'abc',
      displayName: 'Pharmacie',
      location: { lat: () => 36.8, lng: () => 10.18 },
      regularOpeningHours: { periods: [{ open: { day: 0, hour: 0, minute: 0 }, close: null }] },
      currentOpeningHours: null,
      googleMapsURI: 'https://maps.google.com/?cid=1',
    })!;
    expect(e.hours).toEqual([[0, 7 * 1440]]);
    expect(e.nowHours).toEqual(e.hours);
    expect(e.directionsUrl).toBe('https://maps.google.com/?cid=1');
    expect(fromGooglePlace({ id: 'x', location: null })).toBeNull();
  });

  it('prefers the Arabic name of an OpenStreetMap pharmacy on Arabic pages', () => {
    const p = { id: 'node/1', name: 'Pharmacie', nameAr: 'صيدلية', lat: 1, lng: 2, gov: null, address: null, phone: null, hoursRaw: null, hours: null };
    expect(fromOsmPharmacy(p, 'ar').name).toBe('صيدلية');
    expect(fromOsmPharmacy(p, 'fr').name).toBe('Pharmacie');
  });

  it('builds a tel: link only from a plausible number', () => {
    expect(telHref('+216 71 123 456')).toBe('tel:+21671123456');
    expect(telHref('71 123 456; 71 654 321')).toBe('tel:71123456');
    expect(telHref('n/a')).toBeNull();
  });
});
