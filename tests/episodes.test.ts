import { describe, expect, it } from 'vitest';
import { parseCsvRows } from '@/lib/content/csv';
import { episodeStats, parseEpisodes, readEpisodes } from '@/lib/content/episodes';

// Test rows only: fictional labels and example.org links, never shown on a page.
const HEADER =
  'molecule_dci,episode_label,tn_first_report_date,tn_first_report_source,tn_first_report_url,tn_end_date,tn_end_url,foreign_regulator,foreign_first_notice_date,foreign_notice_url,notes';
const row = (cells: string[]) => cells.join(',');
const csv = [
  HEADER,
  row(['MOLECULE A', 'Episode test 1', '2024-03-10', 'Journal test', 'https://example.org/a', '2024-05-01', 'https://example.org/a-end', 'ANSM', '2024-02-09', 'https://example.org/ansm', '']),
  row(['MOLECULE B', 'Episode test 2', '2024-06-01', '', 'https://example.org/b', '', '', '', '', '', 'pas d’avis']),
  row(['MOLECULE C', '"Episode, test 3"', '2024-09-15', 'X', 'https://example.org/c', '', '', 'BfArM', '2024-08-16', 'https://example.org/bfarm', '"note ""citée"""']),
  row(['MOLECULE D', 'Episode test 4', '2024-10-01', 'X', 'https://example.org/d', '', '', 'EMA', '2024-10-05', 'https://example.org/ema', '']),
  row(['MOLECULE E', 'Episode test 5', '2024-13-01', 'X', 'https://example.org/e', '', '', '', '', '', '']),
].join('\r\n');

describe('episodes file', () => {
  const file = parseEpisodes(csv);

  it('reads quoted cells, keeps valid rows and lists the rejected ones with their line', () => {
    expect(file.episodes.map((e) => e.label)).toEqual(['Episode test 1', 'Episode test 2', 'Episode, test 3', 'Episode test 4']);
    expect(file.episodes[2].notes).toBe('note "citée"');
    expect(file.rejected).toEqual([{ line: 6, reason: 'tn_first_report_date is not YYYY-MM-DD' }]);
  });

  it('computes leads and misses from the dates', () => {
    expect(file.episodes.map((e) => [e.leadDays, e.earlier])).toEqual([
      [30, true],
      [null, false], // no foreign notice: a miss
      [30, true],
      [-4, false], // foreign notice after the Tunisian report: a miss
    ]);
  });

  it('computes the summary from the file, nothing typed', () => {
    expect(episodeStats(file.episodes)).toMatchObject({ episodes: 4, earlier: 2, missed: 2, medianLeadDays: 30 });
    expect(episodeStats([])).toEqual({ episodes: 0, earlier: 0, missed: 0, earlierNotices: 0, medianLeadDays: null });
  });

  it('reports missing columns instead of guessing', () => {
    expect(parseEpisodes('molecule_dci,episode_label\nA,B').missingColumns).toContain('tn_first_report_date');
  });

  it('is absent until the team supplies it', () => {
    const real = readEpisodes();
    expect(['absent', 'loaded']).toContain(real.status);
    expect(readEpisodes('C:/nowhere').status).toBe('absent');
  });

  it('parses line breaks inside quotes and a byte order mark', () => {
    expect(parseCsvRows('\uFEFFa,b\n"x\ny",z\n')).toEqual([
      ['a', 'b'],
      ['x\ny', 'z'],
    ]);
  });
});
