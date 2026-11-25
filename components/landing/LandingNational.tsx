import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { GOVERNORATE_SHAPES } from '@/components/GovernorateMap';
import { LevelShape } from '@/components/LevelBadge';
import { levelRank } from '@/lib/landing/tour';
import { t, type MessageKey } from '@/lib/i18n';
import { frozenFrame, type ScenarioFrame } from '@/lib/scenario/frames';
import { DEFAULT_PARAMS, type Level, type RuleId } from '@/lib/signal';

// "Ce que voit la cellule nationale" on the home page: the national unit's view at the moment the
// scenario first reaches "confirmée" (frozenFrame), with the level chart of the whole scenario and
// the rules' figures. Everything is computed here from scenarioFrames() and lib/signal/params.ts;
// nothing is read from the database and nothing is hardcoded. Simulated data carries its badge.

const GOV_NAME = new Map(GOVERNORATE_SHAPES.map((g) => [g.code, g.name]));
const LIST = new Intl.ListFormat('fr', { type: 'conjunction' });
const LEVELS: Exclude<Level, 'none'>[] = ['watch', 'likely', 'confirmed', 'cleared'];
// Level colours on white (the light tokens of landing.css), and their lighter tints on plum.
const ON_LIGHT: Record<Level, string> = { none: '#665775', watch: '#8b5900', likely: '#a94412', confirmed: '#ae233a', cleared: '#216d54' };
const ON_STAGE: Record<Level, string> = { none: '#7e6a96', watch: '#e9c46a', likely: '#f4a06b', confirmed: '#ff8fa3', cleared: '#6fd3ae' };

const WHY: Partial<Record<RuleId, MessageKey>> = {
  foreign_notice_only: 'core.landing.national.why.foreign_notice_only',
  local_report_plus_foreign_notice: 'core.landing.national.why.local_report_plus_foreign_notice',
  confirmed_threshold: 'core.landing.national.why.confirmed_threshold',
  delivered_again_cleared: 'core.landing.national.why.delivered_again_cleared',
};
const MARK: Partial<Record<RuleId, MessageKey>> = {
  foreign_notice_only: 'core.landing.national.marks.foreign_notice_only',
  local_report_plus_foreign_notice: 'core.landing.national.marks.local_report_plus_foreign_notice',
  confirmed_threshold: 'core.landing.national.marks.confirmed_threshold',
  delivered_again_cleared: 'core.landing.national.marks.delivered_again_cleared',
};

function why(f: ScenarioFrame): string {
  const vars = {
    pharmacies: String(f.evidence.pharmacies14d),
    governorates: f.evidence.governorates14d ?? '',
    quietDays: DEFAULT_PARAMS.quietDays,
  };
  const key = WHY[f.rule];
  return key ? t(key, vars) : t(`core.rules.${f.rule}`, { ...vars, sources: '', delivered: String(f.evidence.deliveredAgainPharmacies), pharmacies7d: String(f.evidence.pharmacies7d) });
}

