import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LevelBadge } from '@/components/LevelBadge';
import { PageHeader } from '@/components/PageHeader';
import { SiteFooter, SiteHeader, SiteMain } from '@/components/SiteChrome';
import { createAnonClient } from '@/lib/db/server';
import { formatDate } from '@/lib/format';
import { t } from '@/lib/i18n';
import { playbookById, PLAYBOOKS, type Playbook } from '@/lib/playbooks';
import { DEMO_SHORTAGE_MOLECULE } from '@/lib/demo/shortage';

// A draft playbook (lib/playbooks), read-only. Public, in French, like the methods page: it shows
// rules and roles, never a medicine's current level, a count or a stock (rule 10). Every threshold
// is read from the playbook's `signal` and `allocation`, which are the evaluator's and the split's
// own parameter objects.

export function generateStaticParams() {
  return PLAYBOOKS.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: PageProps<'/methode/protocoles/[id]'>): Promise<Metadata> {
  const p = playbookById((await params).id);
  return { title: p ? t('core.playbook.metaTitle', { molecule: p.molecule }) : t('core.method.title') };
}

/** Presentations of the molecule in the CNAM list (public reference data), or null if unreadable. */
async function presentations(molecule: string): Promise<number | null> {
  try {
    const client = createAnonClient();
    const { data: m } = await client.from('molecules').select('id').eq('name', molecule).maybeSingle();
    if (!m) return null;
    const { count } = await client.from('medicines').select('id', { count: 'exact', head: true }).eq('molecule_id', m.id);
    return count ?? null;
  } catch {
    return null;
  }
}

const LEVELS = ['watch', 'likely', 'confirmed', 'cleared'] as const;

