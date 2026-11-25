'use server';

import { redirect } from 'next/navigation';
import { canEnterAudience, isAccessAudience } from '@/lib/auth/access';
import { getCurrentSession } from '@/lib/auth/session';
import { createUserClient } from '@/lib/db/server';
import { findDemoRole, HOME_BY_TYPE } from '@/lib/demo/roles';

/**
 * One-click demo sign-in. The visitor only sends a role key from a fixed list;
 * the password stays in the server environment and never reaches the browser.
 */
export async function signInAsDemoRole(formData: FormData) {
  const role = findDemoRole(String(formData.get('role') ?? ''));
  if (!role) redirect('/?erreur=role');

  const password = process.env.DEMO_ACCOUNT_PASSWORD;
  if (!password) {
    console.error('signInAsDemoRole: DEMO_ACCOUNT_PASSWORD is not set');
    redirect('/?erreur=connexion');
  }

  const supabase = await createUserClient();
  const { error } = await supabase.auth.signInWithPassword({ email: role.email, password });
  if (error) {
    console.error('signInAsDemoRole failed', { role: role.key, code: error.code, status: error.status });
    // 429: Supabase limits sign-ins per IP, and every demo sign-in comes from this server.
    redirect(error.status === 429 ? '/?erreur=occupe' : '/?erreur=connexion');
  }
  redirect(role.home);
}

/** Existing professional accounts use the organisation assigned to their verified session. */
export async function signInToSpace(formData: FormData) {
  const audience = formData.get('espace');
  if (!isAccessAudience(audience)) redirect('/#roles');

  const address = formData.get('email');
  const password = formData.get('password');
  const email = typeof address === 'string' ? address.trim() : '';
  const back = `/connexion/${audience}`;
  if (!email || email.length > 254 || typeof password !== 'string' || !password || password.length > 1024) {
    redirect(`${back}?erreur=connexion`);
  }

  const client = await createUserClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) redirect(`${back}?erreur=${error.status === 429 ? 'occupe' : 'connexion'}`);

  const session = await getCurrentSession();
  if (!session || !canEnterAudience(audience, session.organisation.type)) {
    await client.auth.signOut({ scope: 'local' });
    redirect(`${back}?erreur=connexion`);
  }

  const type = session.organisation.type;
  redirect(type === 'pharmacy' ? '/pharmacie/signaler' : HOME_BY_TYPE[type]);
}

/** "Changer de rôle": ends the demo session and returns to the role picker. */
export async function switchRole() {
  const supabase = await createUserClient();
  // Local scope: the demo accounts are shared, so never end other visitors' sessions.
  await supabase.auth.signOut({ scope: 'local' });
  redirect('/#roles');
}
