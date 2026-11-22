// Past shortages in Tunisia, from data/reference/episodes.csv (supplied by the team, one row per
// documented episode, a source link for every date). Read on the server; nothing is typed by hand:
// every count and lead on /retour is computed here from the file.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isHttpUrl, isIsoDate, parseCsv } from './csv';

export const EPISODE_COLUMNS = [
  'molecule_dci',
  'episode_label',
  'tn_first_report_date',
  'tn_first_report_source',
  'tn_first_report_url',
  'tn_end_date',
  'tn_end_url',
  'foreign_regulator',
  'foreign_first_notice_date',
  'foreign_notice_url',
  'notes',
] as const;

export interface Episode {
  /** 1-based line of the file (the header is line 1). */
  line: number;
  moleculeDci: string;
  label: string;
  tnFirstReport: { date: string; source: string; url: string };
  tnEnd: { date: string; url: string } | null;
  foreign: { regulator: string; date: string; url: string } | null;
  notes: string;
  /** Days from the foreign notice to the first Tunisian report; null without a foreign date. */
  leadDays: number | null;
  /** A foreign notice came strictly before the first Tunisian report. */
  earlier: boolean;
}

export interface EpisodeFile {
  status: 'absent' | 'loaded';
  episodes: Episode[];
  /** Rows left out, with the reason, so the page can say so. */
  rejected: { line: number; reason: string }[];
  missingColumns: string[];
}

const DAY = 86_400_000;
const days = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY);

export function parseEpisodes(text: string): EpisodeFile {
  const { header, rows } = parseCsv(text);
  const missingColumns = EPISODE_COLUMNS.filter((c) => !header.includes(c));
  if (missingColumns.length) return { status: 'loaded', episodes: [], rejected: [], missingColumns };

  const episodes: Episode[] = [];
  const rejected: EpisodeFile['rejected'] = [];
  rows.forEach((r, i) => {
    const line = i + 2;
    const reject = (reason: string) => rejected.push({ line, reason });
    if (!r.molecule_dci || !r.episode_label) return reject('molecule_dci or episode_label empty');
    if (!isIsoDate(r.tn_first_report_date)) return reject('tn_first_report_date is not YYYY-MM-DD');
    if (!isHttpUrl(r.tn_first_report_url)) return reject('tn_first_report_url is not a link');
    if (r.tn_end_date && (!isIsoDate(r.tn_end_date) || !isHttpUrl(r.tn_end_url))) return reject('tn_end_date or tn_end_url invalid');
    const hasForeign = r.foreign_first_notice_date !== '';
    if (hasForeign && (!isIsoDate(r.foreign_first_notice_date) || !isHttpUrl(r.foreign_notice_url) || !r.foreign_regulator)) {
      return reject('foreign notice date, link or regulator invalid');
    }
    const leadDays = hasForeign ? days(r.foreign_first_notice_date, r.tn_first_report_date) : null;
    episodes.push({
      line,
      moleculeDci: r.molecule_dci,
      label: r.episode_label,
      tnFirstReport: { date: r.tn_first_report_date, source: r.tn_first_report_source, url: r.tn_first_report_url },
      tnEnd: r.tn_end_date ? { date: r.tn_end_date, url: r.tn_end_url } : null,
      foreign: hasForeign ? { regulator: r.foreign_regulator, date: r.foreign_first_notice_date, url: r.foreign_notice_url } : null,
      notes: r.notes,
      leadDays,
      earlier: leadDays !== null && leadDays > 0,
    });
  });
  return { status: 'loaded', episodes, rejected, missingColumns: [] };
}

export function readEpisodes(root: string = process.cwd()): EpisodeFile {
  const file = join(root, 'data', 'reference', 'episodes.csv');
  if (!existsSync(file)) return { status: 'absent', episodes: [], rejected: [], missingColumns: [] };
  return parseEpisodes(readFileSync(file, 'utf8'));
}

export interface EpisodeStats {
  episodes: number;
  earlier: number;
  /** Median lead in days among episodes with an earlier foreign notice; null if none. */
  medianLeadDays: number | null;
}

export function episodeStats(episodes: Episode[]): EpisodeStats {
  const leads = episodes.filter((e) => e.earlier).map((e) => e.leadDays as number).sort((a, b) => a - b);
  const mid = Math.floor(leads.length / 2);
  const median = leads.length === 0 ? null : leads.length % 2 ? leads[mid] : (leads[mid - 1] + leads[mid]) / 2;
  return { episodes: episodes.length, earlier: leads.length, medianLeadDays: median };
}
