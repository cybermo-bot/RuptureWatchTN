import { redirect } from 'next/navigation';
import { Panel } from '@/components/console/Panel';
import { EmptyState } from '@/components/EmptyState';
import { LevelBadge } from '@/components/LevelBadge';
import { OriginBadge } from '@/components/OriginBadge';
import { PageHeader } from '@/components/PageHeader';
import { getCurrentSession } from '@/lib/auth/session';
import { createUserClient } from '@/lib/db/server';
import { HOME_BY_TYPE } from '@/lib/demo/roles';
import { formatDate } from '@/lib/format';
import { t } from '@/lib/i18n';
import type { ForeignNotice, Level, Origin } from '@/lib/signal';
import { listSignals } from '@/lib/signals/views';

// The upstream view: every foreign notice, with its regulator and link, and the medicine's level
// in Tunisia (or none). A notice alone never raises a medicine past "sous surveillance".
export default async function CentralUpstream() {
  const session = await getCurrentSession();
  if (!session) redirect('/#roles');
  if (session.organisation.type !== 'central_pharmacy') redirect(HOME_BY_TYPE[session.organisation.type]);

  const client = await createUserClient();
  const [{ data, error }, signals] = await Promise.all([
    client
      .from('foreign_notices')
      .select('id, molecule_id, source, status, published_at, url, origin, molecules ( name )')
      .order('published_at', { ascending: false })
      .limit(300),
    listSignals(client),
  ]);
  if (error) throw new Error(`foreign_notices: ${error.message}`);
  const level = new Map<string, Level>(signals.map((s) => [s.molecule_id, s.level]));
  const notices = (data ?? []).map((n) => ({
    id: n.id as string,
    moleculeId: n.molecule_id as string,
    moleculeName: (n.molecules as unknown as { name: string } | null)?.name ?? '',
    source: n.source as string,
    status: n.status as ForeignNotice['status'],
    publishedAt: n.published_at as string,
    url: n.url as string,
    origin: n.origin as Origin,
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader meta={t('core.orgTypes.central_pharmacy')} title={t('core.central.upstreamTitle')} description={t('core.central.upstreamIntro')} />
      <Panel title={t('core.central.upstreamTitle')} titleId="avis" description={notices.length ? t('core.central.upstreamCount', { n: notices.length }) : undefined} bodyClassName="">
        {notices.length === 0 ? (
          <div className="px-4">
            <EmptyState title={t('core.central.upstreamEmpty')} body={t('core.molecule.noticesEmpty')} />
          </div>
        ) : (
          <ul className="hairline-list">
            {notices.map((n) => {
              const l = level.get(n.moleculeId);
              return (
                <li key={n.id} className="flex flex-col gap-1.5 px-4 py-3">
                  <span className="font-medium break-words text-ink">{n.moleculeName}</span>
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    <span className="font-medium text-ink">{n.source}</span>
                    <span className="text-ink">{t(`core.molecule.noticeStatus.${n.status}`)}</span>
                    <span className="text-ink-muted">{t('core.molecule.noticePublished', { date: formatDate(n.publishedAt) })}</span>
                    <OriginBadge origin={n.origin} />
                  </span>
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
                    <span>{t('core.central.inTunisia')}</span>
                    {l && l !== 'none' ? <LevelBadge level={l} /> : <span>{t('core.central.noLevel')}</span>}
                    <a href={n.url} target="_blank" rel="noopener noreferrer" className="min-h-12 content-center underline">
                      {t('core.molecule.noticeLink', { source: n.source })}
                    </a>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
