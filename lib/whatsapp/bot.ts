// The WhatsApp bot: what to answer to one incoming message from a pharmacy.
// Pure apart from the injected data access (BotDeps), so it is tested with Meta's payload
// shapes and a fake store (tests/whatsapp-bot.test.ts). The webhook sends what it returns.
//
// The report takes four taps once the list is on screen, the same rules as the web:
//   "Signaler" -> list of followed medicines (open, pick) -> list of delays (open, pick)
// Typing anything else searches the catalogue (search_medicines) and answers with a list.
// Reply ids: "rw:signaler", "rw:m:<molecule id>", "rw:d:<molecule id>:<delay>".
// Never anything about a patient, never the name of another pharmacy: counts below 3 read
// "moins de 3", as on every screen.

import { t } from '@/lib/i18n';
import { DELAY_CHOICES, isDelayChoice, type CountedDelay } from '@/lib/pharmacy/delay';
import type { Level, RuleId } from '@/lib/signal';
import { explanationText } from '@/lib/signals/explanation';
import type { ShownEvidence } from '@/lib/signals/shown';
import type { InboundMessage } from './inbound';
import type { ListRow, Outbound } from './messages';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Shape and word, never colour alone: open circle, half circle, filled circle, check mark. */
const SHAPES: Record<Level, string> = { none: '', watch: '○', likely: '◐', confirmed: '●', cleared: '✓' };

export function levelWord(level: Level): string {
  const word = t(`core.levels.${level}`);
  return SHAPES[level] ? `${SHAPES[level]} ${word}` : word;
}

export interface LinkedPharmacy {
  linkId: string;
  organisationId: string;
}

export interface MoleculeStatus {
  name: string;
  level: Level;
  rule: RuleId | null;
  /** Counts as screens receive them (below 3: "<3"). */
  evidence: ShownEvidence | null;
}

export interface ReportOutcome {
  previous: Level;
  level: Level;
  rule: RuleId;
  evidence: ShownEvidence;
}

export interface BotDeps {
  /** Followed molecules, those with a level first. */
  followed(organisationId: string): Promise<{ moleculeId: string; name: string; level: Level }[]>;
  /** Catalogue matches, one row per molecule, best first. */
  search(query: string): Promise<{ moleculeId: string; title: string; description: string }[]>;
  /** True when the query matches a name of the DPM list (registered, not followed by RuptureWatch). */
  dpmMatch(query: string): Promise<boolean>;
  molecule(moleculeId: string): Promise<MoleculeStatus | null>;
  /** Inserts the report (channel whatsapp), follows the molecule, recomputes. Null if the recompute failed. */
  report(pharmacy: LinkedPharmacy, moleculeId: string, delay: CountedDelay): Promise<ReportOutcome | null>;
}

export interface BotContext {
  siteUrl: string;
}

const REPORT_WORDS = new Set(['signaler', 'signal', 'signalement', 'signale', 's']);
const HELP_WORDS = new Set(['aide', 'help', 'menu', 'bonjour', 'salut', 'slt', 'bjr', 'start', 'hello', 'salam', '?']);

const normalise = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}?]+/gu, ' ')
    .trim();

const reportButton = (): { id: string; title: string } => ({ id: 'rw:signaler', title: t('core.whatsapp.reportButton') });

/** The unlinked answer: one short message with the link, nothing else. */
export function unlinkedReply(ctx: BotContext): Outbound[] {
  return [{ type: 'text', body: t('core.whatsapp.unlinked', { url: `${ctx.siteUrl}/pharmacie/whatsapp` }) }];
}

function help(): Outbound {
  return { type: 'buttons', body: t('core.whatsapp.help'), buttons: [reportButton()] };
}

async function followedList(pharmacy: LinkedPharmacy, deps: BotDeps): Promise<Outbound> {
  const followed = await deps.followed(pharmacy.organisationId);
  if (followed.length === 0) return { type: 'text', body: t('core.whatsapp.followedNone') };
  const rows: ListRow[] = followed.slice(0, 10).map((m) => ({
    id: `rw:m:${m.moleculeId}`,
    title: m.name,
    description: m.level === 'none' ? undefined : levelWord(m.level),
  }));
  return {
    type: 'list',
    body: t('core.whatsapp.followedBody'),
    button: t('core.whatsapp.followedButton'),
    sectionTitle: t('core.whatsapp.followedSection'),
    rows,
    footer: followed.length > 10 ? t('core.whatsapp.followedMore') : undefined,
  };
}

