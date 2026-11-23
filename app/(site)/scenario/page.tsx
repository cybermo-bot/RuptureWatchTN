import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { ScenarioPlayer } from '@/components/scenario/ScenarioPlayer';
import { SiteFooter, SiteHeader } from '@/components/SiteChrome';
import { t } from '@/lib/i18n';
import { sharedPageMetadata } from '@/lib/og/meta';

export const metadata: Metadata = sharedPageMetadata(t('core.scenario.title'), { title: t('core.og.scenario.title'), body: t('core.og.scenario.body') });

// Public: no sign-in. The scenario runs in the visitor's browser and writes nothing.
export default function ScenarioPage() {
  return (
    <>
      <SiteHeader />
      <main id="contenu" className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-5 py-8 sm:px-8 sm:py-12">
        <PageHeader title={t('core.scenario.title')} description={t('core.scenario.intro')} />
        <ScenarioPlayer />
        <Link href="/methode" className="flex min-h-12 w-fit items-center">
          {t('core.explanation.methodLink')}
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
