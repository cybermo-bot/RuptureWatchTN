import { ChevronDown } from 'lucide-react';
import { FormPicture } from '@/components/medicine/FormPicture';
import { t } from '@/lib/i18n';
import { presentationText } from '@/lib/public/presentation';

// Pilot-3 item 1: « Quelle présentation ? » above the delay buttons, inside the same form, so
// the report still leaves in two taps: the choice is preselected (the last product this pharmacy
// reported for this molecule, or « Plusieurs ou je ne sais pas »), and a delay button sends it.

export interface ReportPresentation {
  id: string;
  label: string;
  brand: string;
}

/** Past this many products, the rest fold under « Autres présentations », so the delay
 * buttons stay near the first screen at 360 px. */
const SHOWN = 3;

// Hairline rows, one line each; only the checked row is tinted (no hover tint, so a hovered
// row never reads as a second choice), and its radio says it too.
function Option({ value, checked, title, picture }: { value: string; checked: boolean; title: string; picture?: React.ReactNode }) {
  return (
    <li>
      <label className="flex min-h-12 cursor-pointer items-center gap-3 px-2 py-1 transition-colors duration-(--dur-instant) has-[:checked]:bg-surface-subtle has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-brand">
        <input type="radio" name="medicine_id" value={value} defaultChecked={checked} className="size-5 shrink-0 accent-brand focus-visible:outline-none" />
        {picture}
        <span className="min-w-0 break-words text-ink">{title}</span>
      </label>
    </li>
  );
}

export function PresentationChoice({ presentations, preselected }: { presentations: ReportPresentation[]; preselected: string | null }) {
  const chosen = presentations.some((p) => p.id === preselected) ? preselected : null;
  // The preselected product always stays in view; the others keep the catalogue order.
  const shown = presentations.length <= SHOWN + 1 ? presentations : presentations.filter((p, i) => i < SHOWN || p.id === chosen);
  const folded = presentations.filter((p) => !shown.includes(p));
  const option = (p: ReportPresentation) => (
    <Option
      key={p.id}
      value={p.id}
      checked={p.id === chosen}
      title={presentationText(p, t)}
      picture={<FormPicture label={p.label} brand={p.brand} className="size-10" />}
    />
  );

  return (
    <fieldset className="flex flex-col" data-presentations>
      <legend className="pb-2 text-base font-semibold text-ink">{t('core.report.presentation.title')}</legend>
      <ul className="hairline-list border-y border-line">
        <Option value="" checked={chosen === null} title={t('core.report.presentation.unknown')} />
        {shown.map(option)}
      </ul>
      {folded.length > 0 ? (
        <details className="group">
          <summary className="inline-flex min-h-12 cursor-pointer list-none items-center gap-1 text-sm font-medium text-brand underline [&::-webkit-details-marker]:hidden">
            {t('core.report.presentation.more', { n: folded.length })}
            <ChevronDown size={16} strokeWidth={1.75} aria-hidden="true" className="transition-transform duration-(--dur-fast) group-open:rotate-180" />
          </summary>
          <ul className="hairline-list border-b border-line">{folded.map(option)}</ul>
        </details>
      ) : null}
    </fieldset>
  );
}
