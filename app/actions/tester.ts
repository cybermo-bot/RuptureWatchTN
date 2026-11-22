'use server';

import { randomBytes, randomUUID } from 'node:crypto';
import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth/session';
import { createServiceClient, createUserClient } from '@/lib/db/server';
import { t } from '@/lib/i18n';
import { isValidInviteCode } from '@/lib/tester';

const GOVERNORATE = /^TN-\d{2}$/;

/**
 * A real pharmacist joins the test. Only a governorate is asked. A pharmacy organisation
 * (origin tester, "Pharmacie testeuse n° N, <gouvernorat>") and an account are created, and
 * the tester is signed in. The account's email is a random address on the reserved .example
 * domain and its password is random and never stored: the session cookie is the only key.
 */
export async function joinAsTester(formData: FormData): Promise<void> {
  const code = String(formData.get('code') ?? '');
  const governorate = String(formData.get('governorate') ?? '');
  if (!isValidInviteCode(code)) redirect('/');
  const back = `/rejoindre/${encodeURIComponent(code)}`;
  if (!GOVERNORATE.test(governorate)) redirect(`${back}?erreur=gouvernorat`);

  // Already a tester on this browser: never create a second pharmacy for the same person.
  const current = await getCurrentSession();
  if (current?.organisation.origin === 'tester' && current.organisation.type === 'pharmacy') redirect('/pharmacie');

  const admin = createServiceClient();
  const email = `testeur-${randomUUID()}@rupturewatch.example`;
  const password = randomBytes(32).toString('base64url');

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { tester: true },
  });
  if (createError || !created.user) {
    console.error('tester: create user failed', { code: createError?.code, status: createError?.status });
    redirect(`${back}?erreur=1`);
  }

  const { error: orgError } = await admin.rpc('create_tester_pharmacy', {
    p_user_id: created.user.id,
    p_governorate_code: governorate,
    p_name_template: t('core.tester.nameTemplate'),
  });
  if (orgError) {
    console.error('tester: create pharmacy failed', { code: orgError.code });
    await admin.auth.admin.deleteUser(created.user.id);
    redirect(`${back}?erreur=${orgError.code === '22023' ? 'gouvernorat' : '1'}`);
  }

  const supabase = await createUserClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    console.error('tester: sign in failed', { code: signInError.code, status: signInError.status });
    redirect(`${back}?erreur=1`);
  }
  redirect('/pharmacie');
}
