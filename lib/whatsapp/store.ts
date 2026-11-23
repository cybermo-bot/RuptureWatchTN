// Data access for the WhatsApp bot, with the service role (the webhook has no user session).
// Every read is scoped to the linked pharmacy; levels and counts come from signals_view, the
// same display counts as every screen ("<3" below 3). Server only.

import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { DELAY_DAYS, type CountedDelay } from '@/lib/pharmacy/delay';
import type { Level, RuleId } from '@/lib/signal';
import { recomputeSignal, type RecomputeResult } from '@/lib/signals/recompute';
import type { ShownEvidence } from '@/lib/signals/shown';
import { supabaseSignalStore } from '@/lib/signals/store';
import type { BotDeps, LinkedPharmacy, MoleculeStatus } from './bot';
import { hashPhone, hashUserId, type InboundMessage } from './inbound';

const DAY = 86_400_000;
const RANK: Record<Level, number> = { confirmed: 4, likely: 3, watch: 2, cleared: 1, none: 0 };

interface ViewRow {
  molecule_id: string;
  molecule_name: string;
  level: Level;
  rule: RuleId;
  evidence: ShownEvidence;
}

async function signalRows(client: SupabaseClient, ids: string[]): Promise<Map<string, ViewRow>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await client.rpc('signals_view', { p_molecule_ids: ids });
  if (error) throw new Error(`signals_view: ${error.message}`);
  return new Map(((data ?? []) as ViewRow[]).map((r) => [r.molecule_id, r]));
}

/**
 * The pharmacy linked to the sender, found by the salted hash of the phone number or of the
 * business-scoped user id. Notes the time (the 24-hour window for alerts) and learns the
 * user-id hash on the first message, so a pharmacist who later hides their number is still known.
 */
export async function findLinkedPharmacy(
  client: SupabaseClient,
  message: Pick<InboundMessage, 'phone' | 'userId'>,
  salt: string,
  now: Date = new Date(),
): Promise<LinkedPharmacy | null> {
  const phoneHash = message.phone ? hashPhone(message.phone, salt) : null;
  const userHash = message.userId ? hashUserId(message.userId, salt) : null;
  const filters = [phoneHash ? `phone_hash.eq.${phoneHash}` : null, userHash ? `user_hash.eq.${userHash}` : null].filter(Boolean);
  if (filters.length === 0) return null;
  const { data, error } = await client.from('wa_links').select('id, organisation_id, user_hash').or(filters.join(',')).limit(1);
  if (error) throw new Error(`wa_links: ${error.message}`);
  const link = data?.[0] as { id: string; organisation_id: string; user_hash: string | null } | undefined;
  if (!link) return null;
  const update: Record<string, string> = { last_inbound_at: now.toISOString() };
  if (userHash && !link.user_hash) update.user_hash = userHash;
  const { error: updateError } = await client.from('wa_links').update(update).eq('id', link.id);
  if (updateError) console.error('wa_links update failed', { code: updateError.code });
  return { linkId: link.id, organisationId: link.organisation_id };
}

export interface ReportHooks {
  /** Called when the report changed the level (to send the WhatsApp alerts). */
  onLevelChange?(result: RecomputeResult, reporter: LinkedPharmacy): void;
}

export function supabaseBotDeps(client: SupabaseClient, hooks: ReportHooks = {}): BotDeps {
  return {
    async followed(organisationId) {
      const { data, error } = await client
        .from('followed_molecules')
        .select('molecule_id, molecules(name)')
        .eq('organisation_id', organisationId);
      if (error) throw new Error(`followed_molecules: ${error.message}`);
      const rows = (data ?? []) as unknown as { molecule_id: string; molecules: { name: string } | null }[];
      const signals = await signalRows(client, rows.map((r) => r.molecule_id));
      return rows
        .map((r) => ({ moleculeId: r.molecule_id, name: r.molecules?.name ?? '', level: signals.get(r.molecule_id)?.level ?? ('none' as Level) }))
        .sort((a, b) => RANK[b.level] - RANK[a.level] || a.name.localeCompare(b.name, 'fr'));
    },

    async search(query) {
      if (query.trim().length < 2) return [];
      const { data, error } = await client.rpc('search_medicines', { q: query });
      if (error) throw new Error(`search_medicines: ${error.message}`);
      const seen = new Set<string>();
      const out: { moleculeId: string; title: string; description: string }[] = [];
      for (const hit of (data ?? []) as { brand: string; molecule_id: string; molecule_name: string }[]) {
        if (seen.has(hit.molecule_id)) continue;
        seen.add(hit.molecule_id);
        out.push({ moleculeId: hit.molecule_id, title: hit.brand, description: hit.molecule_name });
      }
      return out;
    },

    // Wired to the DPM list in lib/dpm (session 3, section 5).
    async dpmMatch() {
      return false;
    },

    async molecule(moleculeId): Promise<MoleculeStatus | null> {
      const { data, error } = await client.from('molecules').select('id, name').eq('id', moleculeId).maybeSingle();
      if (error) throw new Error(`molecules: ${error.message}`);
      if (!data) return null;
      const signal = (await signalRows(client, [moleculeId])).get(moleculeId);
      return {
        name: data.name as string,
        level: signal?.level ?? 'none',
        rule: signal?.rule ?? null,
        evidence: signal?.evidence ?? null,
      };
    },

    async report(pharmacy, moleculeId, delay: CountedDelay) {
      const { data: org, error: orgError } = await client
        .from('organisations')
        .select('id, type, governorate_code, origin')
        .eq('id', pharmacy.organisationId)
        .single();
      if (orgError || !org || org.type !== 'pharmacy') throw new Error('whatsapp report: not a pharmacy');
      const now = new Date();
      const { error } = await client.from('reports').insert({
        organisation_id: org.id,
        governorate_code: org.governorate_code,
        molecule_id: moleculeId,
        kind: 'not_delivered',
        ordered_at: new Date(now.getTime() - DELAY_DAYS[delay] * DAY).toISOString(),
        reported_at: now.toISOString(),
        channel: 'whatsapp',
        origin: org.origin,
      });
      if (error) throw new Error(`whatsapp report insert: ${error.code}`);
      // Reporting follows the molecule, as on the web. 23505: already followed.
      const follow = await client.from('followed_molecules').insert({ organisation_id: org.id, molecule_id: moleculeId });
      if (follow.error && follow.error.code !== '23505') console.error('whatsapp follow failed', { code: follow.error.code });

      let result: RecomputeResult;
      try {
        result = await recomputeSignal(supabaseSignalStore(client), moleculeId, now);
      } catch (e) {
        // The report is saved; the daily run catches up.
        console.error('recompute after whatsapp report failed', e instanceof Error ? e.message : e);
        return null;
      }
      if (result.eventId !== null) hooks.onLevelChange?.(result, pharmacy);
      const shown = (await signalRows(client, [moleculeId])).get(moleculeId);
      if (!shown) return null;
      return { previous: result.previous, level: shown.level, rule: shown.rule, evidence: shown.evidence };
    },
  };
}
