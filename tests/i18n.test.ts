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
