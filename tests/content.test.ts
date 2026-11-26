// The team's content files are used word for word, and every rule of lib/signal can be explained.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import core from '@/messages/fr/core.json';
import type { RuleId } from '@/lib/signal';
import { t, tList } from '@/lib/i18n';

const content = (name: string) => {
  const json = JSON.parse(readFileSync(join(__dirname, '..', 'docs', 'content', name), 'utf8'));
  delete json._note;
  return json;
};

// Kept in step with the RuleId union by the type below: adding a rule without listing it fails tsc.
const RULES = {
  no_evidence: true,
  foreign_notice_only: true,
  local_reports_below_threshold: true,
  two_pharmacies_7d: true,
  local_report_plus_foreign_notice: true,
  single_governorate_cap: true,
  confirmed_threshold: true,
  hold_until_delivered: true,
  quiet_period_downgrade: true,
  delivered_again_cleared: true,
  cleared_expired: true,
} satisfies Record<RuleId, true>;

describe('team content in messages/fr/core.json', () => {
  it('guidance is copied word for word from docs/content/guidance.fr.json', () => {
    expect(core.guidance).toEqual(content('guidance.fr.json'));
  });

  it('rule sentences are copied word for word from docs/content/rules.fr.json', () => {
    expect(core.rules).toEqual(content('rules.fr.json'));
  });

  it.each(Object.keys(RULES))('rule %s has a sentence', (rule) => {
    const sentence = (core.rules as Record<string, string>)[rule];
    expect(typeof sentence).toBe('string');
    expect(sentence.length).toBeGreaterThan(10);
  });

  it('every rule sentence has a level guidance and the disclaimer is the product rule line', () => {
    expect(t('core.guidance.disclaimer')).toBe("Ceci n'est pas une déclaration officielle de rupture.");
    for (const level of ['watch', 'likely', 'confirmed', 'cleared'] as const) {
      expect(tList(`core.guidance.levels.${level}.guidance`).length).toBeGreaterThan(0);
    }
  });
});

// Pilot-1 item 6: no raw rule code on any screen. The "Pourquoi ?" details (RuleDetails), which
// every level journal uses (recent changes, coordination journal and decision, scenario), show
// the rule's name from the methods page, never its code; the code stays only in the link anchor.
describe('rule names on screen', () => {
  it.each(Object.keys(RULES))('rule %s has a name, and "Pourquoi ?" shows it instead of the code', async (rule) => {
    const { createElement } = await import('react');
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { RuleDetails, ruleName } = await import('@/components/LevelExplanation');
    const name = ruleName(rule as RuleId);
    expect(name).toBe(t(`core.method.rules.${rule as RuleId}.name`));
    expect(name).not.toMatch(/_/);
    const html = renderToStaticMarkup(createElement(RuleDetails, { rule: rule as RuleId }));
    const text = html.replace(/<[^>]*>/g, ' ');
    expect(text).toContain(name);
    expect(text).not.toContain(rule);
  });
});
