// Supabase clients signed in as the demo accounts, for /vues: each panel reads through its own
// role's session, so the database's access rules decide what it gets. These are the same
// accounts any visitor opens in one click from the home page, so nothing new is exposed.
// Sessions are kept in memory per server instance and renewed before they expire, to stay
// well under Supabase's sign-in rate limit.

import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { findDemoRole, type DemoRoleKey } from '@/lib/demo/roles';
import { publicSupabaseEnv, requireEnv } from '@/lib/env';
import type { PanelKey, ViewClients } from './four-views';

interface Cached {
  client: SupabaseClient;
  expiresAt: number;
}

const cache = new Map<DemoRoleKey, Promise<Cached>>();
const MARGIN_MS = 5 * 60_000;

async function signIn(key: DemoRoleKey): Promise<Cached> {
  const role = findDemoRole(key);
  if (!role) throw new Error(`Unknown demo role ${key}`);
  const { url, anonKey } = publicSupabaseEnv();
  const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInWithPassword({ email: role.email, password: requireEnv('DEMO_ACCOUNT_PASSWORD') });
  if (error || !data.session) throw new Error(`demo sign-in ${key} failed: ${error?.status ?? ''} ${error?.code ?? ''}`);
  return { client, expiresAt: (data.session.expires_at ?? 0) * 1000 };
}

/** A client signed in as the demo account `key`. */
export async function demoClient(key: DemoRoleKey): Promise<SupabaseClient> {
  const current = cache.get(key);
  if (current) {
    try {
      const c = await current;
      if (c.expiresAt - MARGIN_MS > Date.now()) return c.client;
    } catch {
      // A failed sign-in is retried below.
    }
  }
  const next = signIn(key);
  cache.set(key, next);
  next.catch(() => cache.delete(key));
  return (await next).client;
}

/** The public, anonymous client (no session at all). */
export function anonClient(): SupabaseClient {
  const { url, anonKey } = publicSupabaseEnv();
  return createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** The demo account behind each signed-in panel of /vues. The public panel has no account. */
export const VIEW_ROLES = {
  pharmacy: 'pharmacie-tunis',
  wholesaler: 'grossiste',
  coordination: 'coordination',
} as const satisfies Record<Exclude<PanelKey, 'public'>, DemoRoleKey>;

/** One client per panel: each signed-in panel as its own demo account, the public as nobody. */
export async function viewClients(): Promise<ViewClients> {
  const [pharmacy, wholesaler, coordination] = await Promise.all([
    demoClient(VIEW_ROLES.pharmacy),
    demoClient(VIEW_ROLES.wholesaler),
    demoClient(VIEW_ROLES.coordination),
  ]);
  return { pharmacy, wholesaler, coordination, public: anonClient() };
}

/** The demo pharmacy's organisation, whose own name its panel may show. */
export function viewPharmacyOrganisationId(): string {
  return findDemoRole(VIEW_ROLES.pharmacy)!.organisationId;
}
