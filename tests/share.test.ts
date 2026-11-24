import { describe, expect, it } from 'vitest';
import { translator } from '@/lib/i18n';
import { isSimulatedStatus, publicStatusSentence, shareText } from '@/lib/public/share';

// Part 8, item 4: "Partager ce statut". The shared text is the public status sentence, "Simulé"
// when the status rests on demonstration data, and always the disclaimer.

const fr = translator('fr');
const ar = translator('ar');
const SINCE = '2026-11-14T09:00:00Z';

describe('share a verified status', () => {
  it('shares the confirmed sentence, the simulated mention and the disclaimer', () => {
    const text = shareText('LEVETIRACETAM', { level: 'confirmed', since: SINCE, origins: ['simulated'], evaluatedAt: null }, fr, 'fr');
    expect(text.split('\n')).toEqual([
      'LEVETIRACETAM : Rupture confirmée depuis le 14 novembre 2026.',
      'Simulé : données de démonstration, pas des signalements réels.',
      'Ceci n’est pas une déclaration officielle de rupture.',
    ]);
  });

  it('says nothing simulated for tester or official data, and keeps the disclaimer', () => {
    const text = shareText('X', { level: 'cleared', since: SINCE, origins: ['tester'], evaluatedAt: null }, fr, 'fr');
    expect(text).toContain('Rupture levée le 14 novembre 2026.');
    expect(text).not.toContain('Simulé');
    expect(text).toContain('Ceci n’est pas une déclaration officielle de rupture.');
  });

  it('below "confirmée" says only "Aucune rupture confirmée à ce jour" (rule 10)', () => {
    const none = { level: 'none' as const, since: null, origins: [], evaluatedAt: null };
    expect(publicStatusSentence(none, fr, 'fr')).toBe('Aucune rupture confirmée à ce jour.');
    expect(isSimulatedStatus({ ...none, origins: ['simulated'], evaluatedAt: null })).toBe(false);
    expect(shareText('X', none, fr, 'fr')).not.toMatch(/probable|surveillance/i);
  });

  it('is written in Arabic for an Arabic visitor', () => {
    const text = shareText('LEVETIRACETAM', { level: 'confirmed', since: SINCE, origins: ['simulated'], evaluatedAt: null }, ar, 'ar');
    expect(text).toContain('انقطاع مؤكَّد');
    expect(text).toContain('محاكاة');
    expect(text).toContain('هذا ليس إعلانًا رسميًا عن انقطاع الدواء.');
  });
});