function explanation(status: { rule: RuleId | null; evidence: ShownEvidence | null }): string {
  return status.rule && status.evidence ? explanationText(status.rule, status.evidence) : '';
}

async function delayList(moleculeId: string, deps: BotDeps): Promise<Outbound> {
  const status = await deps.molecule(moleculeId);
  if (!status) return { type: 'text', body: t('core.whatsapp.moleculeUnknown') };
  const body =
    status.level === 'none'
      ? t('core.whatsapp.moleculeBodyNone', { name: status.name })
      : t('core.whatsapp.moleculeBody', {
          name: status.name,
          level: levelWord(status.level),
          explanation: explanation(status),
          disclaimer: t('core.guidance.disclaimer'),
        });
  return {
    type: 'list',
    body,
    button: t('core.whatsapp.delayButton'),
    sectionTitle: t('core.whatsapp.delaySection'),
    rows: DELAY_CHOICES.map((d) => ({ id: `rw:d:${moleculeId}:${d}`, title: t(`core.report.delays.${d}`) })),
  };
}

async function report(pharmacy: LinkedPharmacy, moleculeId: string, delay: string, deps: BotDeps, ctx: BotContext): Promise<Outbound[]> {
  if (!isDelayChoice(delay)) return [help()];
  if (delay === 'lt3') {
    return [{ type: 'text', body: `${t('core.guidance.tooEarly.title')}. ${t('core.guidance.tooEarly.body')}` }];
  }
  const status = await deps.molecule(moleculeId);
  if (!status) return [{ type: 'text', body: t('core.whatsapp.moleculeUnknown') }];
  let outcome: ReportOutcome | null;
  try {
    outcome = await deps.report(pharmacy, moleculeId, delay);
  } catch {
    return [{ type: 'text', body: t('core.whatsapp.failed') }];
  }
  if (!outcome) {
    return [{ type: 'buttons', body: t('core.whatsapp.reportedNoLevel', { name: status.name }), buttons: [{ ...reportButton(), title: t('core.whatsapp.reportAnother') }] }];
  }
  const vars = {
    name: status.name,
    level: levelWord(outcome.level),
    before: levelWord(outcome.previous),
    explanation: explanationText(outcome.rule, outcome.evidence),
    methodUrl: `${ctx.siteUrl}/methode#${outcome.rule}`,
    disclaimer: t('core.guidance.disclaimer'),
  };
  const body = outcome.previous === outcome.level ? t('core.whatsapp.reportedUnchanged', vars) : t('core.whatsapp.reported', vars);
  return [{ type: 'buttons', body, buttons: [{ ...reportButton(), title: t('core.whatsapp.reportAnother') }] }];
}

async function search(query: string, deps: BotDeps): Promise<Outbound> {
  const q = query.trim().slice(0, 100);
  const hits = await deps.search(q);
  if (hits.length === 0) {
    if (await deps.dpmMatch(q)) return { type: 'text', body: t('core.whatsapp.dpm') };
    return { type: 'text', body: t('core.whatsapp.searchNone', { q: q.slice(0, 60) }) };
  }
  return {
    type: 'list',
    body: t('core.whatsapp.searchBody', { q: q.slice(0, 60) }),
    button: t('core.whatsapp.searchButton'),
    sectionTitle: t('core.whatsapp.searchSection'),
    rows: hits.slice(0, 10).map((h) => ({ id: `rw:m:${h.moleculeId}`, title: h.title, description: h.description })),
  };
}

/** What to answer to one message from a linked pharmacy. */
export async function botReply(message: InboundMessage, pharmacy: LinkedPharmacy, deps: BotDeps, ctx: BotContext): Promise<Outbound[]> {
  if (message.replyId) {
    const parts = message.replyId.split(':');
    if (parts[0] === 'rw' && parts[1] === 'signaler') return [await followedList(pharmacy, deps)];
    if (parts[0] === 'rw' && parts[1] === 'm' && UUID.test(parts[2] ?? '')) return [await delayList(parts[2], deps)];
    if (parts[0] === 'rw' && parts[1] === 'd' && UUID.test(parts[2] ?? '')) return report(pharmacy, parts[2], parts[3] ?? '', deps, ctx);
    return [help()];
  }
  const text = normalise(message.body);
  if (REPORT_WORDS.has(text)) return [await followedList(pharmacy, deps)];
  if (text.length < 2 || HELP_WORDS.has(text)) return [help()];
  return [await search(message.body, deps)];
}
