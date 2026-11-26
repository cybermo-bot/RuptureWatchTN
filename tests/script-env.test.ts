// Pilot-2 item 1: the scripts that write or wipe demo data refuse any database but the demo one,
// so seed:demo, demo:* and verify:clean (which deletes every tester pharmacy) never run on the pilot.

import { afterEach, describe, expect, it, vi } from 'vitest';

// Never load the real .env.local in a test.
vi.mock('node:fs', async (importOriginal) => ({ ...(await importOriginal<typeof import('node:fs')>()), existsSync: () => false }));

const { isDemoDatabase, serviceClient } = await import('../scripts/lib/script-env');

const DEMO = 'https://demo-project.supabase.co';
const PILOT = 'https://pilot-project.supabase.co';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('isDemoDatabase', () => {
  it('accepts only a URL listed in DEMO_SUPABASE_URL', () => {
    expect(isDemoDatabase(DEMO, DEMO)).toBe(true);
    expect(isDemoDatabase(`${DEMO}/`, ` ${DEMO.toUpperCase()} `)).toBe(true);
    expect(isDemoDatabase(DEMO, `${PILOT},${DEMO}`)).toBe(true);
    expect(isDemoDatabase(PILOT, DEMO)).toBe(false);
  });

  it('accepts nothing when no demo database is named', () => {
    expect(isDemoDatabase(DEMO, undefined)).toBe(false);
    expect(isDemoDatabase(DEMO, '')).toBe(false);
    expect(isDemoDatabase(DEMO, ' , ')).toBe(false);
  });
});

describe('serviceClient({ demoOnly: true })', () => {
  function stub(url: string, allowlist: string) {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', url);
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-key');
    vi.stubEnv('DEMO_SUPABASE_URL', allowlist);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    return vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`exit ${code}`);
    }) as never);
  }

  it('refuses the pilot database, before any client is made', () => {
    const exit = stub(PILOT, DEMO);
    expect(() => serviceClient({ demoOnly: true })).toThrow('exit 1');
    expect(exit).toHaveBeenCalledWith(1);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('DEMO_SUPABASE_URL'));
  });

  it('refuses when DEMO_SUPABASE_URL is unset', () => {
    stub(DEMO, '');
    expect(() => serviceClient({ demoOnly: true })).toThrow('exit 1');
  });

  it('accepts the demo database', () => {
    const exit = stub(DEMO, DEMO);
    expect(serviceClient({ demoOnly: true })).toBeTruthy();
    expect(exit).not.toHaveBeenCalled();
  });

  it('leaves the imports free to run on the pilot', () => {
    const exit = stub(PILOT, DEMO);
    expect(serviceClient()).toBeTruthy();
    expect(exit).not.toHaveBeenCalled();
  });
});
