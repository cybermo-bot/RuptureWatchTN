import { ArrowRight, BriefcaseMedical, ClipboardList, MapPin, Search, Truck, Waypoints } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { buttonClass } from '@/components/Button';
import { OriginBadge } from '@/components/OriginBadge';
import { SiteFooter, Wordmark } from '@/components/SiteChrome';
import { t } from '@/lib/i18n';

const PATHS = [
  { key: 'patient', href: '/medicaments?recherche=1', icon: Search },
  { key: 'pharmacy', href: '/connexion/pharmacie', icon: BriefcaseMedical },
  { key: 'wholesaler', href: '/connexion/grossiste', icon: Truck },
] as const;

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

export default async function HomePage({ searchParams }: PageProps<'/'>) {
  const { erreur } = await searchParams;
  const signInError = erreur === 'occupe' ? t('core.home.signInBusy') : typeof erreur === 'string' ? t('core.home.signInError') : null;

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
                  {t('core.home.entry.demo')} <ArrowRight size={18} aria-hidden="true" />
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
                {t('core.redesign.storyLink')} <ArrowRight size={17} aria-hidden="true" />
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
                    <span className="home-process-stop"><Icon size={17} aria-hidden="true" /></span>
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
              {PATHS.map(({ key, href, icon: Icon }) => (
                <li key={key}>
                  <Link href={href} className="home-role-link">
                    <Icon size={25} strokeWidth={1.6} aria-hidden="true" />
                    <span className="min-w-0">
                      <strong>{t(`core.redesign.roles.${key}.title`)}</strong>
                      <span>{t(`core.redesign.roles.${key}.body`)}</span>
                    </span>
                    <ArrowRight size={19} aria-hidden="true" className="home-arrow" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="home-explore home-chapter" aria-labelledby="explorer-titre">
            <div>
              <h2 id="explorer-titre">{t('core.redesign.exploreTitle')}</h2>
              <p>{t('core.redesign.exploreBody')}</p>
            </div>
            <ul>
              {EXPLORE.map(({ key, href, icon: Icon }) => (
                <li key={key}>
                  <Link href={href} className="home-explore-link">
                    <Icon size={21} strokeWidth={1.7} aria-hidden="true" />
                    <span>{t(`core.redesign.explore.${key}`)}</span>
                    <ArrowRight size={17} aria-hidden="true" className="home-arrow" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
