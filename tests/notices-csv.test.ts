import { describe, expect, it } from 'vitest';
import { noticeKey, parseNotices, publishedAt } from '@/lib/content/notices';

// Test rows only (example.org links).
describe('foreign notices file', () => {
  const file = parseNotices(
    [
      'molecule_dci,source,status,published_date,url',
      'LEVETIRACETAM,ANSM,shortage,2026-10-02,https://example.org/1',
      'LEVETIRACETAM,BfArM,pending,2026-10-02,https://example.org/2',
      'CARBAMAZEPINE,ANSM,tension,02/10/2026,https://example.org/3',
      'CARBAMAZEPINE,ANSM,resolved,2026-10-20,not a link',
    ].join('\n'),
  );

  it('keeps valid rows and says why the others are rejected', () => {
    expect(file.rows).toEqual([
      { line: 2, moleculeDci: 'LEVETIRACETAM', source: 'ANSM', status: 'shortage', publishedDate: '2026-10-02', url: 'https://example.org/1' },
    ]);
    expect(file.rejected.map((r) => r.line)).toEqual([3, 4, 5]);
    expect(file.rejected[0].reason).toMatch(/status/);
  });

  it('needs every column', () => {
    expect(parseNotices('molecule_dci,source\nA,B').missingColumns).toEqual(['status', 'published_date', 'url']);
  });

  it('recognises a notice already loaded, whatever the timestamp format', () => {
    expect(noticeKey('m', 'ANSM', publishedAt('2026-10-02'), 'u')).toBe(noticeKey('m', 'ANSM', '2026-10-02 00:00:00+00', 'u'));
  });
});
