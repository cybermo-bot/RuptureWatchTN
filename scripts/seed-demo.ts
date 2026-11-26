// Seeds the demo organisations (all simulated) and one auth user per role button.
//
//   npm run seed:demo
//
// Idempotent: re-running updates names and resets the demo users' password to
// DEMO_ACCOUNT_PASSWORD, and adds the demo pharmacies' followed molecules
// (supabase/seed/demo-follows.json). Seeds no reports, notices or signals.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEMO_ROLES } from '../lib/demo/roles';
import { need, ROOT, serviceClient } from './lib/script-env';

interface SeedOrganisation {
  id: string;
  type: string;
  display_name: string;
  governorate_code: string;
  /** Demo pharmacies only: fictional points, never a real pharmacy's address. */
  latitude?: number;
  longitude?: number;
  public_address?: string;
}

async function main() {
  const supabase = serviceClient({ demoOnly: true });
  const password = need('DEMO_ACCOUNT_PASSWORD');
  if (password.length < 24) {
    console.error('DEMO_ACCOUNT_PASSWORD should be a long random string (24 characters or more).');
    process.exit(1);
  }

  const seed = JSON.parse(readFileSync(join(ROOT, 'supabase/seed/demo-organisations.json'), 'utf8')) as {
    organisations: SeedOrganisation[];
  };
  const rows = seed.organisations.map((o) => ({ ...o, origin: 'simulated' as const }));
  const { error: orgError } = await supabase.from('organisations').upsert(rows, { onConflict: 'id' });
  if (orgError) throw new Error(`organisations upsert failed: ${orgError.message}`);
  console.log(`Organisations: ${rows.length} upserted (origin simulated).`);

  // Existing users, by email.
  const existing = new Map<string, string>();
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers failed: ${error.message}`);
    for (const u of data.users) if (u.email) existing.set(u.email.toLowerCase(), u.id);
    if (data.users.length < 200) break;
  }

  for (const role of DEMO_ROLES) {
    let userId = existing.get(role.email);
    if (userId) {
      const { error } = await supabase.auth.admin.updateUserById(userId, { password, email_confirm: true });
      if (error) throw new Error(`update ${role.key} failed: ${error.message}`);
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email: role.email,
        password,
        email_confirm: true,
        app_metadata: { demo: true, role: role.key },
      });
      if (error || !data.user) throw new Error(`create ${role.key} failed: ${error?.message}`);
      userId = data.user.id;
    }
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ user_id: userId, organisation_id: role.organisationId, role: role.profileRole }, { onConflict: 'user_id' });
    if (profileError) throw new Error(`profile ${role.key} failed: ${profileError.message}`);
    console.log(`Demo user ready: ${role.key}`);
  }

  await seedFollows(supabase);
}

/** Followed molecules of the demo pharmacies. Fails if a name is not in the imported catalogue. */
async function seedFollows(supabase: ReturnType<typeof serviceClient>) {
  const follows = JSON.parse(readFileSync(join(ROOT, 'supabase/seed/demo-follows.json'), 'utf8')) as {
    pharmacies: string[];
    molecules: string[];
  };
  const { data, error } = await supabase.from('molecules').select('id, name').in('name', follows.molecules);
  if (error) throw new Error(`molecules lookup failed: ${error.message}`);
  const found = new Map((data ?? []).map((m) => [m.name as string, m.id as string]));
  const missing = follows.molecules.filter((name) => !found.has(name));
  if (missing.length) throw new Error(`Not in the catalogue (run catalogue:import first?): ${missing.join(', ')}`);

  const rows = follows.pharmacies.flatMap((key) => {
    const role = DEMO_ROLES.find((r) => r.key === key);
    if (!role) throw new Error(`Unknown demo role: ${key}`);
    return follows.molecules.map((name) => ({ organisation_id: role.organisationId, molecule_id: found.get(name)! }));
  });
  const { error: followError } = await supabase
    .from('followed_molecules')
    .upsert(rows, { onConflict: 'organisation_id,molecule_id', ignoreDuplicates: true });
  if (followError) throw new Error(`follows failed: ${followError.message}`);
  console.log(`Follows: ${follows.molecules.length} molecules for ${follows.pharmacies.length} demo pharmacies.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
