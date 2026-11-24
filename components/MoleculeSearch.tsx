'use client';

import { Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useId, useState } from 'react';
import { followMolecule } from '@/app/actions/pharmacy';
import { Input } from '@/components/Input';
import { FormPicture } from '@/components/medicine/FormPicture';
import { t } from '@/lib/i18n';

// Catalogue search for the pharmacy. A DCI leads to its molecule first, then the brands.
// "follow" mode follows the molecule of what was found; "report" mode opens tap two for it.

interface MoleculeHit {
  id: string;
  name: string;
  medicines: number;
}

interface MedicineHit {
  id: string;
  label: string;
  brand: string;
  dci: string;
  molecule_id: string;
  molecule_name: string;
}

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'done'; q: string; molecules: MoleculeHit[]; results: MedicineHit[] }
  | { kind: 'error' };

function FollowAction({ moleculeId, followed }: { moleculeId: string; followed: boolean }) {
  if (followed) {
    return <span className="shrink-0 px-3 text-sm font-medium text-ink-muted">{t('core.follow.following')}</span>;
  }
  return (
    <form action={followMolecule} className="shrink-0">
      <input type="hidden" name="molecule_id" value={moleculeId} />
      <button
        type="submit"
        className="min-h-12 rounded-md border border-brand px-4 text-sm font-medium text-brand hover:bg-surface-subtle"
      >
        {t('core.follow.follow')}
      </button>
    </form>
  );
}

function Row({
  mode,
  moleculeId,
  followed,
  title,
  lines,
  label,
}: {
  mode: 'follow' | 'report';
  moleculeId: string;
  followed: boolean;
  title: string;
  lines: string[];
  label?: string;
}) {
  const text = (
    <div className="flex min-w-0 items-center gap-3">
      <FormPicture label={label} brand={label ? title : undefined} />
      <div className="flex min-w-0 flex-col gap-0.5 break-words">
      <span className="font-medium text-ink">{title}</span>
      {lines.map((line) => (
        <span key={line} className="text-sm text-ink-muted">
          {line}
        </span>
      ))}
      </div>
    </div>
  );
  if (mode === 'report') {
    return (
      <li>
        <Link
          href={`/pharmacie/signaler/${moleculeId}`}
          className="flex min-h-14 items-center justify-between gap-4 px-4 py-3 no-underline hover:bg-surface-subtle"
        >
          {text}
          <span className="shrink-0 text-sm font-medium text-brand">{t('core.follow.choose')}</span>
        </Link>
      </li>
    );
  }
  return (
    <li className="flex min-h-14 items-center justify-between gap-4 px-4 py-3">
      {text}
      <FollowAction moleculeId={moleculeId} followed={followed} />
    </li>
  );
}

export function MoleculeSearch({ mode, followedIds = [] }: { mode: 'follow' | 'report'; followedIds?: string[] }) {
  const [q, setQ] = useState('');
  const [state, setState] = useState<State>({ kind: 'idle' });
  const headingId = useId();
  const followed = new Set(followedIds);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setState({ kind: 'loading' });
      try {
        const res = await fetch(`/api/medicines/search?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        if (!res.ok) throw new Error(String(res.status));
        const body = (await res.json()) as { molecules: MoleculeHit[]; results: MedicineHit[] };
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

  const query = q.trim();
  const tooShort = query.length > 0 && query.length < 2;

  return (
    <div className="flex flex-col gap-4">
      <Input
        label={t('core.follow.searchLabel')}
        large
        icon={<Search size={20} />}
        type="search"
        inputMode="search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        placeholder={t('core.follow.searchPlaceholder')}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        hint={tooShort ? t('core.follow.tooShort') : undefined}
      />
      <div aria-live="polite" aria-busy={state.kind === 'loading'}>
        {state.kind === 'error' ? <p className="text-ink">{t('core.follow.error')}</p> : null}
        {state.kind === 'done' && query.length >= 2 ? (
          state.molecules.length === 0 && state.results.length === 0 ? (
            <p className="text-ink-muted">{t('core.follow.noResult', { q: state.q })}</p>
          ) : (
            <div className="flex flex-col gap-5">
              {state.molecules.length > 0 ? (
                <section aria-labelledby={`${headingId}-mol`}>
                  <h3 id={`${headingId}-mol`} className="pb-1 text-sm font-medium text-ink-muted">
                    {t('core.follow.moleculesHeading')}
                  </h3>
                  <ul className="panel hairline-list overflow-hidden">
                    {state.molecules.map((m) => (
                      <Row
                        key={m.id}
                        mode={mode}
                        moleculeId={m.id}
                        followed={followed.has(m.id)}
                        title={m.name}
                        lines={[t('core.follow.moleculeMeta', { count: m.medicines })]}
                      />
                    ))}
                  </ul>
                </section>
              ) : null}
              {state.results.length > 0 ? (
                <section aria-labelledby={`${headingId}-med`}>
                  <h3 id={`${headingId}-med`} className="pb-1 text-sm font-medium text-ink-muted">
                    {t('core.follow.medicinesHeading')}
                  </h3>
                  <ul className="panel hairline-list overflow-hidden">
                    {state.results.map((m) => (
                      <Row
                        key={m.id}
                        mode={mode}
                        moleculeId={m.molecule_id}
                        followed={followed.has(m.molecule_id)}
                        title={m.brand}
                        label={m.label}
                        lines={[m.label, t('core.follow.medicineMeta', { dci: m.dci })]}
                      />
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}
