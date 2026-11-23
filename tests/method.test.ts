import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseSources, readSources, sourceSlug } from '@/lib/content/sources';

const ROOT = join(__dirname, '..');
const core = JSON.parse(readFileSync(join(ROOT, 'messages/fr/core.json'), 'utf8')) as {
  method: Record<string, unknown> & { sources: Record<string, { name?: string; use?: string; licence?: string }> };
};

const flatten = (o: unknown, p = ''): [string, string][] =>
  typeof o === 'string' ? [[p, o]] : Object.entries(o as object).flatMap(([k, v]) => flatten(v, p ? `${p}.${k}` : k));

describe('methods page', () => {
  it('types no threshold: the texts about levels, rules, reports and gates contain no digit', () => {
    const method = core.method;
    const texts = flatten({
      levels: method.levels,
      rules: method.rules,
      report: method.report,
      gate1: method.gate1,
      gate2: method.gate2,
      hold: method.hold,
      never: method.never,
    });
    expect(texts.length).toBeGreaterThan(30);
    // "garde-fou 1" and "garde-fou 2" are names, not thresholds.
    for (const [key, raw] of texts) {
      const text = raw.replace(/garde-fou [12]/g, 'garde-fou');
      expect({ key, text }).toEqual({ key, text: text.replace(/\d/g, '') });
    }
  });

  it('has a French name, use and licence for every source in data/SOURCES.md', () => {
    const sources = readSources(ROOT);
    expect(sources.map((s) => s.slug)).toEqual(['cnam', 'geoboundaries', 'iso', 'meta', 'openstreetmap', 'bdpm']);
    for (const s of sources) {
      const fr = core.method.sources[s.slug];
      expect(fr?.name && fr.use && fr.licence, s.slug).toBeTruthy();
      expect(s.url, s.slug).toMatch(/^https:\/\//);
    }
  });

  it('reads the first page link of each source', () => {
    const [entry] = parseSources('## CNAM: list\n\n- **Page:** https://www.cnam.nat.tn/espace_ps.jsp, entry x\n- **File:** https://x.org/f.xlsx\n');
    expect(entry).toEqual({ slug: 'cnam', heading: 'CNAM: list', url: 'https://www.cnam.nat.tn/espace_ps.jsp' });
    expect(sourceSlug('ISO 3166-2:TN governorate codes')).toBe('iso');
  });
});
