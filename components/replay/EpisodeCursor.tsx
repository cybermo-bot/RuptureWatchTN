'use client';

import { useId, useMemo, useState } from 'react';
import { explanationText } from '@/components/LevelExplanation';
import { LevelBadge } from '@/components/LevelBadge';
import { formatDate } from '@/lib/format';
import { t } from '@/lib/i18n';
import { DEFAULT_PARAMS, evaluate } from '@/lib/signal';
import { shownEvidence } from '@/lib/signals/shown';

// The time machine: a date cursor across one episode, and the level evaluate() would have given
// on that date from the foreign notice alone (no pharmacy report). By gate one, that is at most
// "sous surveillance". Runs in the browser, on the episode's dates only.

export interface CursorEpisode {
  key: string;
  label: string;
  moleculeDci: string;
  tnDate: string;
  endDate: string | null;
  foreign: { regulator: string; date: string; url: string } | null;
}

const DAY = 86_400_000;
const toMs = (d: string) => Date.parse(`${d}T12:00:00Z`);
const toIso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

function range(e: CursorEpisode): [number, number] {
  const dates = [e.tnDate, e.endDate, e.foreign?.date].filter((d): d is string => Boolean(d)).map(toMs);
  const from = Math.min(...dates) - 30 * DAY;
  const to = Math.max(...dates, toMs(e.tnDate) + DEFAULT_PARAMS.noticeActiveDays * DAY) + 15 * DAY;
  return [from, to];
}

export function EpisodeCursor({ episodes }: { episodes: CursorEpisode[] }) {
  const id = useId();
  const [key, setKey] = useState(episodes[0]?.key ?? '');
  const episode = episodes.find((e) => e.key === key) ?? episodes[0];
  const [from, to] = useMemo(() => (episode ? range(episode) : [0, 0]), [episode]);
  const startDay = episode?.foreign ? Math.round((toMs(episode.foreign.date) - from) / DAY) : 0;
  const [offset, setOffset] = useState<number | null>(null);
  const day = offset ?? startDay;

  if (!episode) return <p className="text-ink-muted">{t('core.replay.cursorNone')}</p>;

  const totalDays = Math.round((to - from) / DAY);
  const at = from + day * DAY;
  const date = toIso(at);
  const notices = episode.foreign
    ? [
        {
          id: `${episode.key}-notice`,
          moleculeId: episode.key,
          source: episode.foreign.regulator,
          status: 'shortage' as const,
          publishedAt: new Date(toMs(episode.foreign.date)),
          url: episode.foreign.url,
          origin: 'official_source' as const,
        },
      ]
    : [];
  const result = evaluate({ moleculeId: episode.key, reports: [], notices, now: new Date(at), params: DEFAULT_PARAMS });

  return (
    <div className="flex flex-col gap-5" data-level={result.level}>
      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-episode`} className="text-sm font-medium text-ink">
          {t('core.replay.cursorEpisode')}
        </label>
        <select
          id={`${id}-episode`}
          value={episode.key}
          onChange={(ev) => {
            setKey(ev.target.value);
            setOffset(null);
          }}
          className="min-h-12 max-w-full rounded-sm border border-line bg-surface px-3 text-ink"
        >
          {episodes.map((e) => (
            <option key={e.key} value={e.key}>
              {e.moleculeDci}
              {' · '}
              {e.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-date`} className="text-sm font-medium text-ink">
          {t('core.replay.cursorDate')}
          {' : '}
          <time dateTime={date} className="font-mono">
            {formatDate(date)}
          </time>
        </label>
        <input
          id={`${id}-date`}
          type="range"
          min={0}
          max={totalDays}
          step={1}
          value={day}
          onChange={(ev) => setOffset(Number(ev.target.value))}
          aria-valuetext={formatDate(date)}
          className="h-12 w-full accent-[var(--brand)]"
        />
      </div>
      <div className="flex flex-col gap-2 rounded-md bg-surface-subtle p-4" aria-live="polite">
        <p className="text-sm text-ink-muted">{t('core.replay.cursorLevel', { date: formatDate(date) })}</p>
        <LevelBadge level={result.level} className="text-base" />
        {episode.foreign ? (
          <p className="max-w-prose text-ink">{explanationText(result.rule, shownEvidence(result.evidence, ['official_source']))}</p>
        ) : (
          <p className="max-w-prose text-ink">{t('core.replay.cursorNoForeign')}</p>
        )}
        <p className="max-w-prose text-sm text-ink-muted">
          {date < episode.tnDate
            ? t('core.replay.cursorBeforeTn', { date: formatDate(episode.tnDate) })
            : t('core.replay.cursorAfterTn', { date: formatDate(episode.tnDate) })}
        </p>
      </div>
      <p className="max-w-prose text-sm text-ink">{t('core.replay.cursorGate')}</p>
    </div>
  );
}
