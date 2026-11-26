// Reads environment values. Error messages name the missing variable, never print a value.

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable ${name}. See .env.example.`);
  }
  return value;
}

// NEXT_PUBLIC_ values must be read with a literal name so Next inlines them in client code.
export function publicSupabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url) throw new Error('Missing environment variable NEXT_PUBLIC_SUPABASE_URL. See .env.example.');
  if (!anonKey) throw new Error('Missing environment variable NEXT_PUBLIC_SUPABASE_ANON_KEY. See .env.example.');
  return { url, anonKey };
}

/**
 * Developer check pages (/dev/carte, /dev/search) answer 404 on the production deployment, so a
 * juror never lands on them (pilot-1 item 5). Previews and local runs keep them.
 */
export function devPagesHidden(): boolean {
  return process.env.VERCEL_ENV === 'production';
}
