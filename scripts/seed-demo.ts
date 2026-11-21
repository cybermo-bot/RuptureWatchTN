// Seeds the demo organisations (all simulated) and one auth user per role button.
//
//   npm run seed:demo
//
// Idempotent: re-running updates names and resets the demo users' password to
// DEMO_ACCOUNT_PASSWORD. Seeds no reports, notices or signals.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEMO_ROLES } from '../lib/demo/roles';
import { need, ROOT, serviceClient } from './lib/script-env';

interface SeedOrganisation {
  id: string;
  type: string;
  display_name: string;
  governorate_code: string;
}

async function main() {
  const supabase = serviceClient();
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
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
