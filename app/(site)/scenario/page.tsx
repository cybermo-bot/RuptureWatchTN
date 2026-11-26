import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { RolePicker } from '@/components/RolePicker';
import { CompareCases } from '@/components/scenario/CompareCases';
import { DecisionDemo } from '@/components/scenario/DecisionDemo';
import { ScenarioPlayer } from '@/components/scenario/ScenarioPlayer';
import { SiteFooter, SiteHeader, SiteMain } from '@/components/SiteChrome';
import { DEMO_SHORTAGE_MOLECULE } from '@/lib/demo/showcase';
import { isPilot } from '@/lib/env';
import { t } from '@/lib/i18n';
import { sharedPageMetadata } from '@/lib/og/meta';

export const metadata: Metadata = sharedPageMetadata(t('core.scenario.title'), { title: t('core.og.scenario.title'), body: t('core.og.scenario.body') });

// Public: no sign-in. The scenario runs in the visitor's browser and writes nothing.
export default function ScenarioPage() {
  // The pilot site has no demo roles and no scenario (pilot-2 item 1).
  if (isPilot()) notFound();
  return (
    <>
      <SiteHeader compact />
      <SiteMain>
        <DecisionDemo />
        <section id="scenario-complet" aria-labelledby="scenario-complet-titre" className="flex scroll-mt-4 flex-col gap-5">
          <h2 id="scenario-complet-titre" className="text-2xl font-semibold text-ink">{t('core.decisionDemo.fullTitle')}</h2>
          {/* The fictional medicine and the showcase one follow the same rules (pilot-1 item 7). */}
          <p className="max-w-prose text-ink-muted">{t('core.scenario.showcaseLine', { molecule: DEMO_SHORTAGE_MOLECULE })}</p>
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
