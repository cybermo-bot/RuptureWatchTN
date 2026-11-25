import { LandingPage } from '@/components/landing/LandingPage';
import { t } from '@/lib/i18n';

// The home page: the scenario on a 3D globe, then how it works, the national unit's view, one door
// per space and the pages that explain the method (components/landing). A failed demo sign-in
// comes back here with ?erreur=..., shown above the doors.

export default async function HomePage({ searchParams }: PageProps<'/'>) {
  const { erreur } = await searchParams;
  const signInError = erreur === 'occupe' ? t('core.home.signInBusy') : typeof erreur === 'string' ? t('core.home.signInError') : null;

  return <LandingPage signInError={signInError} />;
}
