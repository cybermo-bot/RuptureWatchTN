import type { ReactNode } from 'react';
import { LevelShape } from '@/components/LevelBadge';
import type { Level } from '@/lib/signal';

// Level history (rw-design-system): dated rows joined by a line, each dot holding the level's
// shape. The title says the level in words, so colour never carries it alone.
export interface JournalEntry {
  key: string;
  date: ReactNode;
  /** Machine-readable date for <time>. */
  dateTime?: string;
  level: Level;
  title: ReactNode;
  body?: ReactNode;
}

export function Journal({ entries, label }: { entries: JournalEntry[]; label: string }) {
  return (
    <ol aria-label={label} className="flex flex-col">
      {entries.map((entry, i) => (
        <li key={entry.key} className="relative flex gap-3 pb-5 last:pb-0">
          {i < entries.length - 1 ? <span aria-hidden="true" className="absolute start-3 top-7 bottom-0 w-px -translate-x-1/2 bg-line rtl:translate-x-1/2" /> : null}
          <span aria-hidden="true" className="relative flex size-6 shrink-0 items-center justify-center rounded-full border border-line bg-surface">
            <LevelShape level={entry.level} size={12} />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <time dateTime={entry.dateTime} className="eyebrow text-ink-muted">
              {entry.date}
            </time>
            <p className="font-medium break-words text-ink">{entry.title}</p>
            {entry.body ? <div className="text-sm text-ink-muted">{entry.body}</div> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
