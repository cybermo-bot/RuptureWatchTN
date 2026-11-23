// SignalStore over PGlite, acting as the service role, calling the real apply_signal_evaluation.

import type { PGlite } from '@electric-sql/pglite';
import type { ForeignNotice, Level, Origin, PharmacyReport } from '@/lib/signal';
import { ACTIVE_MEMBER_DAYS, type SignalStore } from '@/lib/signals/recompute';
import { asCommitted } from './harness';

const service = { kind: 'service' as const };

export function pgliteSignalStore(db: PGlite): SignalStore {
  return {
    async load(moleculeId, from, to) {
      return asCommitted(db, service, async (tx) => {
        const reports = await tx.query<{
          id: string;
          organisation_id: string;
          governorate_code: string;
          molecule_id: string;
          kind: PharmacyReport['kind'];
          ordered_at: Date | null;
          reported_at: Date;
          origin: Origin;
        }>(
          `select id, organisation_id, governorate_code, molecule_id, kind, ordered_at, reported_at, origin
             from public.reports where molecule_id = $1 and reported_at > $2 and reported_at <= $3`,
          [moleculeId, from, to],
        );
        const notices = await tx.query<{
          id: string;
          molecule_id: string;
          source: string;
          status: ForeignNotice['status'];
          published_at: Date;
          url: string;
          origin: Origin;
        }>(
          `select id, molecule_id, source, status, published_at, url, origin
             from public.foreign_notices where molecule_id = $1 and published_at > $2 and published_at <= $3`,
          [moleculeId, from, to],
        );
        const signal = await tx.query<{ level: Level; since: Date; cleared_at: Date | null; updated_at: string }>(
          `select level, since, cleared_at, updated_at::text as updated_at from public.signals where molecule_id = $1`,
          [moleculeId],
        );
        const s = signal.rows[0];
        return {
          reports: reports.rows.map((r) => ({
            id: r.id,
            pharmacyId: r.organisation_id,
            governorateCode: r.governorate_code,
            moleculeId: r.molecule_id,
            kind: r.kind,
            orderedAt: r.ordered_at,
            reportedAt: r.reported_at,
            origin: r.origin,
          })),
          notices: notices.rows.map((n) => ({
            id: n.id,
            moleculeId: n.molecule_id,
            source: n.source,
            status: n.status,
            publishedAt: n.published_at,
            url: n.url,
            origin: n.origin,
          })),
          current: s ? { level: s.level, since: s.since, clearedAt: s.cleared_at, updatedAt: s.updated_at } : null,
        };
      });
    },

    async apply(input) {
      return asCommitted(db, service, async (tx) => {
        const { rows } = await tx.query<{ applied: boolean; event_id: number | null }>(
          `select * from public.apply_signal_evaluation($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            input.moleculeId,
            input.expected?.level ?? null,
            input.expected?.updatedAt ?? null,
            input.level,
            input.since,
            input.rule,
            JSON.stringify(input.evidence),
            input.at,
            input.alert,
            input.clearedAt,
          ],
        );
        return { applied: rows[0].applied, eventId: rows[0].event_id === null ? null : Number(rows[0].event_id) };
      });
    },

    async activeMemberPharmacies() {
      return asCommitted(db, service, async (tx) =>
        (await tx.query<{ n: number }>('select public.active_member_pharmacies($1) as n', [ACTIVE_MEMBER_DAYS])).rows[0].n,
      );
    },

    async moleculesWithSignal() {
      return asCommitted(db, service, async (tx) =>
        (await tx.query<{ molecule_id: string }>('select molecule_id from public.signals')).rows.map((r) => r.molecule_id),
      );
    },
  };
}