function LevelChart({ frames }: { frames: ScenarioFrame[] }) {
  const changes = frames.filter((f) => f.changed);
  const days = Math.max(1, frames[frames.length - 1].day);
  const Wc = 900;
  const Hc = 250;
  const pl = 128;
  const pr = 24;
  const pt = 24;
  const pb = 34;
  const X = (d: number) => pl + ((Wc - pl - pr) * d) / days;
  const Y = (rank: number) => pt + (Hc - pt - pb) * (1 - rank / 3);
  const pts = changes.map((f) => ({ day: f.day, rank: levelRank(f.level), frame: f }));
  let d = `M${X(0)} ${Y(0)}`;
  pts.forEach((p, i) => {
    const before = i === 0 ? 0 : pts[i - 1].rank;
    d += ` L${X(p.day)} ${Y(before)} L${X(p.day)} ${Y(p.rank)}`;
  });
  const area = `${d} L${X(days)} ${Y(pts.length ? pts[pts.length - 1].rank : 0)} L${X(days)} ${Y(0)} Z`;
  const names: Level[] = ['none', 'watch', 'likely', 'confirmed'];
  const ticks = [...new Set([0, ...pts.map((p) => p.day), days])];
  const label = t('core.landing.national.chartLabel', {
    steps: pts.map((p) => t('core.landing.national.chartStep', { level: t(`core.levels.${p.frame.level}`).toLowerCase(), day: p.day })).join(', '),
  });

  return (
    <div className="chart" data-chart role="img" aria-label={label}>
      <svg viewBox={`0 0 ${Wc} ${Hc}`} aria-hidden="true">
        <defs>
          <linearGradient id="rwl-chart-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#4d36c8" stopOpacity=".3" />
            <stop offset="1" stopColor="#4d36c8" stopOpacity="0" />
          </linearGradient>
        </defs>
        {names.map((n, i) => (
          <g key={n}>
            <line className="gl" x1={pl} x2={Wc - pr} y1={Y(i)} y2={Y(i)} strokeDasharray={i ? '2 5' : undefined} />
            <text x={pl - 14} y={Y(i) + 4} textAnchor="end">
              {t(`core.levels.${n}`)}
            </text>
          </g>
        ))}
        {ticks.map((dd) => (
          <text key={dd} x={X(dd)} y={Hc - 8} textAnchor="middle">
            {t('core.scenario.dayShort', { day: dd })}
          </text>
        ))}
        <path className="area" d={area} fill="url(#rwl-chart-area)" />
        <path className="ln" d={d} pathLength={1} style={{ '--len': 1 } as CSSProperties} />
        {pts.map((p, i) => {
          const x = X(p.day);
          const y = Y(p.rank);
          const end = p.day > days * 0.68;
          const key = MARK[p.frame.rule];
          const color = ON_LIGHT[p.frame.level];
          return (
            <g key={p.frame.index} className="pt" style={{ '--pd': `${i * 0.5 + 0.5}s` } as CSSProperties}>
              <circle cx={x} cy={y} r="10" fill={color} fillOpacity=".16" />
              <circle cx={x} cy={y} r="5" fill="#fff" stroke={color} strokeWidth="2.5" />
              <text x={x + (end ? -16 : 16)} y={y + (p.rank === 0 ? -16 : 26)} textAnchor={end ? 'end' : 'start'} style={{ fill: color, fontWeight: 500 }}>
                {key ? t(key) : t(`core.levels.${p.frame.level}`)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// The relief: the country drawn once in <defs>, then stacked as dark layers below the top one,
// where the governorates that report take the level's colour.
function ReliefMap({ frame }: { frame: ScenarioFrame }) {
  const hot = new Set(frame.counts.map((c) => c.governorateCode));
  const shadows = [-26, -22, -18, -14, -10, -6, -2];
  const id = (code: string) => `rwl-gov-${code}`;
  return (
    <>
      <svg viewBox="0 0 463 1000" aria-hidden="true" style={{ transform: `translateZ(${shadows[0]}px)` }}>
        <defs>
          <g id="rwl-tn">
            {GOVERNORATE_SHAPES.map((g) => (
              <path key={g.code} id={id(g.code)} d={g.d} />
            ))}
          </g>
        </defs>
        <use href="#rwl-tn" fill="#150a22" />
      </svg>
      {shadows.slice(1).map((z) => (
        <svg key={z} viewBox="0 0 463 1000" aria-hidden="true" style={{ transform: `translateZ(${z}px)` }}>
          <use href="#rwl-tn" fill="#150a22" />
        </svg>
      ))}
      <svg viewBox="0 0 463 1000" aria-hidden="true">
        <g fill="#4a3270" stroke="#a995cc" strokeWidth="1.2" strokeLinejoin="round" strokeOpacity="0.8">
          {GOVERNORATE_SHAPES.filter((g) => !hot.has(g.code)).map((g) => (
            <use key={g.code} href={`#${id(g.code)}`} />
          ))}
        </g>
        <g fill={ON_STAGE[frame.level]} stroke="#ffffff" strokeWidth="1.2" strokeLinejoin="round" strokeOpacity="0.8">
          {GOVERNORATE_SHAPES.filter((g) => hot.has(g.code)).map((g) => (
            <use key={g.code} href={`#${id(g.code)}`} />
          ))}
        </g>
      </svg>
    </>
  );
}

export function LandingNational({ frames }: { frames: ScenarioFrame[] }) {
  const frame = frozenFrame(frames);
  const hotNames = LIST.format(frame.counts.map((c) => GOV_NAME.get(c.governorateCode) ?? c.governorateCode));
  const levelWord = t(`core.levels.${frame.level}`);
  const changes = frames.filter((f) => f.changed && f.index <= frame.index).reverse();
  const emphasis = t('core.landing.national.emphasis');
  const [titleLead, titleTail] = splitOnce(t('core.home.national.title'), emphasis);
  const simulated = t('core.origin.simulated');
  const figures = [
    { value: GOVERNORATE_SHAPES.length, unit: null, label: t('core.landing.national.figures.governorates') },
    { value: LEVELS.length, unit: null, label: t('core.landing.national.figures.levels') },
    { value: DEFAULT_PARAMS.minUndeliveredHours, unit: t('core.landing.national.figures.hoursUnit'), label: t('core.landing.national.figures.hours') },
    { value: DEFAULT_PARAMS.quietDays, unit: t('core.landing.national.figures.daysUnit'), label: t('core.landing.national.figures.quiet') },
  ];

  return (
    <section className="sec" id="national" aria-labelledby="nat-t">
      <div className="wrap">
        <div className="sec-head">
          <p className="eyebrow" data-rv>
            {t('core.home.national.demo')}
          </p>
          <h2 className="h2" id="nat-t" data-rv>
            {titleLead}
            {titleTail !== null ? <em>{emphasis}</em> : null}
            {titleTail}
          </h2>
          <p className="sub" data-rv>
            {t('core.home.national.frame')}
          </p>
        </div>
        <div className="nat">
          <div className="mapcard" data-rv>
            <h3>{t('core.home.national.mapTitle')}</h3>
            <p className="cap">{t('core.landing.national.mapHint')}</p>
            <div className="stage3d" data-relief role="img" aria-label={t('core.landing.national.mapLabel', { governorates: hotNames, level: levelWord.toLowerCase() })}>
              <div className="rig">
                <ReliefMap frame={frame} />
              </div>
            </div>
            <div className="legend">
              <span style={{ '--c': ON_STAGE[frame.level] } as CSSProperties}>
                <i />
                {t('core.landing.national.legend', { level: levelWord, governorates: hotNames })}
              </span>
              <span style={{ '--c': '#4a3270' } as CSSProperties}>
                <i />
                {t('core.home.national.mapNone')}
              </span>
            </div>
            <p className="cap attrib-map">{t('core.landing.hero.attribution')}</p>
          </div>
          <div className="panels">
            <section className="panel" data-rv aria-labelledby="medl">
              <header className="ph">
                <h3 id="medl">{t('core.home.national.listTitle')}</h3>
                <span className="badge lt">{simulated}</span>
              </header>
              <Link className="row2" href="/scenario">
                <span>
                  <span className="nm">{t('core.scenario.molecule')}</span>
                  <small className="row2-meta">
                    <span className="lp" style={{ '--c': ON_LIGHT[frame.level] } as CSSProperties}>
                      <LevelShape level={frame.level} />
                      {levelWord}
                    </span>
                    <span>{t('core.landing.national.since', { day: frame.day })}</span>
                  </small>
                </span>
                <span className="go">
                  <ArrowRight strokeWidth={2.2} aria-hidden="true" />
                </span>
                <span className="sr">{t('core.landing.national.seeScenario')}</span>
              </Link>
              <div className="counts" aria-label={t('core.home.national.countsLabel')}>
                {LEVELS.map((l) => {
                  const n = l === frame.level ? 1 : 0;
                  return (
                    <div key={l}>
                      <strong data-count={n}>{n}</strong>
                      <span>{t(`core.levels.${l}`)}</span>
                    </div>
                  );
                })}
              </div>
              <p className="src">{t('core.landing.national.source')}</p>
            </section>
            <section className="panel" data-rv aria-labelledby="chg">
              <header className="ph">
                <h3 id="chg">{t('core.landing.national.changesTitle')}</h3>
                <span className="badge lt">{simulated}</span>
              </header>
              <ul className="changes">
                {changes.map((f) => (
                  <li key={f.index} style={{ '--c': ON_LIGHT[f.level] } as CSSProperties}>
                    <span className="dot">
                      <i />
                    </span>
                    <span>
                      <b>{t('core.landing.national.change', { from: t(`core.levels.${f.previous}`), to: t(`core.levels.${f.level}`) })}</b>
                      <small>{t('core.landing.national.changeMeta', { day: f.day, why: why(f) })}</small>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>

        <div className="panel panel-chart" data-rv aria-labelledby="tl-t" id="scenario">
          <header className="ph">
            <h3 id="tl-t">{t('core.home.scenarioTitle')}</h3>
            <span className="badge lt">{simulated}</span>
          </header>
          <LevelChart frames={frames} />
          <p className="src">{t('core.home.scenarioBody')}</p>
        </div>

        <div className="figs">
          {figures.map((f, i) => (
            <div key={f.label} className="fig" data-rv style={{ '--d': `${i * 80}ms` } as CSSProperties}>
              <strong>
                <span data-count={f.value}>{f.value}</span>
                {f.unit ? <small>{f.unit}</small> : null}
              </strong>
              <span>{f.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** "Ce que voit la cellule nationale" split around "cellule nationale": [lead, tail], tail null when absent. */
export function splitOnce(text: string, part: string): [string, string | null] {
  const i = text.indexOf(part);
  if (i < 0) return [text, null];
  return [text.slice(0, i), text.slice(i + part.length)];
}
