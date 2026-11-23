// The WhatsApp bot on Meta's payload shapes (tests/fixtures/whatsapp): parsing taps on lists
// and buttons, the four-tap report, search, the unlinked answer, alerts, and the request
// bodies sent to the Cloud API with Meta's size limits.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import type { Level } from '@/lib/signal';
import type { ShownEvidence } from '@/lib/signals/shown';
import { botReply, levelWord, unlinkedReply, type BotDeps, type LinkedPharmacy } from '@/lib/whatsapp/bot';
import { parseInbound, type InboundMessage } from '@/lib/whatsapp/inbound';
import { graphPayload, LIMITS, type Outbound } from '@/lib/whatsapp/messages';

vi.mock('server-only', () => ({}));
const { alertDelivery, alertText } = await import('@/lib/whatsapp/alerts');

const fixture = (name: string) => JSON.parse(readFileSync(join(__dirname, 'fixtures', 'whatsapp', name), 'utf8')) as unknown;
const ctx = { siteUrl: 'https://rupturewatch-tn.vercel.app' };
const pharmacy: LinkedPharmacy = { linkId: 'link-1', organisationId: '00000000-0000-4000-8000-000000000a01' };
const MOL = '8d2608a4-3287-4dce-9eb9-bb732fd9bb26';
const DISCLAIMER = t('core.guidance.disclaimer');

const evidence = (pharmacies: number | '<3', governorates: number | null): ShownEvidence => ({
  pharmacies14d: pharmacies,
  governorates14d: governorates,
  pharmacies7d: pharmacies,
  deliveredAgainPharmacies: 0,
  ignoredTooEarly: 0,
  lastNotDeliveredAt: null,
  notices: [],
  origins: ['simulated'],
});

