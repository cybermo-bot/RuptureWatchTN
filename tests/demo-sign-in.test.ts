// Pilot-2 item 1: on the pilot site, the one-click demo sign-in is refused by the server, even
// when a form is posted by hand: no Supabase sign-in is attempted.

import { afterEach, describe, expect, it, vi } from 'vitest';

const signInWithPassword = vi.fn(async () => ({ error: null }));
vi.mock('@/lib/db/server', () => ({ createUserClient: vi.fn(async () => ({ auth: { signInWithPassword } })) }));
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`redirect ${url}`);
  },
}));

const { signInAsDemoRole } = await import('@/app/actions/auth');

afterEach(() => {
  vi.unstubAllEnvs();
  signInWithPassword.mockClear();
});

const form = (role: string) => {
  const data = new FormData();
  data.set('role', role);
  return data;
};

describe('signInAsDemoRole', () => {
  it('refuses on the pilot site without trying to sign in', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_MODE', 'pilot');
    vi.stubEnv('DEMO_ACCOUNT_PASSWORD', 'test-password');
    await expect(signInAsDemoRole(form('pharmacie-tunis'))).rejects.toThrow('redirect /?erreur=role');
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it('still signs in on the demo site', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_MODE', 'demo');
    vi.stubEnv('DEMO_ACCOUNT_PASSWORD', 'test-password');
    await expect(signInAsDemoRole(form('pharmacie-tunis'))).rejects.toThrow(/redirect \/pharmacie/);
    expect(signInWithPassword).toHaveBeenCalledTimes(1);
  });
});

// Pilot-2 item 2: on the pilot, a pharmacy signing in lands on « Mes médicaments » through the
// first-visit guide; the demo keeps « Signaler » (video and e2e).
describe('signInToSpace for a pharmacy', () => {
  it('goes through the guide on the pilot, to « Signaler » on the demo', async () => {
    vi.resetModules();
    vi.doMock('@/lib/auth/session', () => ({
      getCurrentSession: async () => ({ organisation: { type: 'pharmacy', origin: 'tester' } }),
    }));
    const { signInToSpace } = await import('@/app/actions/auth');
    const data = new FormData();
    data.set('espace', 'pharmacie');
    data.set('email', 'pharmacie@example.org');
    data.set('password', 'secret');
    vi.stubEnv('NEXT_PUBLIC_APP_MODE', 'pilot');
    await expect(signInToSpace(data)).rejects.toThrow('redirect /pharmacie/bienvenue?premiere=1');
    vi.stubEnv('NEXT_PUBLIC_APP_MODE', 'demo');
    await expect(signInToSpace(data)).rejects.toThrow('redirect /pharmacie/signaler');
    vi.doUnmock('@/lib/auth/session');
  });
});
