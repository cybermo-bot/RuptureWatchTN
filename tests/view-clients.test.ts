// /vues signs each panel in as its own demo account, and the public panel as nobody.

import { beforeAll, describe, expect, it, vi } from 'vitest';
import { findDemoRole } from '@/lib/demo/roles';

const signIns: string[] = [];

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => {
    const client = {
      signedInAs: null as string | null,
      auth: {
        async signInWithPassword({ email }: { email: string; password: string }) {
          signIns.push(email);
          client.signedInAs = email;
          return { data: { session: { expires_at: Math.floor(Date.now() / 1000) + 3600 } }, error: null };
        },
      },
    };
    return client;
  },
}));

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
  process.env.DEMO_ACCOUNT_PASSWORD = 'test-only';
});

describe('/vues clients', () => {
  it('signs in the pharmacy, wholesaler and coordination panels as their demo accounts', async () => {
    const { viewClients, VIEW_ROLES } = await import('@/lib/views/demo-clients');
    const clients = (await viewClients()) as unknown as Record<string, { signedInAs: string | null }>;
    expect(clients.pharmacy.signedInAs).toBe(findDemoRole(VIEW_ROLES.pharmacy)!.email);
    expect(clients.wholesaler.signedInAs).toBe(findDemoRole(VIEW_ROLES.wholesaler)!.email);
    expect(clients.coordination.signedInAs).toBe(findDemoRole(VIEW_ROLES.coordination)!.email);
    expect(findDemoRole(VIEW_ROLES.pharmacy)!.profileRole).toBe('pharmacist');
    expect(findDemoRole(VIEW_ROLES.wholesaler)!.profileRole).toBe('wholesaler');
    expect(findDemoRole(VIEW_ROLES.coordination)!.profileRole).toBe('coordinator');
  });

  it('gives the public panel a client with no session', async () => {
    const { viewClients } = await import('@/lib/views/demo-clients');
    const clients = (await viewClients()) as unknown as Record<string, { signedInAs: string | null }>;
    expect(clients.public.signedInAs).toBeNull();
  });

  it('keeps sessions instead of signing in on every page view', async () => {
    const { viewClients } = await import('@/lib/views/demo-clients');
    const before = signIns.length;
    await viewClients();
    await viewClients();
    expect(signIns.length).toBe(before);
  });
});
