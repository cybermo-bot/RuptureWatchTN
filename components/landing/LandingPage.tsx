import { ArrowRight, BriefcaseMedical, Landmark, Play, Search, Truck } from 'lucide-react';
import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { LogoMark } from '@/components/brand/Logo';
import { GOVERNORATE_SHAPES } from '@/components/GovernorateMap';
import { t, tList, type MessageKey } from '@/lib/i18n';
import { tourStops, type TourStop } from '@/lib/landing/tour';
import { scenarioFrames, type AlertRecipient } from '@/lib/scenario/frames';
import { DEFAULT_PARAMS, type Level, type RuleId } from '@/lib/signal';
import { landingFontVariables } from './fonts';
import type { GlobeStop, GlobeTexts } from './globe-engine';
import { LandingGlobe, type GlobeLabels } from './LandingGlobe';
import { LandingNational, splitOnce } from './LandingNational';
import { LandingRoot } from './LandingRoot';
import './landing.css';

// The home page (app/(site)/page.tsx): a dark first screen where the scenario plays on a 3D globe,
// then light sections: how it works, the national unit's view, the doors to each space, and the
// pages that explain the method. Palette and fonts are scoped to this page (.rwl, landing.css).
// Every figure is computed from the scenario or from lib/signal/params.ts, simulated data carries
// its badge, and all text comes from messages/fr/core.json.

const GOV_NAME = new Map(GOVERNORATE_SHAPES.map((g) => [g.code, g.name]));
const LIST = new Intl.ListFormat('fr', { type: 'conjunction' });
const LEVELS: Level[] = ['none', 'watch', 'likely', 'confirmed', 'cleared'];
const RECIPIENTS: AlertRecipient[] = ['followers', 'wholesalers', 'hospitals', 'coordination'];

const STOP_TEXT: Partial<Record<RuleId, MessageKey>> = {
  foreign_notice_only: 'core.landing.hero.rules.foreign_notice_only',
  local_report_plus_foreign_notice: 'core.landing.hero.rules.local_report_plus_foreign_notice',
  two_pharmacies_7d: 'core.landing.hero.rules.two_pharmacies_7d',
  confirmed_threshold: 'core.landing.hero.rules.confirmed_threshold',
  delivered_again_cleared: 'core.landing.hero.rules.delivered_again_cleared',
};

const plural = (value: number | string, one: MessageKey, many: MessageKey) =>
  t(typeof value === 'number' && value <= 1 ? one : many);

function globeStop(s: TourStop): GlobeStop {
  const vars = { pharmacies: String(s.pharmacies ?? ''), governorates: s.governorates ?? '', quietDays: DEFAULT_PARAMS.quietDays };
  const key = STOP_TEXT[s.rule];
  const text = s.kind === 'start' ? '' : key ? t(key, vars) : t(`core.rules.${s.rule}`, { ...vars, sources: '', delivered: '', pharmacies7d: '' });
  const meta: [string, string][] = [];
  if (s.kind === 'notice') {
    meta.push([String(s.notices), plural(s.notices, 'core.landing.hero.meta.notice', 'core.landing.hero.meta.notices')]);
  }
  if ((s.kind === 'notice' || s.kind === 'report') && s.pharmacies !== null) {
    meta.push([String(s.pharmacies), plural(s.pharmacies, 'core.landing.hero.meta.pharmacy', 'core.landing.hero.meta.pharmacies')]);
  }
  if (s.kind === 'report' && s.governorates !== null) {
    meta.push([String(s.governorates), plural(s.governorates, 'core.landing.hero.meta.governorate', 'core.landing.hero.meta.governorates')]);
  }
  return {
    kind: s.kind,
    day: s.day,
    level: s.level,
    previous: s.previous,
    focus: s.focus,
    fills: s.fills,
    alerted: s.alerted,
    place: s.kind === 'notice' ? t('core.landing.hero.noticePlace') : LIST.format(s.focus.map((c) => GOV_NAME.get(c) ?? c)),
    text,
    meta,
    alert: s.alerted.length ? t(s.standDown || s.kind === 'cleared' ? 'core.landing.hero.standDown' : 'core.landing.hero.alerted') : null,
  };
}

