'use server';

import { redirect } from 'next/navigation';
import { createUserClient } from '@/lib/db/server';
import { findDemoRole } from '@/lib/demo/roles';

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
    redirect('/?erreur=connexion');
  }
  redirect(role.home);
}

/** "Changer de rôle": ends the demo session and returns to the role picker. */
export async function switchRole() {
  const supabase = await createUserClient();
  await supabase.auth.signOut();
  redirect('/#roles');
}
