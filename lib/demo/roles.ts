// The one-click demo roles shown on the home page.
// Shared by the sign-in server action and by scripts/seed-demo.ts.
// The organisations are fictional and marked simulated (supabase/seed/demo-organisations.json).
// No password here: it comes from DEMO_ACCOUNT_PASSWORD in the server environment.

import type { MessageKey } from '@/lib/i18n';

export type OrganisationType = 'pharmacy' | 'wholesaler' | 'hospital_pharmacy' | 'coordinator';
export type ProfileRole = 'pharmacist' | 'wholesaler' | 'hospital_pharmacist' | 'coordinator';

export interface DemoRole {
  key: string;
  email: string;
  organisationId: string;
  profileRole: ProfileRole;
  /** Where the visitor lands after signing in. */
  home: string;
  labelKey: MessageKey;
  hintKey: MessageKey;
}

export const DEMO_ROLES = [
  {
    key: 'pharmacie-tunis',
    email: 'demo.pharmacie.tunis@rupturewatch.example',
    organisationId: '00000000-0000-4000-8000-000000000a01',
    profileRole: 'pharmacist',
    home: '/pharmacie',
    labelKey: 'core.roles.pharmacyTunis.label',
    hintKey: 'core.roles.pharmacyTunis.hint',
  },
  {
    key: 'pharmacie-sfax',
    email: 'demo.pharmacie.sfax@rupturewatch.example',
    organisationId: '00000000-0000-4000-8000-000000000a06',
    profileRole: 'pharmacist',
    home: '/pharmacie',
    labelKey: 'core.roles.pharmacySfax.label',
    hintKey: 'core.roles.pharmacySfax.hint',
  },
  {
    key: 'grossiste',
    email: 'demo.grossiste@rupturewatch.example',
    organisationId: '00000000-0000-4000-8000-000000000b01',
    profileRole: 'wholesaler',
    home: '/grossiste',
    labelKey: 'core.roles.wholesaler.label',
    hintKey: 'core.roles.wholesaler.hint',
  },
  {
    key: 'hopital',
    email: 'demo.hopital@rupturewatch.example',
    organisationId: '00000000-0000-4000-8000-000000000c01',
    profileRole: 'hospital_pharmacist',
    home: '/hopital',
    labelKey: 'core.roles.hospital.label',
    hintKey: 'core.roles.hospital.hint',
  },
  {
    key: 'coordination',
    email: 'demo.coordination@rupturewatch.example',
    organisationId: '00000000-0000-4000-8000-000000000d01',
    profileRole: 'coordinator',
    home: '/coordination',
    labelKey: 'core.roles.coordinator.label',
    hintKey: 'core.roles.coordinator.hint',
  },
] as const satisfies readonly DemoRole[];

export type DemoRoleKey = (typeof DEMO_ROLES)[number]['key'];

export function findDemoRole(key: string): DemoRole | undefined {
  return DEMO_ROLES.find((r) => r.key === key);
}

/** Home path for an organisation type. */
export const HOME_BY_TYPE: Record<OrganisationType, string> = {
  pharmacy: '/pharmacie',
  wholesaler: '/grossiste',
  hospital_pharmacy: '/hopital',
  coordinator: '/coordination',
};
