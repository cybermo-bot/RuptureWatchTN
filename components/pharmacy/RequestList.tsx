'use client';

import { CircleCheck, Clock, EyeOff, MapPin, X } from 'lucide-react';
import { useState, useTransition } from 'react';
import { answerRequest, type Choice } from '@/app/(site)/(espace)/pharmacie/demandes/actions';
import { buttonClass } from '@/components/Button';
import { formatTime } from '@/lib/format';
import { t } from '@/lib/i18n';
import type { OpenRequest } from '@/lib/pharmacy/requests';

// The patients' requests with their three one-tap answers. The choice to show the pharmacy is
// made each time, for this answer only. An answered request stays on screen with what the
// patient now sees, even after the page refreshes without it.

const DONE: Record<Choice, 'core.requests.doneShow' | 'core.requests.doneAnonymous' | 'core.requests.doneNo'> = {
  show: 'core.requests.doneShow',
  anonymous: 'core.requests.doneAnonymous',
  no: 'core.requests.doneNo',
};

function timeLeft(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return t('core.requests.minutes', { m });
  return m === 0 ? t('core.requests.hours', { h }) : t('core.requests.hoursMinutes', { h, m });
}

function Answers({ request, onDone }: { request: OpenRequest; onDone: (choice: Choice) => void }) {
  const [pending, startTransition] = useTransition();
  const [chosen, setChosen] = useState<Choice | null>(null);
  const [error, setError] = useState<'expired' | 'already' | 'failed' | null>(null);

  const send = (choice: Choice) => {
    setChosen(choice);
    setError(null);
    startTransition(async () => {
      const result = await answerRequest(request.request_id, choice);
      if (result.ok) onDone(result.choice);
      else setError(result.error);
    });
  };

  const label = (choice: Choice, key: 'core.requests.showMe' | 'core.requests.anonymous' | 'core.requests.no') =>
    pending && chosen === choice ? t('core.requests.sending') : t(key);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => send('show')}
        className={buttonClass('primary', 'w-full justify-start text-start')}
      >
        <MapPin size={18} aria-hidden="true" />
        {label('show', 'core.requests.showMe')}
      </button>
      <p className="px-1 pb-1 text-sm text-ink-muted">{t('core.requests.showMeHint')}</p>
      <button
        type="button"
        disabled={pending}
        onClick={() => send('anonymous')}
        className={buttonClass('secondary', 'w-full justify-start text-start')}
      >
        <EyeOff size={18} aria-hidden="true" />
        {label('anonymous', 'core.requests.anonymous')}
      </button>
      <p className="px-1 pb-1 text-sm text-ink-muted">{t('core.requests.anonymousHint')}</p>
      <button
        type="button"
        disabled={pending}
        onClick={() => send('no')}
        className={buttonClass('secondary', 'w-full justify-start text-start')}
      >
        <X size={18} aria-hidden="true" />
        {label('no', 'core.requests.no')}
      </button>
      <div aria-live="polite">
        {error ? (
          <p className="text-ink">
            {error === 'expired'
              ? t('core.requests.expired')
              : error === 'already'
                ? t('core.requests.already')
                : t('core.requests.failed')}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function RequestList({ requests }: { requests: OpenRequest[] }) {
  const [answered, setAnswered] = useState<Record<string, { request: OpenRequest; choice: Choice }>>({});
  const open = new Set(requests.map((r) => r.request_id));
  const rows = [
    ...requests,
    ...Object.values(answered)
      .map((a) => a.request)
      .filter((r) => !open.has(r.request_id)),
  ].sort((a, b) => a.created_at.localeCompare(b.created_at));

  if (rows.length === 0) {
    return (
      <div className="panel px-5 py-8">
        <p className="font-medium text-ink">{t('core.requests.empty')}</p>
        <p className="pt-2 text-ink-muted">{t('core.requests.emptyBody')}</p>
      </div>
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-4">
        {rows.map((r) => {
          const done = answered[r.request_id];
          return (
            <li key={r.request_id} className="panel flex flex-col gap-4 p-4">
              <div className="flex flex-col gap-1">
                <p className="text-lg font-semibold break-words text-ink">{r.molecule_name}</p>
                {r.medicine_label ? (
                  <p className="text-sm text-ink-muted">
                    {t('core.requests.presentation', {
                      label: r.medicine_label,
                    })}
                  </p>
                ) : null}
                {r.delegation ? (
                  <p className="text-sm text-ink-muted">
                    {t('core.requests.delegation', {
                      delegation: r.delegation,
                    })}
                  </p>
                ) : null}
                <p className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
                  <Clock size={14} aria-hidden="true" />
                  <span>
                    {t('core.requests.asked', {
                      time: formatTime(r.created_at),
                    })}
                  </span>
                  {!done ? (
                    <span>
                      {t('core.requests.timeLeft', {
                        time: timeLeft(r.minutes_left),
                      })}
                    </span>
                  ) : null}
                </p>
              </div>
              {done ? (
                <p role="status" className="flex items-start gap-2 rounded-md border border-level-cleared px-3 py-3 text-ink">
                  <CircleCheck size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-level-cleared" />
                  {t(DONE[done.choice])}
                </p>
              ) : (
                <Answers
                  request={r}
                  onDone={(choice) =>
                    setAnswered((all) => ({
                      ...all,
                      [r.request_id]: { request: r, choice },
                    }))
                  }
                />
              )}
            </li>
          );
        })}
      </ul>
      {requests.length === 0 ? <p className="text-ink-muted">{t('core.requests.noOther')}</p> : null}
    </>
  );
}
