import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { publicSupabaseEnv, requireEnv } from '@/lib/env';

/**
 * Supabase client acting as the signed-in visitor (anon key + session cookie).
 * Row-level security applies. Use this for everything a visitor reads or writes.
 */
export async function createUserClient() {
  // Read cookies first: it marks the route as request-time, so it is never prerendered.
  const cookieStore = await cookies();
  const { url, anonKey } = publicSupabaseEnv();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // proxy.ts refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}

/** Client without any session: the public, anonymous view. */
export function createAnonClient() {
  const { url, anonKey } = publicSupabaseEnv();
  return createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

/**
 * Service role client. Bypasses row-level security.
 * Server code only (this file imports server-only). Never pass its results to a client unfiltered.
 */
export function createServiceClient() {
  const { url } = publicSupabaseEnv();
  return createClient(url, requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
