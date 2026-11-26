import { describe, expect, it } from 'vitest';
import { translator } from '@/lib/i18n';
import { isSimulatedStatus, publicStatusSentence, shareText, simulatedBanner, statusLines } from '@/lib/public/share';

// Part 8, item 4: "Partager ce statut". The shared text is the public status sentence and always
// the disclaimer. Pilot-1 item 1: when the status rests on demonstration data, the demonstration
// banner is its first line (and the share card's headline), so it cannot travel as a rumour.

const fr = translator('fr');
const ar = translator('ar');
const SINCE = '2026-11-14T09:00:00Z';

describe('share a verified status', () => {
  it('starts a simulated status with the demonstration banner, then the sentence, its scope and the disclaimer', () => {
    const text = shareText('LEVETIRACETAM', { level: 'confirmed', since: SINCE, origins: ['simulated'], evaluatedAt: null }, fr, 'fr');
    expect(text.split('\n')).toEqual([
      'Démonstration : ce niveau vient de données simulées. Il ne dit rien de la situation réelle de ce médicament.',
      'LEVETIRACETAM : Rupture confirmée depuis le 14 novembre 2026.',
      'Ce signal regroupe les signalements par molécule. La disponibilité peut varier selon la marque, le dosage ou la forme.',
      'Ceci n’est pas une déclaration officielle de rupture.',
    ]);
    expect(text.startsWith('Démonstration')).toBe(true);
  });

  it('gives the share card and the page description the banner as their first line when the status is simulated', () => {
    const simulated = { level: 'confirmed' as const, since: SINCE, origins: ['simulated' as const], evaluatedAt: null };
    expect(simulatedBanner(simulated, fr)).toMatch(/^Démonstration : /);
    expect(statusLines(simulated, fr, 'fr')[0]).toMatch(/^Démonstration : /);
    // A status resting partly on simulated rows is still a demonstration: the banner stays.
    expect(simulatedBanner({ ...simulated, origins: ['tester', 'simulated'] }, fr)).toMatch(/^Démonstration/);
    expect(simulatedBanner({ ...simulated, origins: ['tester'] }, fr)).toBeNull();
    expect(simulatedBanner({ level: 'none', since: null, origins: ['simulated'], evaluatedAt: null }, fr)).toBeNull();
  });

  it('says nothing simulated for tester or official data, and keeps the disclaimer', () => {
    const text = shareText('X', { level: 'cleared', since: SINCE, origins: ['tester'], evaluatedAt: null }, fr, 'fr');
    expect(text).toContain('Rupture levée le 14 novembre 2026.');
    expect(text).not.toContain('Simulé');
    expect(text).not.toContain('Démonstration');
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
    expect(text).toContain('تُجمّع البلاغات حسب المادة الفعّالة.');
    expect(text.startsWith('عرض تجريبي')).toBe(true);
    expect(text).toContain('محاكاة');
    expect(text).toContain('هذا ليس إعلانًا رسميًا عن انقطاع الدواء.');
  });
});
