// The Supabase implementation of SignalStore. Service role: it reads every pharmacy's reports
// for one molecule to evaluate it. Nothing it reads is ever sent to a screen as is: only the
// counts in StoredEvidence leave this module, through the signals row.

import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/db/server';
import type { ForeignNotice, Level, Origin, PharmacyReport } from '@/lib/signal';
import { ACTIVE_MEMBER_DAYS, type SignalStore } from './recompute';

// PostgREST returns at most 1000 rows per request; page through to be safe.
const PAGE = 1000;

interface ReportRow {
  id: string;
  organisation_id: string;
  governorate_code: string;
  molecule_id: string;
  kind: PharmacyReport['kind'];
  ordered_at: string | null;
  reported_at: string;
  origin: Origin;
}

interface NoticeRow {
  id: string;
  molecule_id: string;
  source: string;
  status: ForeignNotice['status'];
  published_at: string;
  url: string;
  origin: Origin;
}

export function supabaseSignalStore(client: SupabaseClient = createServiceClient()): SignalStore {
  return {
    async load(moleculeId, from, to) {
      const reports: PharmacyReport[] = [];
      for (let offset = 0; ; offset += PAGE) {
        const { data, error } = await client
          .from('reports')
          .select('id, organisation_id, governorate_code, molecule_id, kind, ordered_at, reported_at, origin')
          .eq('molecule_id', moleculeId)
          .gt('reported_at', from.toISOString())
          .lte('reported_at', to.toISOString())
          .order('reported_at', { ascending: true })
          .order('id', { ascending: true })
          .range(offset, offset + PAGE - 1);
        if (error) throw new Error(`load reports: ${error.message}`);
        for (const r of (data ?? []) as ReportRow[]) {
          reports.push({
            id: r.id,
            pharmacyId: r.organisation_id,
            governorateCode: r.governorate_code,
            moleculeId: r.molecule_id,
            kind: r.kind,
            orderedAt: r.ordered_at ? new Date(r.ordered_at) : null,
            reportedAt: new Date(r.reported_at),
            origin: r.origin,
          });
        }
        if (!data || data.length < PAGE) break;
      }

      const { data: noticeRows, error: noticeError } = await client
        .from('foreign_notices')
        .select('id, molecule_id, source, status, published_at, url, origin')
        .eq('molecule_id', moleculeId)
        .gt('published_at', from.toISOString())
        .lte('published_at', to.toISOString());
      if (noticeError) throw new Error(`load notices: ${noticeError.message}`);
      const notices: ForeignNotice[] = ((noticeRows ?? []) as NoticeRow[]).map((n) => ({
        id: n.id,
        moleculeId: n.molecule_id,
        source: n.source,
        status: n.status,
        publishedAt: new Date(n.published_at),
        url: n.url,
        origin: n.origin,
      }));

      const { data: signal, error: signalError } = await client
        .from('signals')
        .select('level, since, updated_at')
        .eq('molecule_id', moleculeId)
        .maybeSingle();
      if (signalError) throw new Error(`load signal: ${signalError.message}`);

      return {
        reports,
        notices,
        current: signal
          ? { level: signal.level as Level, since: new Date(signal.since), updatedAt: signal.updated_at as string }
          : null,
      };
    },

    async apply(input) {
      const { data, error } = await client.rpc('apply_signal_evaluation', {
        p_molecule_id: input.moleculeId,
        p_expected_level: input.expected?.level ?? null,
        p_expected_updated_at: input.expected?.updatedAt ?? null,
        p_level: input.level,
        p_since: input.since.toISOString(),
        p_rule: input.rule,
        p_evidence: input.evidence,
        p_at: input.at.toISOString(),
        p_alert: input.alert,
      });
      if (error) throw new Error(`apply_signal_evaluation: ${error.message}`);
      const row = (data as { applied: boolean; event_id: number | null }[] | null)?.[0];
      return { applied: row?.applied ?? false, eventId: row?.event_id ?? null };
    },

    async moleculesWithSignal() {
      const { data, error } = await client.from('signals').select('molecule_id');
      if (error) throw new Error(`list signals: ${error.message}`);
      return (data ?? []).map((r) => r.molecule_id as string);
    },

    async activeMemberPharmacies() {
      // A failure here must not block a report: the floor of the bar applies instead.
      const { data, error } = await client.rpc('active_member_pharmacies', { p_days: ACTIVE_MEMBER_DAYS });
      if (error) {
        console.error('active_member_pharmacies failed, using the floor', error.message);
        return null;
      }
      return typeof data === 'number' ? data : null;
    },
  };
}
