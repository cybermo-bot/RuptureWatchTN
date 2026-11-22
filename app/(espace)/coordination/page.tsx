import Link from 'next/link';
import { redirect } from 'next/navigation';
import { EmptyState } from '@/components/EmptyState';
import { LevelBadge } from '@/components/LevelBadge';
import { LevelExplanation } from '@/components/LevelExplanation';
import { LiveRefresh } from '@/components/LiveRefresh';
import { PageHeader } from '@/components/PageHeader';
import { getCurrentSession } from '@/lib/auth/session';
import { HOME_BY_TYPE } from '@/lib/demo/roles';
import { createUserClient } from '@/lib/db/server';
import { formatDate } from '@/lib/format';
import { t } from '@/lib/i18n';
import type { Level, RuleId } from '@/lib/signal';
import type { StoredEvidence } from '@/lib/signals/recompute';

const RANK: Record<Level, number> = { confirmed: 4, likely: 3, watch: 2, cleared: 1, none: 0 };

// Coordinator preview (session 2): every molecule with a signal row, its level, since when,
// and why. Counts only. Refreshes live when a signal changes. Session 4 builds the dashboard.
export default async function CoordinationHome() {
  const session = await getCurrentSession();
  if (!session) redirect('/#roles');
  if (session.organisation.type !== 'coordinator') redirect(HOME_BY_TYPE[session.organisation.type]);

  const supabase = await createUserClient();
  const { data, error } = await supabase.from('signals').select('molecule_id, level, since, rule, evidence, molecules ( name )');
  if (error) throw new Error(`signals: ${error.message}`);
  const signals = (data ?? [])
    .map((s) => ({
      moleculeId: s.molecule_id as string,
      name: (s.molecules as unknown as { name: string } | null)?.name ?? '',
      level: s.level as Level,
      since: s.since as string,
      rule: s.rule as RuleId,
      evidence: s.evidence as StoredEvidence,
    }))
    .sort((a, b) => RANK[b.level] - RANK[a.level] || b.since.localeCompare(a.since));

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        meta={t('orgTypes.coordinator')}
        title={t('space.titles.coordinator')}
        description={t('coordination.previewNote')}
        actions={
          <Link href="/coordination/invitation" className="flex min-h-12 items-center text-sm font-medium">
            {t('coordination.invite')}
          </Link>
        }
      />
      <LiveRefresh table="signals" fallbackMs={4_000} />
      <section aria-labelledby="signaux" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="signaux" className="text-lg font-semibold text-ink">
            {t('coordination.signalsTitle')}
          </h2>
          <p className="text-sm text-ink-muted">{t('coordination.live')}</p>
        </div>
        {signals.length === 0 ? (
          <EmptyState title={t('coordination.emptyTitle')} body={t('coordination.emptyBody')} />
        ) : (
          <ul className="hairline-list border-y border-line">
            {signals.map((s) => (
              <li key={s.moleculeId} className="flex flex-col gap-2 py-4">
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                  <span className="font-medium break-words text-ink">{s.name}</span>
                  <span className="flex flex-wrap items-center gap-x-3 text-sm text-ink-muted">
                    <LevelBadge level={s.level} />
                    <span>{t('pharmacy.since', { date: formatDate(s.since) })}</span>
                  </span>
                </div>
                <LevelExplanation rule={s.rule} evidence={s.evidence} showRule />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
