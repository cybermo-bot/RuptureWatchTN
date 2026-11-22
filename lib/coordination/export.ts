// The coordination export: signals and pharmacy counts by governorate, aggregates only.
// Every count is the one the database already suppressed ('<3'); nothing here can name a
// pharmacy. Columns are documented on /coordination/export.

import { DEFAULT_PARAMS } from '@/lib/signal';
import type { GovernorateCount, SignalRow } from '@/lib/signals/views';

export interface ExportSignal {
  signal: SignalRow;
  counts: GovernorateCount[];
}

/** CSV columns, in order. The export page documents each one. */
export const CSV_COLUMNS = [
  'molecule_id',
  'molecule_name',
  'level',
  'since',
  'rule',
  'pharmacies_14d',
  'governorates_14d',
  'pharmacies_7d',
  'origins',
  'governorate_code',
  'governorate_name',
  'governorate_pharmacies_14d',
] as const;

function cell(value: string | number | null): string {
  const s = value === null ? '' : String(value);
  // Quote when needed; a leading =, +, - or @ is prefixed so a spreadsheet never runs it as a formula.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** One row per molecule and governorate with reports; a molecule without any gets one row with empty governorate cells. */
export function toCsv(rows: ExportSignal[]): string {
  const lines: string[] = [CSV_COLUMNS.join(',')];
  for (const { signal: s, counts } of rows) {
    const base = [
      s.molecule_id,
      s.molecule_name,
      s.level,
      s.since,
      s.rule,
      s.evidence.pharmacies14d,
      s.evidence.governorates14d,
      s.evidence.pharmacies7d,
      (s.evidence.origins ?? []).join(' '),
    ];
    const govs = counts.length ? counts.map((c) => [c.governorate_code, c.governorate_name, c.pharmacies]) : [[null, null, null]];
    for (const g of govs) lines.push([...base, ...g].map(cell).join(','));
  }
  return lines.join('\r\n') + '\r\n';
}

export function toJson(rows: ExportSignal[], exportedAt: Date) {
  return {
    exported_at: exportedAt.toISOString(),
    window_days: DEFAULT_PARAMS.confirmWindowDays,
    likely_window_days: DEFAULT_PARAMS.likelyWindowDays,
    min_undelivered_hours: DEFAULT_PARAMS.minUndeliveredHours,
    small_counts: 'Pharmacy counts from 1 to 2 are given as "<3"; governorates_14d is null when pharmacies_14d is "<3".',
    disclaimer: "Ceci n'est pas une déclaration officielle de rupture.",
    signals: rows.map(({ signal: s, counts }) => ({
      molecule_id: s.molecule_id,
      molecule_name: s.molecule_name,
      level: s.level,
      since: s.since,
      rule: s.rule,
      pharmacies_14d: s.evidence.pharmacies14d,
      governorates_14d: s.evidence.governorates14d,
      pharmacies_7d: s.evidence.pharmacies7d,
      origins: s.evidence.origins ?? [],
      foreign_notices: (s.evidence.notices ?? []).map((n) => ({ source: n.source, status: n.status, published_at: n.publishedAt, url: n.url })),
      governorates: counts.map((c) => ({ code: c.governorate_code, name: c.governorate_name, pharmacies_14d: c.pharmacies })),
    })),
  };
}
