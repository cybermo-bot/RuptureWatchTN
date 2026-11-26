// Environment for scripts run from the team lead's machine.
// Loads .env.local if present (Node's built-in loader, no dependency). Never prints values.

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

export const ROOT = join(__dirname, '..', '..');

export function loadLocalEnv() {
  const file = join(ROOT, '.env.local');
  if (existsSync(file)) process.loadEnvFile(file);
}

export function need(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing ${name}. Add it to .env.local (see .env.example).`);
    process.exit(1);
  }
  return value;
}

const normalise = (url: string) => url.trim().replace(/\/+$/, '').toLowerCase();

/**
 * Whether a Supabase URL is the demo database: listed in DEMO_SUPABASE_URL (comma-separated).
 * Nothing listed means no database is the demo one.
 */
export function isDemoDatabase(url: string, allowlist: string | undefined): boolean {
  const allowed = (allowlist ?? '').split(',').map(normalise).filter(Boolean);
  return allowed.length > 0 && allowed.includes(normalise(url));
}

/**
 * The service-role client of scripts. With `demoOnly`, the scripts that write or wipe demo data
 * (seed:demo, demo:*, verify:clean, which deletes every tester pharmacy) refuse any database but
 * the demo one, so they can never run on the pilot (pilot-2 item 1). The imports
 * (catalogue:import, notices:import) are not demo-only: the pilot needs them.
 */
export function serviceClient(options: { demoOnly?: boolean } = {}) {
  loadLocalEnv();
  const url = need('NEXT_PUBLIC_SUPABASE_URL');
  if (options.demoOnly && !isDemoDatabase(url, process.env.DEMO_SUPABASE_URL)) {
    console.error(
      'Refused: this script writes demo data and runs only on the demo database. ' +
        'Its URL must be listed in DEMO_SUPABASE_URL (.env.local), and NEXT_PUBLIC_SUPABASE_URL is not.',
    );
    process.exit(1);
  }
  return createClient(url, need('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