function fakeDeps(overrides: Partial<BotDeps> = {}): BotDeps & { reports: string[] } {
  const reports: string[] = [];
  const followed = Array.from({ length: 12 }, (_, i) => ({
    moleculeId: i === 0 ? MOL : `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
    name: i === 0 ? 'AMLODIPINE' : `MOLECULE AU NOM TRES LONG NUMERO ${i}`,
    level: (i === 0 ? 'confirmed' : 'none') as Level,
  }));
  return {
    reports,
    followed: async () => followed,
    search: async (q) => (/aml/i.test(q) ? [{ moleculeId: MOL, title: 'AMLOR', description: 'AMLODIPINE' }] : []),
    dpmMatch: async (q) => /ruxolitinib/i.test(q),
    molecule: async (id) => (id === MOL ? { name: 'AMLODIPINE', level: 'likely', rule: 'two_pharmacies_7d', evidence: evidence('<3', null) } : null),
    report: async (_p, id, delay) => {
      reports.push(`${id}:${delay}`);
      return { previous: 'likely', level: 'confirmed', rule: 'confirmed_threshold', evidence: evidence(5, 2) };
    },
    ...overrides,
  };
}

const text = (body: string): InboundMessage => ({
  messageId: 'wamid.x',
  phone: '21698123456',
  userId: null,
  body,
  replyId: null,
  timestamp: null,
  phoneNumberId: null,
});
const one = (out: Outbound[]) => {
  expect(out).toHaveLength(1);
  return out[0];
};
const bodyOf = (m: Outbound) => ('body' in m ? m.body : '');

interface SentRow {
  id: string;
  title: string;
  description?: string;
}
/** The parts of a Cloud API request body these tests read. */
interface SentPayload {
  type: string;
  interactive: {
    type: string;
    body: { text: string };
    action: { button: string; sections: { rows: SentRow[] }[]; buttons: { reply: { title: string } }[] };
  };
}

/** Every request body we would send must respect Meta's limits. */
function expectWithinLimits(m: Outbound) {
  const p = graphPayload({ to: '21698123456' }, m) as unknown as SentPayload;
  if (p.type === 'interactive') {
    expect(p.interactive.body.text.length).toBeLessThanOrEqual(LIMITS.interactiveBody);
    if (p.interactive.type === 'list') {
      expect(p.interactive.action.button.length).toBeLessThanOrEqual(LIMITS.listButton);
      const rows = p.interactive.action.sections.flatMap((s) => s.rows);
      expect(rows.length).toBeLessThanOrEqual(LIMITS.listRows);
      for (const r of rows) {
        expect([...r.title].length).toBeLessThanOrEqual(LIMITS.rowTitle);
        if (r.description) expect([...r.description].length).toBeLessThanOrEqual(LIMITS.rowDescription);
        expect(r.id.length).toBeLessThanOrEqual(LIMITS.rowId);
      }
      expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
    } else {
      expect(p.interactive.action.buttons.length).toBeLessThanOrEqual(LIMITS.buttons);
      for (const b of p.interactive.action.buttons) expect([...b.reply.title].length).toBeLessThanOrEqual(LIMITS.buttonTitle);
    }
  }
  return p;
}

describe('parsing taps on our lists and buttons', () => {
  it('reads the row id of a list reply, the id of a reply button and the payload of a template button', () => {
    expect(parseInbound(fixture('list-reply.json'))[0]).toMatchObject({ replyId: `rw:m:${MOL}`, phone: '16505551234' });
    expect(parseInbound(fixture('delay-reply.json'))[0].replyId).toBe(`rw:d:${MOL}:d5`);
    expect(parseInbound(fixture('button-reply.json'))[0].replyId).toBe('rw:signaler');
    expect(parseInbound(fixture('template-button.json'))[0].replyId).toBe('rw:signaler');
  });

  it('reads a text as a text, with no reply id', () => {
    expect(parseInbound(fixture('text-message.json'))[0]).toMatchObject({ replyId: null, body: 'Does it come in another color?' });
  });

  it('skips statuses and media', () => {
    expect(parseInbound(fixture('status-and-image.json'))).toEqual([]);
  });
});

describe('the report in four taps', () => {
  it('"Signaler" opens the list of followed medicines, ten rows at most, with their level', async () => {
    const list = one(await botReply(text('Signaler'), pharmacy, fakeDeps(), ctx));
    expect(list.type).toBe('list');
    if (list.type !== 'list') return;
    expect(list.rows).toHaveLength(10);
    expect(list.rows[0]).toMatchObject({ id: `rw:m:${MOL}`, title: 'AMLODIPINE', description: levelWord('confirmed') });
    expect(list.footer).toBe(t('core.whatsapp.followedMore'));
    expectWithinLimits(list);
  });

  it('the "Signaler" button and a template button do the same', async () => {
    for (const f of ['button-reply.json', 'template-button.json']) {
      const [m] = parseInbound(fixture(f));
      expect(one(await botReply(m, pharmacy, fakeDeps(), ctx)).type).toBe('list');
    }
  });

  it('picking a medicine shows its level, the explanation, the disclaimer, and the four delays', async () => {
    const [m] = parseInbound(fixture('list-reply.json'));
    const list = one(await botReply(m, pharmacy, fakeDeps(), ctx));
    if (list.type !== 'list') throw new Error('expected a list');
    expect(list.body).toContain('AMLODIPINE');
    expect(list.body).toContain(levelWord('likely'));
    expect(list.body).toMatch(new RegExp(t('core.common.fewerThan3'), 'i'));
    expect(list.body).toContain(DISCLAIMER);
    expect(list.rows.map((r) => r.id)).toEqual(['d3', 'd5', 'd8', 'lt3'].map((d) => `rw:d:${MOL}:${d}`));
    expect(list.rows.map((r) => r.title)).toEqual(['d3', 'd5', 'd8', 'lt3'].map((d) => t(`core.report.delays.${d}` as 'core.report.delays.d3')));
    expectWithinLimits(list);
  });

  it('picking a delay files the report and answers with the level change, the explanation and the disclaimer', async () => {
    const deps = fakeDeps();
    const [m] = parseInbound(fixture('delay-reply.json'));
    const reply = one(await botReply(m, pharmacy, deps, ctx));
    expect(deps.reports).toEqual([`${MOL}:d5`]);
    expect(reply.type).toBe('buttons');
    const body = bodyOf(reply);
    expect(body).toContain(`${levelWord('confirmed')} (avant : ${levelWord('likely')})`);
    expect(body).toContain('5 pharmacies');
    expect(body).toContain(`${ctx.siteUrl}/methode#confirmed_threshold`);
    expect(body).toContain(DISCLAIMER);
    expectWithinLimits(reply);
  });

  it('"Moins de 3 jours" files nothing and explains why', async () => {
    const deps = fakeDeps();
    const reply = one(await botReply({ ...text(''), replyId: `rw:d:${MOL}:lt3` }, pharmacy, deps, ctx));
    expect(deps.reports).toEqual([]);
    expect(bodyOf(reply)).toContain(t('core.guidance.tooEarly.title'));
  });

  it('a failed report says so, and a tampered id gets the help', async () => {
    const failing = fakeDeps({ report: async () => Promise.reject(new Error('db down')) });
    expect(bodyOf(one(await botReply({ ...text(''), replyId: `rw:d:${MOL}:d3` }, pharmacy, failing, ctx)))).toBe(t('core.whatsapp.failed'));
    const deps = fakeDeps();
    expect(bodyOf(one(await botReply({ ...text(''), replyId: `rw:d:${MOL}:d99` }, pharmacy, deps, ctx)))).toBe(t('core.whatsapp.help'));
    expect(bodyOf(one(await botReply({ ...text(''), replyId: 'rw:d:not-a-uuid:d3' }, pharmacy, deps, ctx)))).toBe(t('core.whatsapp.help'));
    expect(deps.reports).toEqual([]);
  });
});

