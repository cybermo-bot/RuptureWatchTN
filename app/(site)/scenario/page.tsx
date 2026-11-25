import type { Metadata } from 'next';
import { RolePicker } from '@/components/RolePicker';
import { CompareCases } from '@/components/scenario/CompareCases';
import { DecisionDemo } from '@/components/scenario/DecisionDemo';
import { ScenarioPlayer } from '@/components/scenario/ScenarioPlayer';
import { SiteFooter, SiteHeader, SiteMain } from '@/components/SiteChrome';
import { t } from '@/lib/i18n';
import { sharedPageMetadata } from '@/lib/og/meta';

export const metadata: Metadata = sharedPageMetadata(t('core.scenario.title'), { title: t('core.og.scenario.title'), body: t('core.og.scenario.body') });

// Public: no sign-in. The scenario runs in the visitor's browser and writes nothing.
export default function ScenarioPage() {
  return (
    <>
      <SiteHeader compact />
      <SiteMain>
        <DecisionDemo />
        <section id="scenario-complet" aria-labelledby="scenario-complet-titre" className="flex scroll-mt-4 flex-col gap-5">
          <h2 id="scenario-complet-titre" className="text-2xl font-semibold text-ink">{t('core.decisionDemo.fullTitle')}</h2>
          <ScenarioPlayer />
          <details>
            <summary className="flex min-h-12 cursor-pointer items-center font-medium text-brand">{t('core.compare.title')}</summary>
            <CompareCases />
          </details>
        </section>
        <details id="espaces-demo" className="scroll-mt-4 border-t border-line pt-3">
          <summary className="min-h-12 cursor-pointer content-center font-medium text-brand">{t('core.redesign.demoRoles')}</summary>
          <p className="my-3 text-ink-muted">{t('core.home.rolesNote')}</p>
          <RolePicker />
        </details>
      </SiteMain>
      <SiteFooter />
    </>
  );
}
