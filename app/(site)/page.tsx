import { ArrowRight, BriefcaseMedical, ClipboardList, Landmark, MapPin, Search, Truck, Waypoints } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { buttonClass } from '@/components/Button';
import { OriginBadge } from '@/components/OriginBadge';
import { SiteFooter, Wordmark } from '@/components/SiteChrome';
import { isPilot } from '@/lib/env';
import { type MessageKey, t } from '@/lib/i18n';

// Every space is one click from here: the patient search and the three sign-in doors.
const PATHS = [
  { key: 'patient', href: '/medicaments?recherche=1', icon: Search, title: 'core.redesign.roles.patient.title', body: 'core.redesign.roles.patient.body' },
  { key: 'pharmacy', href: '/connexion/pharmacie', icon: BriefcaseMedical, title: 'core.redesign.roles.pharmacy.title', body: 'core.redesign.roles.pharmacy.body' },
  { key: 'wholesaler', href: '/connexion/grossiste', icon: Truck, title: 'core.redesign.roles.wholesaler.title', body: 'core.redesign.roles.wholesaler.body' },
  { key: 'institution', href: '/connexion/institution', icon: Landmark, title: 'public.home.institution.title', body: 'public.home.institution.body' },
] as const satisfies readonly { key: string; href: string; icon: unknown; title: MessageKey; body: MessageKey }[];

const STEPS = [
  { key: 'report', icon: ClipboardList },
  { key: 'review', icon: Waypoints },
  { key: 'respond', icon: Truck },
] as const;

const EXPLORE = [
  { key: 'directory', href: '/pharmacies', icon: MapPin },
  { key: 'replay', href: '/retour', icon: ClipboardList },
  { key: 'method', href: '/methode', icon: Waypoints },
] as const;

/**
 * The pilot site's home (pilot-2 item 1): two doors first, « Je suis pharmacien·ne » (invitation,
 * then sign-in) and « Je cherche un médicament ». No scenario, no demo role, no simulated story;
 * the directory, the replay and the method stay (real, sourced data).
 */
