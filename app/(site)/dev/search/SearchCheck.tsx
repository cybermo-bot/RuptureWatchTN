'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/Input';
import { t } from '@/lib/i18n';

interface Hit {
  id: string;
  code_pct: string;
  label: string;
  brand: string;
  molecule_name: string;
  vei_category: string | null;
  score: number;
}

interface MoleculeHit {
  id: string;
  name: string;
  medicines: number;
  score: number;
}

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'done'; q: string; molecules: MoleculeHit[]; results: Hit[] }
  | { kind: 'error' };

export function SearchCheck() {
  const [q, setQ] = useState('');
  const [state, setState] = useState<State>({ kind: 'idle' });

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setState({ kind: 'loading' });
      try {
        const res = await fetch(`/api/medicines/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(String(res.status));
        const body = (await res.json()) as { molecules: MoleculeHit[]; results: Hit[] };
        setState({ kind: 'done', q: query, molecules: body.molecules, results: body.results });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') setState({ kind: 'error' });
      }
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q]);

  const tooShort = q.trim().length > 0 && q.trim().length < 2;

  return (
    <div className="flex flex-col gap-6">
      <Input
        label={t('core.search.label')}
        type="search"
        inputMode="search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        placeholder={t('core.search.placeholder')}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        hint={tooShort ? t('core.search.tooShort') : undefined}
      />

      <div aria-live="polite" aria-busy={state.kind === 'loading'}>
        {state.kind === 'error' ? <p className="text-ink">{t('core.search.error')}</p> : null}
        {state.kind === 'done' && q.trim().length >= 2 ? (
          state.results.length === 0 && state.molecules.length === 0 ? (
            <p className="text-ink-muted">{t('core.search.noResult', { q: state.q })}</p>
          ) : (
            <>
              <p className="sr-only">{t('core.search.results', { count: state.molecules.length + state.results.length })}</p>
              {state.molecules.length > 0 ? (
                <>
                  <h2 className="pb-2 text-sm font-medium text-ink-muted">{t('core.search.moleculesHeading')}</h2>
                  <ul className="hairline-list mb-6 border-y border-line">
                    {state.molecules.map((m) => (
                      <li key={m.id} className="flex items-start justify-between gap-4 py-3">
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span className="font-medium text-ink">{m.name}</span>
                          <span className="text-sm text-ink-muted">{t('core.search.moleculeMeta', { count: m.medicines })}</span>
                        </div>
                        <span className="shrink-0 text-end font-mono text-xs text-ink-muted">
                          {t('core.search.score')} {m.score.toFixed(2)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <h2 className="pb-2 text-sm font-medium text-ink-muted">{t('core.search.medicinesHeading')}</h2>
                </>
              ) : null}
              <ul className="hairline-list border-y border-line">
                {state.results.map((hit) => (
                  <li key={hit.id} className="flex items-start justify-between gap-4 py-3">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="font-medium text-ink">{hit.brand}</span>
                      <span className="text-sm text-ink">{hit.molecule_name}</span>
                      <span className="text-sm text-ink-muted">{hit.label}</span>
                    </div>
                    <span className="shrink-0 text-end font-mono text-xs text-ink-muted">
                      {hit.code_pct}
                      {hit.vei_category ? ` · ${hit.vei_category}` : ''}
                      <br />
                      {t('core.search.score')} {hit.score.toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )
        ) : null}
      </div>
    </div>
  );
}