function Emphasis({ text, part }: { text: string; part: string }) {
  const [lead, tail] = splitOnce(text, part);
  return (
    <>
      {lead}
      {tail !== null ? <em>{part}</em> : null}
      {tail}
    </>
  );
}

function Arrow() {
  return <ArrowRight strokeWidth={2.2} aria-hidden="true" />;
}

function HeroCopy() {
  const title = t('core.home.stage.title');
  const emphasis = t('core.landing.hero.titleEmphasis');
  const words = title.split(' ');
  return (
    <div className="copy">
      <p className="chip">
        <b />
        {t('core.home.stage.demo')}
      </p>
      <h1 id="accroche" aria-label={title} data-globe="copy-anchor">
        {words.map((w, i) => (
          <span key={i}>
            <span className="w" style={{ '--i': i } as CSSProperties} aria-hidden="true">
              <span>{w === emphasis ? <em>{w}</em> : w}</span>
            </span>
            {i < words.length - 1 ? ' ' : null}
          </span>
        ))}
      </h1>
      <p className="lead">{t('core.home.tagline')}</p>
      <ol className="phases" data-globe="phases" aria-label={t('core.landing.hero.phasesLabel')}>
        {(['report', 'signal', 'act'] as const).map((k) => (
          <li key={k}>
            <i />
            {t(`core.home.steps.${k}.title`)}
          </li>
        ))}
      </ol>
      <div className="cta">
        <Link className="btn btn-cit" href="/scenario" data-mag>
          <Play fill="currentColor" strokeWidth={0} aria-hidden="true" />
          {t('core.home.stage.cta')}
        </Link>
        <Link className="btn btn-ghost" href="/medicaments?recherche=1" data-mag>
          <Search strokeWidth={2} aria-hidden="true" />
          {t('core.redesign.search')}
        </Link>
      </div>
    </div>
  );
}

