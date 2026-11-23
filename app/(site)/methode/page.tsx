import type { Metadata } from 'next';
import Link from 'next/link';
import { LevelBadge } from '@/components/LevelBadge';
import { OriginBadge } from '@/components/OriginBadge';
import { PageHeader } from '@/components/PageHeader';
import { SiteFooter, SiteHeader, SiteMain } from '@/components/SiteChrome';
import { sharedPageMetadata } from '@/lib/og/meta';
import { ThresholdExplorer } from '@/components/method/ThresholdExplorer';
import { readSources } from '@/lib/content/sources';
import { ACTIVE_MEMBER_DAYS } from '@/lib/signals/members';
import { t, type MessageKey } from '@/lib/i18n';
import { DEFAULT_PARAMS, type Level, type Origin, type RuleId, type SignalParams } from '@/lib/signal';

export const metadata: Metadata = sharedPageMetadata(t('core.method.title'), { title: t('core.og.method.title'), body: t('core.og.method.body') });

// Public, in French. Every threshold on this page is read from lib/signal/params.ts.
const P = DEFAULT_PARAMS;
const VARS = {
  hours: P.minUndeliveredHours,
  minDays: P.minUndeliveredHours / 24,
  confirmDays: P.confirmWindowDays,
  likelyDays: P.likelyWindowDays,
  likelyMin: P.likelyMinPharmacies,
  confirmMin: P.confirmMinPharmacies,
  confirmGov: P.confirmMinGovernorates,
  sharePct: Math.round(P.confirmMemberShare * 1000) / 10,
  activeDays: ACTIVE_MEMBER_DAYS,
  noticeDays: P.noticeActiveDays,
  quietDays: P.quietDays,
  clearMin: P.clearMinDeliveredPharmacies,
  staleDays: P.staleDays,
  clearedDays: P.clearedDisplayDays,
};
const tv = (key: MessageKey) => t(key, VARS);

/** The parameters with a reason next to them (session 3 brief, section 6). */
const REASONED = ['minUndeliveredHours', 'confirmMinPharmacies', 'confirmMinGovernorates', 'confirmMemberShare', 'confirmWindowDays', 'quietDays', 'staleDays'] as const;
const isReasoned = (k: keyof SignalParams): k is (typeof REASONED)[number] => (REASONED as readonly string[]).includes(k);

/** A parameter's value as shown: shares as a percentage, everything else as it is. */
function paramValue(k: keyof SignalParams): string {
  return k === 'confirmMemberShare' ? t('core.method.shareValue', { pct: VARS.sharePct }) : String(P[k]);
}

const LEVELS: Level[] = ['watch', 'likely', 'confirmed', 'cleared', 'none'];
const RULES: RuleId[] = [
  'no_evidence',
  'foreign_notice_only',
  'local_reports_below_threshold',
  'two_pharmacies_7d',
  'local_report_plus_foreign_notice',
  'single_governorate_cap',
  'confirmed_threshold',
  'hold_until_delivered',
  'quiet_period_downgrade',
  'delivered_again_cleared',
  'cleared_expired',
];
const REPORT_ITEMS = ['delay', 'distinct', 'channels', 'delivered', 'notices', 'requests'] as const;
const NEVER = [
  'name',
  'peers',
  'patients',
  'unlabelled',
  'invented',
  'foreignOnly',
  'confirmAlone',
  'official',
  'endorsement',
  'publicLevels',
  'clinical',
  'foreignData',
  'google',
] as const;
const ORIGINS: Origin[] = ['official_source', 'tester', 'simulated'];
const KNOWN_SOURCES = ['cnam', 'geoboundaries', 'iso', 'meta', 'openstreetmap'] as const;
type KnownSource = (typeof KNOWN_SOURCES)[number];
const isKnown = (slug: string): slug is KnownSource => (KNOWN_SOURCES as readonly string[]).includes(slug);

