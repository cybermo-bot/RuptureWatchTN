'use client';

import Link from 'next/link';
import { useEffect, useId, useMemo, useState } from 'react';
import { Input } from '@/components/Input';
import { Ltr } from '@/components/public/Ltr';
import { translator, type Locale } from '@/lib/i18n';

// Library search: the same catalogue search as the rest of the app (/api/medicines/search,
// fuzzy on brand and molecule). Every result leads to the molecule's French status page, and
// nowhere else (CLAUDE.md rule 12).

interface MoleculeHit {
  id: string;
  name: string;
}

interface MedicineHit {
  id: string;
  brand: string;
  molecule_id: string;
  molecule_name: string;
}

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'done'; q: string; molecules: MoleculeHit[]; medicines: MedicineHit[] }
  | { kind: 'error' };

function ResultLink({ href, title, line }: { href: string; title: string; line: string }) {
  return (
    <li>
      <Link href={href} className="flex min-h-14 flex-col justify-center gap-0.5 py-3 no-underline hover:bg-surface-subtle">
        <Ltr className="font-medium text-ink">{title}</Ltr>
        <span className="text-sm text-brand">{line}</span>
      </Link>
    </li>
  );
}

export function LibrarySearch({ locale }: { locale: Locale }) {
  const t = useMemo(() => translator(locale), [locale]);
  const [q, setQ] = useState('');
  const [state, setState] = useState<State>({ kind: 'idle' });
  const headingId = useId();

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
        setState({ kind: 'done', q: query, molecules: body.molecules, medicines: body.results });
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
  const done = state.kind === 'done' && query.length >= 2 ? state : null;

  return (
    <div className="flex flex-col gap-4">
      <Input
        label={t('library.page.searchLabel')}
        type="search"
        inputMode="search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        placeholder={t('library.page.searchPlaceholder')}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        hint={query.length === 1 ? t('library.page.tooShort') : undefined}
      />
      <div aria-live="polite" aria-busy={state.kind === 'loading'}>
        {state.kind === 'error' ? <p className="text-ink">{t('library.page.error')}</p> : null}
        {done && done.molecules.length === 0 && done.medicines.length === 0 ? (
          <p className="text-ink-muted">{t('library.page.noResult', { q: done.q })}</p>
        ) : null}
        {done && (done.molecules.length > 0 || done.medicines.length > 0) ? (
          <div className="flex flex-col gap-5">
            {done.molecules.length > 0 ? (
              <section aria-labelledby={`${headingId}-mol`}>
                <h2 id={`${headingId}-mol`} className="pb-1 text-sm font-medium text-ink-muted">
                  {t('library.page.moleculesHeading')}
                </h2>
                <ul className="hairline-list border-y border-line">
                  {done.molecules.map((m) => (
                    <ResultLink key={m.id} href={`/bibliotheque/${m.id}`} title={m.name} line={t('library.page.moleculeMeta')} />
                  ))}
                </ul>
              </section>
            ) : null}
            {done.medicines.length > 0 ? (
              <section aria-labelledby={`${headingId}-med`}>
                <h2 id={`${headingId}-med`} className="pb-1 text-sm font-medium text-ink-muted">
                  {t('library.page.medicinesHeading')}
                </h2>
                <ul className="hairline-list border-y border-line">
                  {done.medicines.map((m) => (
                    <ResultLink
                      key={m.id}
                      href={`/bibliotheque/${m.molecule_id}`}
                      title={m.brand}
                      line={t('library.page.medicineMeta', { molecule: m.molecule_name })}
                    />
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
