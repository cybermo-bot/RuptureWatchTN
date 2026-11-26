import { TriangleAlert } from 'lucide-react';

// Above a public status that rests on demonstration data (lib/public/share.ts simulatedBanner):
// « Démonstration : ce niveau vient de données simulées… ». The strongest band the design has,
// the petrol of the scenario, so a screenshot of a simulated « Rupture confirmée » cannot be
// mistaken for the real situation of the medicine. Server component; the caller passes the text
// in the visitor's language.
export function SimulatedBanner({ text }: { text: string }) {
  return (
    <p role="note" data-simulated-banner className="flex items-start gap-3 rounded-md bg-stage px-4 py-4 font-semibold text-on-stage sm:px-5">
      <TriangleAlert size={20} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0 text-scenario-accent" />
      <span>{text}</span>
    </p>
  );
}