describe('search and help', () => {
  it('a medicine name answers with the catalogue matches as a list to pick from', async () => {
    const list = one(await botReply(text('amlor'), pharmacy, fakeDeps(), ctx));
    if (list.type !== 'list') throw new Error('expected a list');
    expect(list.rows).toEqual([{ id: `rw:m:${MOL}`, title: 'AMLOR', description: 'AMLODIPINE' }]);
  });

  it('a DPM name not in the catalogue gets the DPM line; anything else says nothing was found', async () => {
    expect(bodyOf(one(await botReply(text('ruxolitinib'), pharmacy, fakeDeps(), ctx)))).toBe(t('core.whatsapp.dpm'));
    expect(bodyOf(one(await botReply(text('zzzz'), pharmacy, fakeDeps(), ctx)))).toContain('zzzz');
  });

  it('a greeting gets the help with a "Signaler" button', async () => {
    const reply = one(await botReply(text('Bonjour !'), pharmacy, fakeDeps(), ctx));
    expect(reply).toMatchObject({ type: 'buttons', buttons: [{ id: 'rw:signaler' }] });
  });

  it('an unlinked number gets one short message with the link to the web app', () => {
    const [m] = unlinkedReply(ctx);
    expect(m).toEqual({ type: 'text', body: t('core.whatsapp.unlinked', { url: `${ctx.siteUrl}/pharmacie/whatsapp` }) });
  });
});

describe('alerts', () => {
  const now = new Date('2026-11-23T10:00:00Z');
  it('free-form inside the 24-hour window, the template outside it when approved, otherwise skipped', () => {
    expect(alertDelivery('2026-11-23T09:00:00Z', now, false)).toBe('text');
    expect(alertDelivery('2026-11-22T09:00:00Z', now, false)).toBe('skip');
    expect(alertDelivery('2026-11-22T09:00:00Z', now, true)).toBe('template');
    expect(alertDelivery(null, now, false)).toBe('skip');
  });

  it('carries the level, the explanation with counts below 3 hidden, and the disclaimer', () => {
    const body = alertText({ moleculeName: 'AMLODIPINE', from: 'watch', to: 'likely', rule: 'two_pharmacies_7d', evidence: evidence('<3', null) }, ctx.siteUrl);
    expect(body).toContain(levelWord('likely'));
    expect(body).toMatch(new RegExp(t('core.common.fewerThan3'), 'i'));
    expect(body).toContain(DISCLAIMER);
    expect(body).not.toMatch(/Pharmacie (démo|testeuse)/);
  });
});

describe('Cloud API request bodies', () => {
  it('a list, reply buttons and a template have Meta\'s shapes', () => {
    const list = graphPayload({ to: '21698123456' }, { type: 'list', body: 'b', button: 'Vos médicaments', sectionTitle: 's', rows: [{ id: 'rw:m:1', title: 'x'.repeat(40) }] }, 'wamid.q');
    expect(list).toMatchObject({
      messaging_product: 'whatsapp',
      to: '21698123456',
      type: 'interactive',
      context: { message_id: 'wamid.q' },
      interactive: { type: 'list', action: { button: 'Vos médicaments', sections: [{ rows: [{ id: 'rw:m:1' }] }] } },
    });
    expect([...(list as unknown as SentPayload).interactive.action.sections[0].rows[0].title].length).toBe(LIMITS.rowTitle);
    expect(graphPayload({ recipient: 'US.1' }, { type: 'buttons', body: 'b', buttons: [{ id: 'rw:signaler', title: 'Signaler' }] })).toMatchObject({
      recipient: 'US.1',
      interactive: { type: 'button', action: { buttons: [{ type: 'reply', reply: { id: 'rw:signaler', title: 'Signaler' } }] } },
    });
    expect(graphPayload({ to: '216' }, { type: 'template', name: 'rw_code', language: 'fr', bodyParams: ['123456'], urlButtonParam: '123456' })).toMatchObject({
      type: 'template',
      template: {
        name: 'rw_code',
        language: { code: 'fr' },
        components: [
          { type: 'body', parameters: [{ type: 'text', text: '123456' }] },
          { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: '123456' }] },
        ],
      },
    });
  });
});