const SECTIONS = [
  ['niveaux', 'core.method.levelsTitle'],
  ['signalement', 'core.method.reportTitle'],
  ['garde-fous', 'core.method.gatesTitle'],
  ['regles', 'core.method.rulesTitle'],
  ['seuils', 'core.method.paramsTitle'],
  ['jamais', 'core.method.neverTitle'],
  ['origine', 'core.method.originsTitle'],
  ['sources', 'core.method.sourcesTitle'],
] as const satisfies readonly (readonly [string, MessageKey])[];

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-titre`} className="panel flex scroll-mt-20 flex-col gap-4 p-5 sm:p-6">
      <h2 id={`${id}-titre`} className="text-xl font-semibold text-ink">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function MethodPage() {
  const sources = readSources();
  return (
    <>
      <SiteHeader />
      <SiteMain>
        <PageHeader
          title={t('core.method.title')}
          description={
            <div className="flex flex-col gap-3">
              <p>{t('core.method.intro')}</p>
              <p>{t('core.method.paramsNote')}</p>
            </div>
          }
        />

        <nav aria-labelledby="sommaire" className="flex flex-col gap-2">
          <h2 id="sommaire" className="text-sm font-medium text-ink-muted">
            {t('core.method.toc')}
          </h2>
          <ul className="flex flex-wrap gap-x-5 gap-y-1">
            {SECTIONS.map(([id, key]) => (
              <li key={id}>
                <a href={`#${id}`} className="inline-flex min-h-12 items-center">
                  {t(key)}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex max-w-3xl flex-col gap-14">
          <Section id="niveaux" title={t('core.method.levelsTitle')}>
            <dl className="hairline-list">
              {LEVELS.map((level) => (
                <div key={level} className="grid gap-1 py-4 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-6">
                  <dt>
                    <LevelBadge level={level} />
                  </dt>
                  <dd className="text-ink">{tv(`core.method.levels.${level}`)}</dd>
                </div>
              ))}
            </dl>
          </Section>

          <Section id="signalement" title={t('core.method.reportTitle')}>
            <ul className="flex list-disc flex-col gap-3 ps-5 text-ink marker:text-ink-muted">
              {REPORT_ITEMS.map((k) => (
                <li key={k}>{tv(`core.method.report.${k}`)}</li>
              ))}
            </ul>
          </Section>

          <Section id="garde-fous" title={t('core.method.gatesTitle')}>
            <div className="flex flex-col gap-2">
              <h3 className="font-semibold text-ink">{t('core.method.gate1Title')}</h3>
              <p className="text-ink">{tv('core.method.gate1')}</p>
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="font-semibold text-ink">{t('core.method.gate2Title')}</h3>
              <p className="text-ink">{tv('core.method.gate2')}</p>
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="font-semibold text-ink">{t('core.method.holdTitle')}</h3>
              <p className="text-ink">{tv('core.method.hold')}</p>
            </div>
          </Section>

          <Section id="regles" title={t('core.method.rulesTitle')}>
            <p className="text-ink-muted">{t('core.method.rulesIntro')}</p>
            <dl className="hairline-list">
              {RULES.map((rule) => (
                <div key={rule} id={rule} className="flex scroll-mt-4 flex-col gap-1 py-4 target:bg-surface-subtle">
                  <dt className="flex flex-wrap items-baseline gap-x-3">
                    <span className="font-medium text-ink">{t(`core.method.rules.${rule}.name`)}</span>
                    <code className="font-mono text-xs text-ink-muted">{rule}</code>
                  </dt>
                  <dd className="text-ink">{tv(`core.method.rules.${rule}.body`)}</dd>
                </div>
              ))}
            </dl>
          </Section>

          <Section id="seuils" title={t('core.method.paramsTitle')}>
            <p className="text-ink">{t('core.method.caseDefinition')}</p>
            <div className="overflow-x-auto">
              <table className="hairline-table min-w-[32rem] text-sm">
                <thead>
                  <tr>
                    <th scope="col">{t('core.method.colParam')}</th>
                    <th scope="col" className="text-end">
                      {t('core.method.colValue')}
                    </th>
                    <th scope="col">{t('core.method.colMeaning')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(Object.keys(P) as (keyof SignalParams)[]).map((k) => (
                    <tr key={k}>
                      <td className="font-mono text-xs text-ink">{k}</td>
                      <td className="text-end font-mono">{paramValue(k)}</td>
                      <td>
                        <span className="block">{tv(`core.method.params.${k}`)}</span>
                        {isReasoned(k) ? (
                          <span className="mt-1 block text-ink-muted">
                            {t('core.method.reasonLabel')} {tv(`core.method.reasons.${k}`)}
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ThresholdExplorer noticeSource={t('core.scenario.noticeSource')} />
            <h3 className="font-semibold text-ink">{t('core.method.smallCountsTitle')}</h3>
            <p className="text-ink">{t('core.method.smallCounts')}</p>
          </Section>

          <Section id="jamais" title={t('core.method.neverTitle')}>
            <ul className="hairline-list">
              {NEVER.map((k) => (
                <li key={k} className="py-3 text-ink">
                  {tv(`core.method.never.${k}`)}
                </li>
              ))}
            </ul>
          </Section>

          <Section id="origine" title={t('core.method.originsTitle')}>
            <p className="text-ink-muted">{t('core.method.originsIntro')}</p>
            <dl className="hairline-list">
              {ORIGINS.map((o) => (
                <div key={o} className="grid gap-1 py-4 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-6">
                  <dt>
                    <OriginBadge origin={o} />
                  </dt>
                  <dd className="text-ink">{t(`core.method.origins.${o}`)}</dd>
                </div>
              ))}
            </dl>
          </Section>

          <Section id="sources" title={t('core.method.sourcesTitle')}>
            <p className="text-ink-muted">{t('core.method.sourcesIntro')}</p>
            <ul className="hairline-list">
              {sources.map((s) => {
                const slug = isKnown(s.slug) ? s.slug : null;
                return (
                  <li key={s.slug} className="flex flex-col gap-1.5 py-4">
                    <span className="font-medium text-ink">{slug ? t(`core.method.sources.${slug}.name`) : s.heading}</span>
                    <span className="text-ink">{slug ? t(`core.method.sources.${slug}.use`) : t('core.method.sources.unknown.use')}</span>
                    {slug ? (
                      <span className="text-sm text-ink-muted">
                        {t('core.method.licenceLabel')}
                        {': '}
                        {t(`core.method.sources.${slug}.licence`)}
                      </span>
                    ) : null}
                    {s.url ? (
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 w-fit items-center text-sm">
                        {t('core.method.sourceLink')}
                      </a>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </Section>
        </div>

        <Link href="/" className="flex min-h-12 w-fit items-center">
          {t('core.method.backHome')}
        </Link>
      </SiteMain>
      <SiteFooter />
    </>
  );
}
