import { afterEach, describe, expect, it, vi } from 'vitest';
import { devPagesHidden } from '@/lib/env';

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
