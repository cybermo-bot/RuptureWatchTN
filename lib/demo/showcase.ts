// The showcase medicines of the demonstration, in one list: the demo shortage (LEVETIRACETAM,
// "confirmée") and the four situations of the national picture (lib/demo/national.ts), each
// showing one rule at work. One juror reporting TAMOXIFENE from « Pharmacie démo A, Tunis » would
// turn "concentrated in Sfax, stays probable" into "confirmée" for every visitor, so the two
// one-click demo pharmacies cannot report them (pilot-1 item 3): their screens tag them, the
// report actions and the WhatsApp bot refuse them. scripts/clean-verification.ts reads the same
// list. Pure: no database access, safe in any bundle.

import { DEMO_ROLES } from './roles';

/** The demo shortage's molecule: a simulated "confirmée", for the video and the other screens. */
export const DEMO_SHORTAGE_MOLECULE = 'LEVETIRACETAM';

/** The national picture's four situations (lib/demo/national.ts). */
export const NATIONAL_MOLECULES = {
  probable: 'TAMOXIFENE',
  watchLocal: 'METFORMINE',
  watchForeign: 'AZATHIOPRINE',
  cleared: 'CIPROFLOXACINE',
} as const;

/** Every showcase molecule, by its exact catalogue name. */
export const SHOWCASE_MOLECULES: readonly string[] = [DEMO_SHORTAGE_MOLECULE, ...Object.values(NATIONAL_MOLECULES)];

/** The two one-click demo pharmacies (« Pharmacie démo A, Tunis » and « Pharmacie démo F, Sfax »). */
export const ONE_CLICK_PHARMACY_IDS: readonly string[] = DEMO_ROLES.filter((r) => r.profileRole === 'pharmacist').map((r) => r.organisationId);

export function isShowcaseMolecule(name: string): boolean {
  return SHOWCASE_MOLECULES.includes(name.trim().toUpperCase());
}

export function isOneClickPharmacy(organisationId: string): boolean {
  return ONE_CLICK_PHARMACY_IDS.includes(organisationId);
}

/** True when this pharmacy may not report this medicine: a one-click demo pharmacy and a showcase molecule. */
export function showcaseLocked(organisationId: string, moleculeName: string): boolean {
  return isOneClickPharmacy(organisationId) && isShowcaseMolecule(moleculeName);
}
