import { RefreshCw } from 'lucide-react';

// One line under a level: "Mis à jour il y a 4 min", the exact time in the tooltip and in the
// <time> element. The text comes from the caller's messages (lib/freshness.ts gives the unit).
export function FreshnessLine({ at, text, title, className = '' }: { at: string; text: string; title: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <RefreshCw size={16} aria-hidden="true" className="shrink-0" />
      <time dateTime={new Date(at).toISOString()} title={title}>
        {text}
      </time>
    </span>
  );
}
