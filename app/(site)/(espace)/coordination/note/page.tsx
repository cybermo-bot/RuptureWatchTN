import Link from 'next/link';
import { redirect } from 'next/navigation';
import { categoryText } from '@/components/institutions/Lines';
import { LevelBadge } from '@/components/LevelBadge';
import { Origins } from '@/components/Origins';
import { PrintButton } from '@/components/PrintButton';
import { listDecisions } from '@/lib/allocation/decisions';
import { getCurrentSession } from '@/lib/auth/session';
import { createUserClient } from '@/lib/db/server';
import { HOME_BY_TYPE } from '@/lib/demo/roles';
import { formatDate, formatTime } from '@/lib/format';
import { t } from '@/lib/i18n';
import { byLevelCategoryBrands } from '@/lib/institutions/catalogue';
import { demandTotals, loadCatalogueFacts } from '@/lib/institutions/data';
import { DEFAULT_PARAMS, type Origin } from '@/lib/signal';
import { governorateCounts, LEVEL_ORDER, listSignals, sortSignals } from '@/lib/signals/views';

export const metadata = { title: 'Note de situation', robots: { index: false, follow: false } };

const WEEK_DAYS = 7;
const ORIGIN_ORDER: Origin[] = ['official_source', 'tester', 'simulated'];

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-semibold text-ink print:text-[11pt]">{children}</h2>;
}

// The "Note de situation": one printable A4 page for the ministry, built only from computed values
// and fixed sentences with blanks. No free text: every sentence is in messages/fr/core.json.
export default async function SituationNote() {
  const session = await getCurrentSession();
  if (!session) redirect('/#roles');
  if (session.organisation.type !== 'coordinator') redirect(HOME_BY_TYPE[session.organisation.type]);

  const now = new Date();
  const client = await createUserClient();
  const all = sortSignals(await listSignals(client));
  const [facts, decisions, demand] = await Promise.all([
    loadCatalogueFacts(client, all.map((s) => s.molecule_id)),
    listDecisions(client, null, 100),
    demandTotals(client, WEEK_DAYS),
  ]);
  const signals = byLevelCategoryBrands(all, facts);
  const confirmed = signals.filter((s) => s.level === 'confirmed');
  const governorates = await Promise.all(confirmed.map(async (s) => (await governorateCounts(client, s.molecule_id, now)).length));
  const weekAgo = now.getTime() - WEEK_DAYS * 86_400_000;
  const week = (decisions ?? []).filter((d) => new Date(d.decided_at).getTime() >= weekAgo);
  const origins = ORIGIN_ORDER.filter((o) => signals.some((s) => s.evidence.origins?.includes(o)) || week.some((d) => d.origin === o));

  return (
    <div className="print-note mx-auto flex w-full max-w-3xl flex-col gap-5">
      <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/coordination" className="flex min-h-12 items-center text-sm">
          {t('core.note.back')}
        </Link>
        <PrintButton />
      </div>
      <p className="no-print max-w-prose text-sm text-ink-muted">{t('core.note.printHint')}</p>

      <article className="panel flex flex-col gap-4 p-5 print:border-0 print:p-0">
        <header className="flex flex-col gap-1 border-b border-line pb-3">
          <p className="text-sm text-ink-muted">{t('core.orgTypes.coordinator')}</p>
          <h1 className="text-xl font-semibold text-ink print:text-[14pt]">{t('core.note.heading')}</h1>
          <p className="text-sm text-ink-muted">{t('core.note.made', { date: formatDate(now), time: formatTime(now) })}</p>
          <p className="text-sm font-medium text-ink">{t('core.guidance.disclaimer')}</p>
        </header>

        <section className="flex flex-col gap-2">
          <H2>{t('core.note.levelsTitle')}</H2>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
            {LEVEL_ORDER.map((level) => (
              <li key={level} className="flex items-center justify-between gap-2">
                <LevelBadge level={level} />
                <span className="font-mono tabular-nums">{signals.filter((s) => s.level === level).length}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <H2>{t('core.note.confirmedTitle')}</H2>
          {confirmed.length === 0 ? (
            <p className="text-sm">{t('core.note.confirmedNone')}</p>
          ) : (
            <table className="hairline-table text-sm">
              <thead>
                <tr>
                  <th scope="col">{t('core.note.colMolecule')}</th>
                  <th scope="col">{t('core.note.colSince')}</th>
                  <th scope="col" className="text-end">
                    {t('core.note.colGovernorates', { days: DEFAULT_PARAMS.confirmWindowDays })}
                  </th>
                  <th scope="col">{t('core.note.colCategory')}</th>
                </tr>
              </thead>
              <tbody>
                {confirmed.map((s, i) => (
                  <tr key={s.molecule_id}>
                    <td className="font-medium">{s.molecule_name}</td>
                    <td>{formatDate(s.since)}</td>
                    <td className="text-end font-mono">{governorates[i]}</td>
                    <td>{categoryText(facts.get(s.molecule_id))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <H2>{t('core.note.decisionsTitle', { days: WEEK_DAYS })}</H2>
          {week.length === 0 ? (
            <p className="text-sm">{t('core.note.decisionsNone', { days: WEEK_DAYS })}</p>
          ) : (
            <table className="hairline-table text-sm">
              <thead>
                <tr>
                  <th scope="col">{t('core.note.colMolecule')}</th>
                  <th scope="col">{t('core.note.colDecision')}</th>
                  <th scope="col">{t('core.note.colDate')}</th>
                </tr>
              </thead>
              <tbody>
                {week.slice(0, 8).map((d) => (
                  <tr key={d.id}>
                    <td className="font-medium">{d.molecule_name}</td>
                    <td>{d.applied ? t('core.note.decisionApplied') : t('core.note.decisionNotApplied')}</td>
                    <td>{formatDate(d.decided_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <H2>{t('core.note.demandTitle', { days: WEEK_DAYS })}</H2>
          <p className="text-sm">{t('core.note.demandLine', { requests: demand.requests, unanswered: demand.unanswered })}</p>
        </section>

        <footer className="flex flex-col gap-2 border-t border-line pt-3 text-xs text-ink-muted">
          <p className="flex flex-wrap items-center gap-2">
            <span>{t('core.note.originsTitle')}</span>
            <Origins origins={origins} />
          </p>
          <p>{t('core.note.method')}</p>
          <p>{t('core.note.footer')}</p>
        </footer>
      </article>
    </div>
  );
}
