// The 24 governorates with their French and Arabic names and centres
// (data/reference/governorate-areas.json, built by a script from public boundaries).

import areas from '@/data/reference/governorate-areas.json';
import type { Locale } from '@/lib/i18n';

export interface Governorate {
  code: string;
  name: string;
  centre: { lat: number; lng: number };
}

const LIST = (
  areas as {
    governorates: {
      code: string;
      nameFr: string;
      nameAr: string;
      centre: { lat: number; lng: number };
    }[];
  }
).governorates;

export const GOVERNORATE_CODES: ReadonlySet<string> = new Set(LIST.map((g) => g.code));

export function governorates(locale: Locale): Governorate[] {
  return LIST.map((g) => ({
    code: g.code,
    name: locale === 'ar' ? g.nameAr : g.nameFr,
    centre: g.centre,
  })).sort((a, b) => a.name.localeCompare(b.name, locale));
}

export function governorate(code: string, locale: Locale): Governorate | null {
  return governorates(locale).find((g) => g.code === code) ?? null;
}
