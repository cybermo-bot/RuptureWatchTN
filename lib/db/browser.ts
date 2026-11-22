'use client';

import { createBrowserClient } from '@supabase/ssr';

// Browser client, used only for Supabase Realtime subscriptions. It reads the visitor's
// session from the cookies set by the server, so row-level security applies to every event.
// Only the public URL and publishable key are used here.

let client: ReturnType<typeof createBrowserClient> | null = null;

export function browserClient() {
  if (!client) {
    client = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  }
  return client;
}
