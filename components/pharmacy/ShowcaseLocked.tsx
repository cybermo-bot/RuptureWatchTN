import { Play } from 'lucide-react';
import { ButtonLink } from '@/components/Button';
import { HINT_MOLECULE } from '@/lib/demo/hints';
import { t } from '@/lib/i18n';

// In place of the report buttons, for a one-click demo pharmacy on a showcase medicine
// (lib/demo/showcase.ts, pilot-1 item 3): why it cannot be reported, what to report instead, and
// the scenario, which shows a level reaching « Confirmée » without writing anything.
export function ShowcaseLocked() {
  return (
    <div data-showcase-locked className="flex flex-col gap-3 border-s-2 border-ink ps-4">
      <p className="max-w-prose text-ink">
        {t('core.showcase.locked')} {t('core.showcase.tryOther', { molecule: HINT_MOLECULE })}
      </p>
      <p className="max-w-prose text-sm text-ink-muted">{t('core.showcase.scenario')}</p>
      <ButtonLink href="/scenario" variant="secondary" className="sm:self-start">
        <Play size={16} aria-hidden="true" />
        {t('core.showcase.scenarioLink')}
      </ButtonLink>
    </div>
  );
}
