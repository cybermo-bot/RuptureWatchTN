// One shape for a pharmacy in the directory, whichever source it comes from. Pure functions.
// Google results live only in the browser's memory while the page is open (CLAUDE.md rule 13).

import { fromGooglePeriods, type GooglePeriod, type WeeklyHours } from './hours';
import type { OsmPharmacy } from './osm';

export interface DirectoryEntry {
  id: string;
  name: string | null;
  address: string | null;
  lat: number;
  lng: number;
  phone: string | null;
  /** Regular week. */
  hours: WeeklyHours;
  /** Hours that decide "open now" (Google's current hours, with special days), else the regular week. */
  nowHours: WeeklyHours;
  directionsUrl: string;
  /** Metres from the visitor or from the governorate's centre, when known. */
  distance?: number;
}

/** The subset of a Google Places `Place` the directory reads. */
export interface GooglePlaceLike {
  id: string;
  displayName?: string | null;
  formattedAddress?: string | null;
  location?: { lat(): number; lng(): number } | null;
  nationalPhoneNumber?: string | null;
  googleMapsURI?: string | null;
  regularOpeningHours?: { periods: readonly GooglePeriod[] } | null;
  currentOpeningHours?: { periods: readonly GooglePeriod[] } | null;
}

/** The only fields asked of Google: what the list shows (fewer fields cost less). */
export const GOOGLE_FIELDS = [
  'id',
  'displayName',
  'formattedAddress',
  'location',
  'regularOpeningHours',
  'currentOpeningHours',
  'nationalPhoneNumber',
  'googleMapsURI',
] as const;

export function directionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export function fromGooglePlace(p: GooglePlaceLike): DirectoryEntry | null {
  if (!p.location) return null;
  const lat = p.location.lat();
  const lng = p.location.lng();
  const hours = fromGooglePeriods(p.regularOpeningHours?.periods);
  const current = fromGooglePeriods(p.currentOpeningHours?.periods);
  return {
    id: p.id,
    name: p.displayName ?? null,
    address: p.formattedAddress ?? null,
    lat,
    lng,
    phone: p.nationalPhoneNumber ?? null,
    hours: hours ?? current,
    nowHours: current ?? hours,
    directionsUrl: p.googleMapsURI ?? directionsUrl(lat, lng),
  };
}

export function fromOsmPharmacy(p: OsmPharmacy, locale: 'fr' | 'ar'): DirectoryEntry {
  return {
    id: p.id,
    name: (locale === 'ar' ? (p.nameAr ?? p.name) : (p.name ?? p.nameAr)) ?? null,
    address: p.address,
    lat: p.lat,
    lng: p.lng,
    phone: p.phone,
    hours: p.hours,
    nowHours: p.hours,
    directionsUrl: directionsUrl(p.lat, p.lng),
  };
}

/** A tel: link from a phone number as written, digits and a leading + only. */
export function telHref(phone: string): string | null {
  const first = phone.split(/[;,/]/)[0];
  const digits = first.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
  return digits.replace(/\D/g, '').length >= 6 ? `tel:${digits}` : null;
}

/** Zoom that shows a bounding box on a phone-width map. */
export function zoomFor(b: { south: number; west: number; north: number; east: number }): number {
  const span = Math.max(b.north - b.south, b.east - b.west, 0.01);
  return Math.min(12, Math.max(7, Math.floor(Math.log2(2.2 / span)) + 8));
}
