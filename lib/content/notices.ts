// data/reference/foreign_notices.csv: one row per regulator notice, supplied by the team.
// Columns: molecule_dci, source, status (shortage, tension, resolved), published_date (YYYY-MM-DD), url.
// Validated here; scripts/import-notices.ts matches and loads the valid rows.

import { isHttpUrl, isIsoDate, parseCsv } from './csv';

export const NOTICE_COLUMNS = ['molecule_dci', 'source', 'status', 'published_date', 'url'] as const;
const STATUSES = ['shortage', 'tension', 'resolved'] as const;
export type NoticeStatus = (typeof STATUSES)[number];

export interface NoticeRow {
  line: number;
  moleculeDci: string;
  source: string;
  status: NoticeStatus;
  publishedDate: string;
  url: string;
}

export interface NoticeFile {
  rows: NoticeRow[];
  rejected: { line: number; reason: string }[];
  missingColumns: string[];
}

export function parseNotices(text: string): NoticeFile {
  const { header, rows } = parseCsv(text);
  const missingColumns = NOTICE_COLUMNS.filter((c) => !header.includes(c));
  if (missingColumns.length) return { rows: [], rejected: [], missingColumns };
  const out: NoticeRow[] = [];
  const rejected: NoticeFile['rejected'] = [];
  rows.forEach((r, i) => {
    const line = i + 2;
    if (!r.molecule_dci) return rejected.push({ line, reason: 'molecule_dci empty' });
    if (!r.source) return rejected.push({ line, reason: 'source empty' });
    if (!(STATUSES as readonly string[]).includes(r.status)) return rejected.push({ line, reason: `status "${r.status}" is not shortage, tension or resolved` });
    if (!isIsoDate(r.published_date)) return rejected.push({ line, reason: 'published_date is not YYYY-MM-DD' });
    if (!isHttpUrl(r.url)) return rejected.push({ line, reason: 'url is not a link' });
    out.push({ line, moleculeDci: r.molecule_dci, source: r.source, status: r.status as NoticeStatus, publishedDate: r.published_date, url: r.url });
  });
  return { rows: out, rejected, missingColumns: [] };
}

/** A notice's publication time as stored: midnight UTC of its date. */
export function publishedAt(date: string): string {
  return `${date}T00:00:00.000Z`;
}

/** Identity of a notice, to skip rows already loaded when the script is run again. */
export function noticeKey(moleculeId: string, source: string, publishedAtIso: string, url: string): string {
  return [moleculeId, source, new Date(publishedAtIso).toISOString(), url].join('|');
}