function How() {
  const statement = t('core.home.tagline');
  const network: [AlertRecipient, number, number][] = [
    ['followers', 62, 41],
    ['wholesalers', 238, 41],
    ['hospitals', 62, 197],
    ['coordination', 238, 197],
  ];
  const ladder: { level: Exclude<Level, 'none'>; hint: string }[] = [
    { level: 'watch', hint: t('core.landing.how.ladder.watch') },
    { level: 'likely', hint: t('core.landing.how.ladder.likely', { pharmacies: DEFAULT_PARAMS.likelyMinPharmacies, days: DEFAULT_PARAMS.likelyWindowDays }) },
    { level: 'confirmed', hint: t('core.landing.how.ladder.confirmed', { governorates: DEFAULT_PARAMS.confirmMinGovernorates }) },
    { level: 'cleared', hint: t('core.landing.how.ladder.cleared', { days: DEFAULT_PARAMS.quietDays }) },
  ];
  return (
    <section className="sec" id="comment" aria-labelledby="how-t">
      <div className="wrap">
        <div className="sec-head">
          <p className="eyebrow" data-rv>
            {t('core.home.howTitle')}
          </p>
          <h2 className="statement" id="how-t" data-words aria-label={statement}>
            {statement.split(' ').map((w, i, all) => (
              <span key={i}>
                <span className="sw" aria-hidden="true">
                  {w}
                </span>
                {i < all.length - 1 ? ' ' : null}
              </span>
            ))}
          </h2>
        </div>
        <div className="how">
          <article className="card" data-rv data-tilt>
            <div className="viz" aria-hidden="true">
              <div className="phone">
                <div className="n" />
                <div className="row">{t('core.landing.how.phoneMedicine')}</div>
                <div className="row q">{t('core.landing.how.phoneStatus')}</div>
                <div className="big">{t('core.landing.how.phoneAction')}</div>
                <div className="tapdot a" />
                <div className="tapdot b" />
                <div className="done">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9.5" />
                    <path d="M7.5 12.5l3 3 6-6.5" />
                  </svg>
                  {t('core.landing.how.phoneDone')}
                </div>
              </div>
            </div>
            <p className="num">{'01'}</p>
            <h3>{t('core.home.steps.report.title')}</h3>
            <p>{t('core.home.steps.report.body')}</p>
          </article>
          <article className="card" data-rv data-tilt style={{ '--d': '120ms' } as CSSProperties}>
            <div className="viz" aria-hidden="true">
              <div className="ladder">
                {ladder.map((r, i) => (
                  <div key={r.level} className="rung" style={{ '--c': `var(--${r.level}-s)`, '--rd': `${i * 1.6}s` } as CSSProperties}>
                    <i />
                    {t(`core.levels.${r.level}`)}
                    <span>{r.hint}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="num">{'02'}</p>
            <h3>{t('core.home.steps.signal.title')}</h3>
            <p>{t('core.home.steps.signal.body')}</p>
          </article>
          <article className="card" data-rv data-tilt style={{ '--d': '240ms' } as CSSProperties}>
            <div className="viz rad" aria-hidden="true">
              <svg viewBox="0 0 300 230">
                <path className="ln" d="M150 115 C110 90 90 60 56 40" />
                <path className="ln" d="M150 115 C190 90 210 60 244 40" style={{ animationDelay: '-.6s' }} />
                <path className="ln" d="M150 115 C110 140 90 170 56 190" style={{ animationDelay: '-1.2s' }} />
                <path className="ln" d="M150 115 C190 140 210 170 244 190" style={{ animationDelay: '-1.8s' }} />
                <circle className="core" cx="150" cy="115" r="22" fill="#dff576" />
                <circle cx="150" cy="115" r="34" fill="none" stroke="#dff576" strokeOpacity=".3" />
                <g fill="#35204c" stroke="#4b3566">
                  {network.map(([k, x, y]) => (
                    <rect key={k} x={x - 48} y={y - 19} width="96" height="30" rx="15" />
                  ))}
                </g>
                {network.map(([k, x, y]) => (
                  <text key={k} x={x} y={y} textAnchor="middle">
                    {t(`core.landing.hero.recipients.${k}`)}
                  </text>
                ))}
              </svg>
            </div>
            <p className="num">{'03'}</p>
            <h3>{t('core.home.steps.act.title')}</h3>
            <p>{t('core.home.steps.act.body')}</p>
          </article>
        </div>
      </div>
    </section>
  );
}

function Roles({ signInError }: { signInError: string | null }) {
  const open = t('core.home.open');
  const doors: { href: string; icon: typeof Search; group: MessageKey; title: MessageKey; body: MessageKey }[] = [
    { href: '/connexion/pharmacie', icon: BriefcaseMedical, group: 'core.home.roleGroups.terrain', title: 'core.redesign.roles.pharmacy.title', body: 'core.redesign.roles.pharmacy.body' },
    { href: '/connexion/grossiste', icon: Truck, group: 'core.home.roleGroups.terrain', title: 'core.redesign.roles.wholesaler.title', body: 'core.redesign.roles.wholesaler.body' },
  ];
  return (
    <section className="sec" id="roles" aria-labelledby="roles-t">
      <div className="wrap">
        <div className="sec-head">
          <p className="eyebrow" data-rv>
            {t('core.landing.roles.eyebrow')}
          </p>
          <h2 className="h2" id="roles-t" data-rv>
            <Emphasis text={t('core.redesign.rolesTitle')} part={t('core.landing.roles.emphasis')} />
          </h2>
          <p className="sub" data-rv>
            {t('core.landing.roles.intro')}
          </p>
          <p className="rolenote" data-rv>
            <span>{t('core.home.rolesNote')}</span>
            <span className="badge lt">{t('core.origin.simulated')}</span>
          </p>
          {signInError ? (
            <p role="alert" className="role-alert">
              {signInError}
            </p>
          ) : null}
        </div>
        <div className="rg" data-rv>
          <Link className="role pub" href="/medicaments?recherche=1" data-spot>
            <div className="txt">
              <span className="tag">{t('core.home.roleGroups.public')}</span>
              <span className="ico">
                <Search strokeWidth={1.8} aria-hidden="true" />
              </span>
              <strong>{t('core.redesign.roles.patient.title')}</strong>
              <p>{t('core.redesign.roles.patient.body')}</p>
              <span className="op">
                {open}
                <Arrow />
              </span>
            </div>
            <div className="mini" aria-hidden="true">
              <div className="s">{t('core.landing.how.phoneMedicine')}</div>
              <div className="ok">{t('core.landing.roles.miniStatus')}</div>
              <div className="m">{t('core.landing.roles.miniPrivacy')}</div>
            </div>
          </Link>
          {doors.map(({ href, icon: Icon, group, title, body }) => (
            <Link key={href} className="role" href={href} data-spot>
              <span className="tag">{t(group)}</span>
              <span className="ico">
                <Icon strokeWidth={1.8} aria-hidden="true" />
              </span>
              <strong>{t(title)}</strong>
              <p>{t(body)}</p>
              <span className="op">
                {open}
                <Arrow />
              </span>
            </Link>
          ))}
          <Link className="role wide" href="/connexion/institution" data-spot>
            <span className="tag">{t('core.home.roleGroups.pilotage')}</span>
            <span className="ico">
              <Landmark strokeWidth={1.8} aria-hidden="true" />
            </span>
            <strong>{t('public.home.institution.title')}</strong>
            <p>{t('public.home.institution.body')}</p>
            <div className="four" aria-hidden="true">
              {tList('core.landing.roles.institutions').map((name) => (
                <span key={name}>{name}</span>
              ))}
            </div>
            <span className="op">
              {open}
              <Arrow />
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}

function Explore() {
  const open = t('core.home.open');
  const levels: Exclude<Level, 'none'>[] = ['watch', 'likely', 'confirmed', 'cleared'];
  return (
    <section className="sec" id="comprendre" aria-labelledby="ex-t">
      <div className="wrap">
        <div className="sec-head">
          <p className="eyebrow" data-rv>
            {t('core.landing.explore.eyebrow')}
          </p>
          <h2 className="h2" id="ex-t" data-rv>
            {t('core.home.exploreTitle')}
          </h2>
        </div>
        <div className="ex">
          <Link className="exc a" href="/scenario" data-rv>
            <h3>{t('core.home.explore.scenario.title')}</h3>
            <p>{t('core.home.explore.scenario.body')}</p>
            <div className="tl" aria-hidden="true">
              {levels.map((l, i) => (
                <span key={l} className="tl-step">
                  <i style={{ '--c': `var(--${l}-s)` } as CSSProperties} />
                  {i < levels.length - 1 ? (
                    <s style={{ '--c': `var(--${l}-s)`, '--c2': `var(--${levels[i + 1]}-s)`, '--sd': `${i * 0.8}s` } as CSSProperties} />
                  ) : null}
                </span>
              ))}
            </div>
            <span className="arr">
              {open}
              <Arrow />
            </span>
          </Link>
          <Link className="exc b" href="/vues" data-rv style={{ '--d': '100ms' } as CSSProperties}>
            <h3>{t('core.home.explore.views.title')}</h3>
            <p>{t('core.home.explore.views.body')}</p>
            <div className="four" aria-hidden="true">
              {tList('core.landing.explore.views').map((v) => (
                <span key={v}>{v}</span>
              ))}
            </div>
            <span className="arr">
              {open}
              <Arrow />
            </span>
          </Link>
          <Link className="exc c" href="/methode" data-rv>
            <h3>{t('core.home.explore.method.title')}</h3>
            <p>{t('core.home.explore.method.body')}</p>
            <span className="arr">
              {open}
              <Arrow />
            </span>
          </Link>
          <Link className="exc d" href="/retour" data-rv style={{ '--d': '100ms' } as CSSProperties}>
            <h3>{t('core.home.explore.replay.title')}</h3>
            <p>{t('core.home.explore.replay.body')}</p>
            <span className="arr">
              {open}
              <Arrow />
            </span>
          </Link>
          <Link className="exc e" href="/pharmacies" data-rv style={{ '--d': '200ms' } as CSSProperties}>
            <h3>{t('core.redesign.explore.directory')}</h3>
            <p>{t('core.landing.explore.directoryBody')}</p>
            <span className="arr">
              {open}
              <Arrow />
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="foot dark">
      <div className="wrap">
        <div className="fr">
          <div className="fr-id">
            <LogoMark size={26} />
            <p>{t('core.home.footer')}</p>
          </div>
          <nav className="fl" aria-label={t('core.landing.footer.label')}>
            <Link href="/medicaments">{t('core.site.public')}</Link>
            <Link href="/status">{t('core.home.statusLink')}</Link>
          </nav>
        </div>
        <div className="big" aria-hidden="true">
          {t('core.app.wordmark')}
        </div>
        <p className="fine2">
          <span>{t('core.guidance.disclaimer')}</span>
          <span>{t('core.landing.footer.noEndorsement')}</span>
        </p>
      </div>
    </footer>
  );
}

export function LandingPage({ signInError }: { signInError: string | null }): ReactNode {
  const frames = scenarioFrames(t('core.scenario.noticeSource'), '/methode#garde-fous');
  const tour = tourStops(frames);
  const stops = tour.map(globeStop);
  const levelWords = Object.fromEntries(LEVELS.map((l) => [l, t(`core.levels.${l}`)])) as Record<Level, string>;
  const texts: GlobeTexts = {
    levels: levelWords,
    before: t('core.scenario.changedFrom'),
    unchanged: t('core.landing.hero.unchanged'),
    nobody: t('core.landing.hero.nobody'),
    recipients: Object.fromEntries(RECIPIENTS.map((r) => [r, t(`core.landing.hero.recipients.${r}`)])) as Record<AlertRecipient, string>,
    country: t('core.landing.hero.country'),
    noReport: t('core.home.national.mapNone'),
    dayShort: t('core.scenario.dayShort'),
    play: t('core.landing.hero.play'),
    pause: t('core.landing.hero.pause'),
  };
  const labels: GlobeLabels = {
    globe: t('core.landing.hero.globeLabel'),
    controls: t('core.landing.hero.controls'),
    previous: t('core.landing.hero.previous'),
    next: t('core.landing.hero.next'),
    simulated: t('core.origin.simulated'),
    simulatedTitle: t('core.origin.label', { origin: t('core.origin.simulated') }),
    nodes: tour.map((s) =>
      s.day === null
        ? { short: t('core.landing.hero.start'), name: t('core.landing.hero.startLabel') }
        : { short: t('core.scenario.dayShort', { day: s.day }), name: t('core.landing.hero.stepLabel', { day: s.day, level: levelWords[s.level] }) },
    ),
  };

  return (
    <LandingRoot className={`rwl ${landingFontVariables}`}>
      <div className="progress" aria-hidden="true">
        <i data-progress />
      </div>
      <header className="nav dark" data-nav>
        <a className="brand" href="#top" aria-label={t('core.landing.nav.home')}>
          <LogoMark size={26} />
          <span>{t('core.app.name')}</span>
        </a>
        <nav aria-label={t('core.landing.nav.label')}>
          <ul>
            <li>
              <Link href="/scenario">{t('core.landing.nav.scenario')}</Link>
            </li>
            <li>
              <a href="#national">{t('core.landing.nav.national')}</a>
            </li>
            <li>
              <a href="#roles">{t('core.landing.nav.roles')}</a>
            </li>
            <li>
              <a href="#comprendre">{t('core.landing.nav.explore')}</a>
            </li>
          </ul>
        </nav>
        <a className="btn btn-cit" href="#roles" data-mag>
          {t('core.site.chooseRole')}
        </a>
      </header>

      <main id="contenu">
        <LandingGlobe
          stops={stops}
          texts={texts}
          labels={labels}
          geoUrl="/landing/globe.json"
          attribution={t('core.landing.hero.attribution')}
          disclaimer={
            <>
              <span className="badge dk">{t('core.origin.simulated')}</span>
              <span className="disc-long">{t('core.landing.hero.disclaimerLong')}</span>
              <span>{t('core.guidance.disclaimer')}</span>
            </>
          }
        >
          <HeroCopy />
        </LandingGlobe>

        <div className="paper">
          <div className="band" aria-hidden="true">
            <div className="mq">
              {[0, 1].map((k) => (
                <span key={k}>
                  {tList('core.landing.band').map((item) => (
                    <span key={item} className="mq-item">
                      {item}
                    </span>
                  ))}
                </span>
              ))}
            </div>
          </div>
          <How />
          <LandingNational frames={frames} />
          <Roles signInError={signInError} />
          <Explore />
        </div>
      </main>
      <Footer />
    </LandingRoot>
  );
}
