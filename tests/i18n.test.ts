// Message files split by track: keys start with their namespace; Arabic exists for the
// public namespaces only and falls back to French, with a warning in development.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { listTranslator, t, translator, type MessageKey } from '@/lib/i18n';

const dir = join(__dirname, '..', 'messages');
const read = (locale: string, ns: string) => JSON.parse(readFileSync(join(dir, locale, `${ns}.json`), 'utf8'));

function leaves(node: unknown, prefix = ''): string[] {
  if (typeof node === 'string' || Array.isArray(node)) return [prefix.slice(0, -1)];
  return Object.entries(node as Record<string, unknown>).flatMap(([k, v]) => leaves(v, `${prefix}${k}.`));
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('message files', () => {
  it('has one French file per namespace and Arabic for the public namespaces only', () => {
    expect(readdirSync(join(dir, 'fr')).sort()).toEqual(
      ['core.json', 'directory.json', 'library.json', 'public.json', 'wholesaler.json'],
    );
    expect(readdirSync(join(dir, 'ar')).sort()).toEqual(['directory.json', 'library.json', 'public.json']);
  });

  it('resolves keys prefixed by namespace', () => {
    expect(t('core.app.name')).toBe('RuptureWatch TN');
    expect(t('public.pages.medicines.title')).toBe('Je cherche un médicament');
    expect(translator('ar')('public.pages.medicines.title')).toBe('أبحث عن دواء');
  });

  it('every Arabic key also exists in French, so the fallback always has a text', () => {
    for (const ns of ['public', 'directory', 'library']) {
      const fr = new Set(leaves(read('fr', ns)));
      for (const key of leaves(read('ar', ns)).filter(Boolean)) expect(fr, `${ns}.${key}`).toContain(key);
    }
  });

  it('falls back to French when an Arabic key is missing, and warns in development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(translator('ar')('core.app.prototype')).toBe('Prototype de démonstration');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('core.app.prototype'));
  });

  it('does not warn outside development', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(translator('ar')('core.app.wordmark')).toBe('RuptureWatch');
    expect(warn).not.toHaveBeenCalled();
  });

  it('lists fall back too', () => {
    expect(listTranslator('ar')('core.guidance.levels.watch.guidance').length).toBeGreaterThan(0);
  });

  it('throws on an unknown key rather than showing nothing', () => {
    expect(() => t('core.nope' as MessageKey)).toThrow('Missing message: core.nope');
  });
});

// Pilot-1 item 7: Arabic plurals. « حُدِّث قبل 8 ساعة » reads « 8 ساعات ».
describe('plural messages', () => {
  it('picks the Arabic plural form for hours, days and pharmacies', async () => {
    const { plural } = await import('@/lib/i18n');
    expect(plural('ar', 'public.freshness.hours', 8)).toBe('حُدِّث قبل 8 ساعات');
    expect(plural('ar', 'public.freshness.hours', 1)).toBe('حُدِّث قبل ساعة');
    expect(plural('ar', 'public.freshness.hours', 2)).toBe('حُدِّث قبل ساعتين');
    expect(plural('ar', 'public.freshness.hours', 15)).toBe('حُدِّث قبل 15 ساعة');
    expect(plural('ar', 'public.freshness.days', 3)).toBe('حُدِّث قبل 3 أيام');
    expect(plural('ar', 'public.request.answeredAgo.days', 4)).toBe('قبل 4 أيام');
    expect(plural('ar', 'directory.list.aroundGovernorate', 5, { name: 'تونس' })).toBe('5 صيدليات في ولاية تونس.');
    expect(plural('ar', 'directory.list.aroundYou', 20)).toBe('أقرب 20 صيدلية إليك.');
  });

  it('picks the French form, singular for one', async () => {
    const { plural } = await import('@/lib/i18n');
    expect(plural('fr', 'public.freshness.hours', 8)).toBe('Mis à jour il y a 8 h');
    expect(plural('fr', 'directory.list.aroundGovernorate', 1, { name: 'Sfax' })).toBe('1 pharmacie dans le gouvernorat de Sfax.');
    expect(plural('fr', 'directory.list.aroundGovernorate', 12, { name: 'Sfax' })).toBe('12 pharmacies dans le gouvernorat de Sfax.');
  });

  it('every plural message has the six categories in both languages', async () => {
    const { PLURAL_CATEGORIES } = await import('@/lib/i18n');
    for (const locale of ['fr', 'ar']) {
      for (const ns of ['public', 'directory', 'library']) {
        const keys = leaves(read(locale, ns));
        // A plural message has both « one » and « other » (library.kind.other is a product kind).
        const bases = new Set(keys.filter((k) => k.endsWith('.other')).map((k) => k.slice(0, -'.other'.length)).filter((b) => keys.includes(`${b}.one`)));
        for (const base of bases) {
          for (const c of PLURAL_CATEGORIES) expect(keys, `${locale} ${ns}.${base}.${c}`).toContain(`${base}.${c}`);
        }
      }
    }
  });
});

// Pilot-2: every public text of the pilot exists in French and in Arabic, not only through the
// French fallback.
describe('pilot texts on public pages', () => {
  it.each([
    'public.pilot.line',
    'public.feedback.title',
    'public.feedback.noPatient',
    'public.request.noneParticipating',
    'public.request.openPharmacies',
    'public.request.statusLink',
    'public.request.pilotFew',
    'public.medicines.notInList',
    'public.medicines.tellUs',
    'public.prescribers.signedOutBodyPilot',
  ] as const)('%s is written in both languages', (key) => {
    const path = key.split('.').slice(1);
    const lookup = (locale: string) => path.reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], read(locale, 'public'));
    expect(typeof lookup('fr')).toBe('string');
    expect(typeof lookup('ar')).toBe('string');
    expect(lookup('ar')).not.toBe(lookup('fr'));
  });
});
