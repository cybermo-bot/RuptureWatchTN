import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { HINT_MOLECULE, hintFor } from '@/lib/demo/hints';
import { NATIONAL_MOLECULES as NATIONAL_FROM_NATIONAL } from '@/lib/demo/national';
import { DEMO_ROLES } from '@/lib/demo/roles';
import { DEMO_SHORTAGE_MOLECULE as SHORTAGE_FROM_SHORTAGE } from '@/lib/demo/shortage';
import {
  DEMO_SHORTAGE_MOLECULE,
  isShowcaseMolecule,
  NATIONAL_MOLECULES,
  ONE_CLICK_PHARMACY_IDS,
  SHOWCASE_MOLECULES,
  showcaseLocked,
} from '@/lib/demo/showcase';
import { t } from '@/lib/i18n';

// Pilot-1 item 3: one list of showcase medicines, which the two one-click demo pharmacies cannot
// report, so a juror cannot turn the demonstration's "probable" into "confirmée" for everyone.

const TUNIS = DEMO_ROLES.find((r) => r.key === 'pharmacie-tunis')!.organisationId;
const SFAX = DEMO_ROLES.find((r) => r.key === 'pharmacie-sfax')!.organisationId;
const TESTER = '00000000-0000-4000-8000-00000000c001';

describe('showcase medicines', () => {
  it('are the demo shortage and the four national situations, from one list', () => {
    expect(SHOWCASE_MOLECULES).toEqual([DEMO_SHORTAGE_MOLECULE, ...Object.values(NATIONAL_MOLECULES)]);
    expect(SHOWCASE_MOLECULES).toEqual(['LEVETIRACETAM', 'TAMOXIFENE', 'METFORMINE', 'AZATHIOPRINE', 'CIPROFLOXACINE']);
    // The demo scripts read the same constants, not a second hand-typed list.
    expect(SHORTAGE_FROM_SHORTAGE).toBe(DEMO_SHORTAGE_MOLECULE);
    expect(NATIONAL_FROM_NATIONAL).toBe(NATIONAL_MOLECULES);
    const clean = readFileSync(join(__dirname, '..', 'scripts', 'clean-verification.ts'), 'utf8');
    expect(clean).toContain('SHOWCASE_MOLECULES');
    expect(clean).not.toMatch(/'TAMOXIFENE'|'LEVETIRACETAM'/);
  });

  it('are locked for the two one-click demo pharmacies only', () => {
    expect([...ONE_CLICK_PHARMACY_IDS].sort()).toEqual([TUNIS, SFAX].sort());
    for (const id of [TUNIS, SFAX]) {
      expect(showcaseLocked(id, 'TAMOXIFENE')).toBe(true);
      expect(showcaseLocked(id, 'levetiracetam ')).toBe(true);
      expect(showcaseLocked(id, 'CARBAMAZEPINE')).toBe(false);
    }
    expect(showcaseLocked(TESTER, 'TAMOXIFENE')).toBe(false);
    expect(isShowcaseMolecule('AMLODIPINE')).toBe(false);
  });

  it('are never what the pharmacy hint suggests reporting', () => {
    expect(isShowcaseMolecule(HINT_MOLECULE)).toBe(false);
    const hint = hintFor('pharmacy', 'simulated')!;
    const text = t(hint.text, hint.vars);
    expect(text).toContain(HINT_MOLECULE);
    for (const name of SHOWCASE_MOLECULES) expect(text).not.toContain(name);
    // Both one-click pharmacies follow it (supabase/seed/demo-follows.json), so it is in their list.
    const follows = JSON.parse(readFileSync(join(__dirname, '..', 'supabase', 'seed', 'demo-follows.json'), 'utf8')) as { molecules: string[] };
    expect(follows.molecules).toContain(HINT_MOLECULE);
  });
});