function Block({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`${id}-titre`} className="panel flex flex-col gap-3 p-5 sm:p-6">
      <h2 id={`${id}-titre`} className="text-lg font-semibold text-ink">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Rules({ p }: { p: Playbook }) {
  const s = p.signal;
  return (
    <ul className="flex list-disc flex-col gap-1.5 ps-5 text-ink">
      <li>{t('core.playbook.triggerDelay', { hours: s.minUndeliveredHours })}</li>
      <li>{t('core.playbook.triggerLikely', { n: s.likelyMinPharmacies, days: s.likelyWindowDays })}</li>
      <li>
        {t('core.playbook.triggerConfirmed', {
          n: s.confirmMinPharmacies,
          pct: Math.round(s.confirmMemberShare * 1000) / 10,
          days: s.confirmWindowDays,
        })}
      </li>
      <li>{t('core.playbook.gateGeo', { n: s.confirmMinGovernorates })}</li>
      <li>{t('core.playbook.gateForeign')}</li>
      <li>{t('core.playbook.triggerCleared', { n: s.clearMinDeliveredPharmacies, days: s.quietDays })}</li>
    </ul>
  );
}

export default async function PlaybookPage({ params, searchParams }: PageProps<'/methode/protocoles/[id]'>) {
  const p = playbookById((await params).id);
  if (!p) notFound();
  const sp = await searchParams;
  // Opened from an event, a split or an alert: no version is recorded with it yet.
  const fromEvent = typeof sp.contexte === 'string';
  const n = await presentations(p.molecule);
  const status = t('core.playbook.statusDraft');

  return (
    <>
      <SiteHeader />
      <SiteMain>
        <PageHeader
          meta={
            <span className="flex flex-wrap items-center gap-2">
              <span className="rounded-sm border border-dashed border-ink-muted px-1.5 font-mono text-xs leading-5 tracking-wide text-ink-muted uppercase">
                {status}
              </span>
              <span>{t('core.playbook.facts', { version: p.version, date: formatDate(`${p.draftedOn}T12:00:00Z`), status })}</span>
            </span>
          }
          title={t('core.playbook.title', { molecule: p.molecule })}
          description={t('core.playbook.intro')}
        />

        {fromEvent ? (
          <p role="note" className="panel max-w-3xl border-s-4 border-s-brand p-4 text-ink">
            <span className="font-semibold">{t('core.playbook.currentParams')}.</span> {t('core.playbook.currentParamsNote')}
          </p>
        ) : null}

        <div className="flex max-w-3xl flex-col gap-6">
          <Block id="perimetre" title={t('core.playbook.scopeTitle')}>
            <p className="text-ink">{t('core.playbook.scopeMolecule', { molecule: p.molecule })}</p>
            {n !== null ? <p className="text-ink">{t('core.playbook.scopeGranularity', { n })}</p> : null}
            {p.molecule === DEMO_SHORTAGE_MOLECULE ? (
              <p className="text-sm text-ink-muted">{t('core.playbook.showcaseNote', { molecule: p.molecule })}</p>
            ) : null}
          </Block>

          <Block id="declenchement" title={t('core.playbook.triggerTitle')}>
            <p className="text-ink">{t('core.playbook.triggerBody', { level: t(`core.levels.${p.triggerLevel}`) })}</p>
            <Rules p={p} />
            <Link href="/methode#seuils" className="inline-flex min-h-12 w-fit items-center">
              {t('core.explanation.methodLink')}
            </Link>
          </Block>

          <Block id="repartition" title={t('core.playbook.splitTitle')}>
            <p className="text-ink">{t('core.playbook.splitReserve', { pct: Math.round(p.allocation.hospitalReserveShare * 100) })}</p>
            <p className="text-ink">{t('core.playbook.splitRule', { days: p.allocation.periodDays })}</p>
          </Block>

          <Block id="acteurs" title={t('core.playbook.actorsTitle')}>
            <p className="text-sm text-ink-muted">{t('core.playbook.actorsNote')}</p>
            <dl className="hairline-list">
              {LEVELS.map((level) => (
                <div key={level} className="flex flex-col gap-2 py-3">
                  <dt>
                    <LevelBadge level={level} />
                  </dt>
                  <dd>
                    <ul className="flex flex-col gap-1 text-ink">
                      {p.actors[level].map((a) => (
                        <li key={a.role}>
                          <span className="font-medium">{t(`core.playbook.roles.${a.role}`)}</span>
                          {' : '}
                          {a.actions.map((action) => t(`core.playbook.actions.${action}`)).join(' ; ')}
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              ))}
            </dl>
          </Block>

          <Block id="validation" title={t('core.playbook.approvalTitle')}>
            <p className="text-ink">{t('core.playbook.approvalBody')}</p>
            <ul className="hairline-list">
              {p.clauses.map((c) => (
                <li key={c.id} className="flex flex-col gap-1.5 py-3">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink">{t(`core.playbook.clauses.${c.id}`)}</span>
                    <span className="rounded-sm border border-dashed border-ink-muted px-1.5 text-xs leading-5 text-ink-muted">
                      {t('core.playbook.stateLabel')} : {t('core.playbook.pendingValidation')}
                    </span>
                  </span>
                  <span className="text-sm text-ink-muted">{t(`core.playbook.clausePurpose.${c.id}`)}</span>
                  <span className="text-ink">
                    {t('core.playbook.reviewersLabel')} : {c.reviewers.map((r) => t(`core.playbook.roles.${r}`)).join(', ')}
                  </span>
                  <span className="text-ink">{t('core.playbook.clauseEmpty')}</span>
                </li>
              ))}
            </ul>
          </Block>

          <p className="text-sm text-ink-muted">{t('core.playbook.versionNote')}</p>
          <p className="text-sm text-ink-muted">{t('core.guidance.disclaimer')}</p>
          <Link href="/methode#protocoles" className="inline-flex min-h-12 w-fit items-center">
            {t('core.playbook.back')}
          </Link>
        </div>
      </SiteMain>
      <SiteFooter />
    </>
  );
}
