import type { OrganisationType } from '@/lib/demo/roles';

const ACCESS = {
  pharmacie: ['pharmacy'],
  grossiste: ['wholesaler'],
  institution: ['coordinator', 'pharmacists_order', 'central_pharmacy', 'hospital_pharmacy'],
} as const satisfies Record<string, readonly OrganisationType[]>;

export type AccessAudience = keyof typeof ACCESS;

export function isAccessAudience(value: unknown): value is AccessAudience {
  return typeof value === 'string' && Object.hasOwn(ACCESS, value);
}

export function canEnterAudience(audience: AccessAudience, organisation: OrganisationType): boolean {
  const allowed: readonly OrganisationType[] = ACCESS[audience];
  return allowed.includes(organisation);
}
