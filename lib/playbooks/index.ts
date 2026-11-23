// The draft playbooks, by molecule. One for now: LEVETIRACETAM (session 6, part 4).

import { LEVETIRACETAM_PLAYBOOK } from './levetiracetam';
import type { Playbook } from './types';

export type { Playbook, PlaybookAction, PlaybookClause, PlaybookRole } from './types';

export const PLAYBOOKS: readonly Playbook[] = [LEVETIRACETAM_PLAYBOOK];

/** The playbook for a molecule, by its exact catalogue name, or null. */
export function playbookForMolecule(moleculeName: string | null | undefined): Playbook | null {
  if (!moleculeName) return null;
  return PLAYBOOKS.find((p) => p.molecule === moleculeName) ?? null;
}

export function playbookById(id: string): Playbook | null {
  return PLAYBOOKS.find((p) => p.id === id) ?? null;
}

/** Where a playbook is read: a page under the methods page. */
export const playbookPath = (p: Playbook) => `/methode/protocoles/${p.id}`;
