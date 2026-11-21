import 'server-only';
import { cache } from 'react';
import { createUserClient } from '@/lib/db/server';
import type { OrganisationType, ProfileRole } from '@/lib/demo/roles';
import type { Origin } from '@/lib/signal';

export interface CurrentSession {
  userId: string;
  role: ProfileRole;
  organisation: {
    id: string;
    type: OrganisationType;
    displayName: string;
    governorateCode: string;
    governorateName: string | null;
    origin: Origin;
  };
}

/**
 * The signed-in visitor and their organisation, read through row-level security
 * (a user can only read their own profile and their own organisation).
 * Returns null when nobody is signed in or the account has no profile.
 */
export const getCurrentSession = cache(async (): Promise<CurrentSession | null> => {
  const supabase = await createUserClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select(
      'user_id, role, organisations ( id, type, display_name, governorate_code, origin, governorates ( name_fr ) )',
    )
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data || !data.organisations) return null;
  const org = data.organisations as unknown as {
    id: string;
    type: OrganisationType;
    display_name: string;
    governorate_code: string;
    origin: Origin;
    governorates: { name_fr: string } | null;
  };

  return {
    userId,
    role: data.role as ProfileRole,
    organisation: {
      id: org.id,
      type: org.type,
      displayName: org.display_name,
      governorateCode: org.governorate_code,
      governorateName: org.governorates?.name_fr ?? null,
      origin: org.origin,
    },
  };
});
