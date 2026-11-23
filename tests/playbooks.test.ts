import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ALLOCATION_PARAMS } from '@/lib/allocation/params';
import { DEMO_SHORTAGE_MOLECULE } from '@/lib/demo/shortage';
import { t } from '@/lib/i18n';
import { PLAYBOOKS, playbookById, playbookForMolecule, playbookPath } from '@/lib/playbooks';
import { DEFAULT_PARAMS } from '@/lib/signal';

// The draft playbook (session 6, part 4): one source of truth for its parameters, roles only,
// every clause waiting for its reviewers.

const ROOT = join(__dirname, '..');
const catalogueFile = readdirSync(join(ROOT, 'data/reference')).find((f) => /^cnam-vei-.*\.csv$/.test(f))!;
const catalogueMolecules = new Set(
  readFileSync(join(ROOT, 'data/reference', catalogueFile), 'utf8')
    .split('\n')
    .slice(1)
    .map((line) => line.split(',')[3])
    .filter(Boolean),
);

describe('draft playbooks', () => {
  it('there is one, for the showcase antiepileptic, keyed by its exact CNAM molecule name', () => {
    expect(PLAYBOOKS.map((p) => p.molecule)).toEqual(['LEVETIRACETAM']);
    expect(PLAYBOOKS[0].molecule).toBe(DEMO_SHORTAGE_MOLECULE);
    for (const p of PLAYBOOKS) expect(catalogueMolecules.has(p.molecule)).toBe(true);
    expect(playbookForMolecule('LEVETIRACETAM')).toBe(PLAYBOOKS[0]);
    expect(playbookForMolecule('levetiracetam')).toBeNull();
    expect(playbookForMolecule('AMLODIPINE')).toBeNull();
    expect(playbookById('levetiracetam')).toBe(PLAYBOOKS[0]);
    expect(playbookPath(PLAYBOOKS[0])).toBe('/methode/protocoles/levetiracetam');
  });

  it('its parameters are the evaluator’s and the split’s own objects, not copies', () => {
    for (const p of PLAYBOOKS) {
      expect(p.signal).toBe(DEFAULT_PARAMS);
      expect(p.allocation).toBe(ALLOCATION_PARAMS);
    }
    // No threshold typed in the playbook file: the only digits are its version and date.
    const source = readFileSync(join(ROOT, 'lib/playbooks/levetiracetam.ts'), 'utf8')
      .split('\n')
      .filter((line) => !line.trim().startsWith('//') && !/version:|draftedOn:/.test(line))
      .join('\n');
    expect(source).not.toMatch(/\d/);
  });

  it('shows the same values as params.ts', () => {
    const s = DEFAULT_PARAMS;
    expect(t('core.playbook.triggerConfirmed', { n: s.confirmMinPharmacies, pct: s.confirmMemberShare * 100, days: s.confirmWindowDays })).toContain(
      `au moins ${s.confirmMinPharmacies} pharmacies, ou ${s.confirmMemberShare * 100} %`,
    );
    expect(t('core.playbook.gateGeo', { n: s.confirmMinGovernorates })).toContain(`au moins ${s.confirmMinGovernorates} gouvernorats`);
    expect(t('core.playbook.splitReserve', { pct: ALLOCATION_PARAMS.hospitalReserveShare * 100 })).toContain(
      `${ALLOCATION_PARAMS.hospitalReserveShare * 100} %`,
    );
  });

  it('three clauses, each awaiting validation, with no content and only roles as reviewers', () => {
    for (const p of PLAYBOOKS) {
      expect(p.status).toBe('draft');
      expect(p.clauses.map((c) => [c.id, c.reviewers])).toEqual([
        ['continuity', ['hospital_pharmacy', 'clinical_reviewer']],
        ['orderCap', ['wholesaler', 'supply_coordinator']],
        ['substitution', ['qualified_clinical_reviewers']],
      ]);
      for (const c of p.clauses) {
        expect(c.state).toBe('pending_validation');
        expect(c.text).toBeNull();
      }
    }
    expect(t('core.playbook.pendingValidation')).toBe('En attente de validation');
    expect(t('core.playbook.statusDraft')).toBe('Brouillon');
  });

  it('every role, action and clause has its words', () => {
    for (const p of PLAYBOOKS) {
      for (const actors of Object.values(p.actors)) {
        for (const a of actors) {
          expect(t(`core.playbook.roles.${a.role}`)).not.toContain('core.playbook');
          for (const action of a.actions) expect(t(`core.playbook.actions.${action}`)).not.toContain('core.playbook');
        }
      }
      for (const c of p.clauses) {
        expect(t(`core.playbook.clauses.${c.id}`)).not.toContain('core.playbook');
        for (const r of c.reviewers) expect(t(`core.playbook.roles.${r}`)).not.toContain('core.playbook');
      }
    }
  });
});
