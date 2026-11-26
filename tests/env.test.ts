import { afterEach, describe, expect, it, vi } from 'vitest';
import { appMode, devPagesHidden, isPilot } from '@/lib/env';

afterEach(() => {
  vi.unstubAllEnvs();
});

// Pilot-1 item 5: the developer pages stay out of the jury's way on production only.
describe('developer pages', () => {
  it('are hidden on the production deployment only', () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    expect(devPagesHidden()).toBe(true);
    vi.stubEnv('VERCEL_ENV', 'preview');
    expect(devPagesHidden()).toBe(false);
    vi.stubEnv('VERCEL_ENV', '');
    expect(devPagesHidden()).toBe(false);
  });
});

// Pilot-2 item 1: one codebase, two sites.
describe('app mode', () => {
  it('is demo by default and for any unknown value', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_MODE', '');
    expect(appMode()).toBe('demo');
    vi.stubEnv('NEXT_PUBLIC_APP_MODE', 'Pilot ');
    expect(appMode()).toBe('demo');
    expect(isPilot()).toBe(false);
  });

  it('is pilot only when set to pilot', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_MODE', 'pilot');
    expect(appMode()).toBe('pilot');
    expect(isPilot()).toBe(true);
  });
});

describe('navigation on the pilot', () => {
  it('drops the scenario and the four views from « Comprendre », keeps the method and the replay', async () => {
    const { understandLinks } = await import('@/lib/nav');
    vi.stubEnv('NEXT_PUBLIC_APP_MODE', 'demo');
    expect(understandLinks().map((u) => u.href)).toEqual(expect.arrayContaining(['/scenario', '/vues', '/methode', '/retour']));
    vi.stubEnv('NEXT_PUBLIC_APP_MODE', 'pilot');
    const hrefs = understandLinks().map((u) => u.href);
    expect(hrefs).not.toContain('/scenario');
    expect(hrefs).not.toContain('/vues');
    expect(hrefs).toEqual(expect.arrayContaining(['/methode', '/retour']));
  });
});
