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

export function serviceClient() {
  loadLocalEnv();
  return createClient(need('NEXT_PUBLIC_SUPABASE_URL'), need('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
