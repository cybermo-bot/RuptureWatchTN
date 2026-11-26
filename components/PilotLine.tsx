import { FlaskConical } from 'lucide-react';

/**
 * The thin line at the top of every page of the pilot site (pilot-2 item 1): the reports there
 * are real, from tester pharmacies. Shown only when NEXT_PUBLIC_APP_MODE is `pilot`.
 */
export function PilotLine({ text }: { text: string }) {
  return (
    <p data-pilot-line className="flex items-center justify-center gap-2 bg-stage px-4 py-2 text-center text-sm font-medium text-on-stage print:hidden">
      <FlaskConical size={16} aria-hidden="true" className="shrink-0 text-scenario-accent" />
      <span>{text}</span>
    </p>
  );
}