function PilotHome({ signInError }: { signInError: string | null }) {
  return (
    <>
      <header className="home-masthead">
        <div className="home-wrap home-nav">
          <Wordmark />
          <nav aria-label={t('core.redesign.navLabel')} className="flex items-center gap-x-6">
            <Link href="/medicaments?recherche=1" className="home-nav-link hidden md:inline-flex">{t('core.redesign.search')}</Link>
            <Link href="/connexion/pharmacie" className="home-nav-link">{t('core.pilot.signIn')}</Link>
          </nav>
        </div>
      </header>

      <main id="contenu" className="home-read flex-1">
        <div className="home-wrap">
          <section className="home-hero" aria-labelledby="accroche">
            <div className="home-hero-copy">
              <h1 id="accroche">{t('core.redesign.headline')}</h1>
              <p>{t('core.redesign.lead')}</p>
              {signInError ? <p role="alert" className="text-level-confirmed">{signInError}</p> : null}
              <div id="roles" className="flex scroll-mt-4 flex-wrap gap-2.5">
                <Link href="/connexion/pharmacie" className={buttonClass('primary', 'min-h-12 rounded-full')}>
                  <BriefcaseMedical size={20} aria-hidden="true" /> {t('core.pilot.home.pharmacist')}
                </Link>
                <Link href="/medicaments?recherche=1" className={buttonClass('secondary', 'home-search-action rounded-full')}>
                  <Search size={20} aria-hidden="true" /> {t('core.pilot.home.patient')}
                </Link>
              </div>
              <p>{t('core.pilot.home.invitation')}</p>
            </div>
            <div className="home-hero-photo">
              <Image
                src="/brand/pharmacy-inventory.webp"
                alt={t('core.redesign.photoAlt')}
                fill
                sizes="(min-width: 1100px) 52vw, (min-width: 720px) 46vw, 100vw"
                fetchPriority="high"
                unoptimized
              />
            </div>
          </section>
          <ExploreSection />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function ExploreSection() {
  return (
    <section className="home-explore home-chapter" aria-labelledby="explorer-titre">
      <div>
        <h2 id="explorer-titre">{t('core.redesign.exploreTitle')}</h2>
        <p>{t('core.redesign.exploreBody')}</p>
      </div>
      <ul>
        {EXPLORE.map(({ key, href, icon: Icon }) => (
          <li key={key}>
            <Link href={href} className="home-explore-link">
              <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
              <span>{t(`core.redesign.explore.${key}`)}</span>
              <ArrowRight size={20} aria-hidden="true" className="home-arrow" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function HomePage({ searchParams }: PageProps<'/'>) {
  const { erreur } = await searchParams;
  const signInError = erreur === 'occupe' ? t('core.home.signInBusy') : typeof erreur === 'string' ? t('core.home.signInError') : null;
  if (isPilot()) return <PilotHome signInError={signInError} />;

  return (
    <>
      <header className="home-masthead">
        <div className="home-wrap home-nav">
          <Wordmark />
          <nav aria-label={t('core.redesign.navLabel')} className="flex items-center gap-x-6">
            <Link href="/scenario" className="home-nav-link hidden sm:inline-flex">{t('core.redesign.scenario')}</Link>
            <Link href="/medicaments?recherche=1" className="home-nav-link hidden md:inline-flex">{t('core.redesign.search')}</Link>
            <a href="#roles" className="home-nav-link">{t('core.redesign.professionals')}</a>
          </nav>
        </div>
      </header>

      <main id="contenu" className="home-read flex-1">
        <div className="home-wrap">
          <section className="home-hero" aria-labelledby="accroche">
            <div className="home-hero-copy">
              <h1 id="accroche">{t('core.redesign.headline')}</h1>
              <p>{t('core.redesign.lead')}</p>
              <div className="flex flex-wrap gap-2.5">
                <Link href="/scenario" className={buttonClass('primary', 'min-h-12 rounded-full')}>
                  {t('core.home.entry.demo')} <ArrowRight size={20} aria-hidden="true" />
                </Link>
                <Link href="/medicaments?recherche=1" className={buttonClass('secondary', 'home-search-action rounded-full')}>
                  {t('core.redesign.search')}
                </Link>
              </div>
            </div>
            <div className="home-hero-photo">
              <Image
                src="/brand/pharmacy-inventory.webp"
                alt={t('core.redesign.photoAlt')}
                fill
                sizes="(min-width: 1100px) 52vw, (min-width: 720px) 46vw, 100vw"
                fetchPriority="high"
                unoptimized
              />
            </div>
          </section>

          <section className="home-story home-chapter" aria-labelledby="scenario-titre">
            <div className="home-story-copy">
              <h2 id="scenario-titre">{t('core.redesign.storyTitle')}</h2>
              <p>{t('core.redesign.storyBody')}</p>
              <Link href="/scenario" className="home-inline-link">
                {t('core.redesign.storyLink')} <ArrowRight size={20} aria-hidden="true" />
              </Link>
            </div>
            <div className="home-story-process">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-medium">{t('core.redesign.storyEvent')}</span>
                <OriginBadge origin="simulated" />
              </div>
              <ol className="home-process">
                {STEPS.map(({ key, icon: Icon }) => (
                  <li key={key}>
                    <span className="home-process-stop"><Icon size={20} aria-hidden="true" /></span>
                    <span>{t(`core.redesign.steps.${key}`)}</span>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section id="roles" className="home-roles home-chapter" aria-labelledby="roles-titre">
            <h2 id="roles-titre">{t('core.redesign.rolesTitle')}</h2>
            {signInError ? <p role="alert" className="mt-4 text-level-confirmed">{signInError}</p> : null}
            <ul className="home-role-list">
              {PATHS.map(({ key, href, icon: Icon, title, body }) => (
                <li key={key}>
                  <Link href={href} className="home-role-link">
                    <Icon size={24} strokeWidth={1.75} aria-hidden="true" />
                    <span className="min-w-0">
                      <strong>{t(title)}</strong>
                      <span>{t(body)}</span>
                    </span>
                    <ArrowRight size={20} aria-hidden="true" className="home-arrow" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <ExploreSection />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
