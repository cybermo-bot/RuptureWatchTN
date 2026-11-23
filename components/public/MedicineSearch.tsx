'use client';

import { ChevronRight, Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useId, useState } from 'react';
import { Input } from '@/components/Input';
import { translator, type Locale } from '@/lib/i18n';
import { Ltr } from './Ltr';

// The public search: brand or molecule, half words and typos (pg_trgm in the database).
// A molecule comes first, then its brands; every row leads to the molecule's status page.
// When the catalogue has nothing but the DPM list knows the name, says so plainly.

interface MoleculeHit {
  id: string;
  name: string;
  medicines: number;
}

interface MedicineHit {
  id: string;
  label: string;
  brand: string;
  molecule_id: string;
  molecule_name: string;
}

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | {
      kind: 'done';
      q: string;
      molecules: MoleculeHit[];
      results: MedicineHit[];
      dpm: boolean;
    }
  | { kind: 'error' };

function ResultRow({ href, title, lines }: { href: string; title: string; lines: string[] }) {
  return (
    <li>
      <Link href={href} className="flex min-h-14 items-center justify-between gap-4 px-4 py-3 no-underline hover:bg-surface-subtle">
        <span className="flex min-w-0 flex-col gap-0.5">
          <Ltr className="self-start font-medium break-words text-ink">{title}</Ltr>
          {lines.map((line) => (
            <span key={line} className="text-sm break-words text-ink-muted">
              {line}
            </span>
          ))}
        </span>
        <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-ink-muted rtl:-scale-x-100" />
      </Link>
    </li>
  );
}

export function MedicineSearch({ locale }: { locale: Locale }) {
  const t = translator(locale);
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
        const body = (await res.json()) as {
          molecules: MoleculeHit[];
          results: MedicineHit[];
          dpm?: boolean;
        };
        setState({
          kind: 'done',
          q: query,
          molecules: body.molecules,
          results: body.results,
          dpm: body.dpm === true,
        });
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
        label={t('public.medicines.searchLabel')}
        large
        icon={<Search size={20} />}
        type="search"
        inputMode="search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        placeholder={t('public.medicines.searchPlaceholder')}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        hint={tooShort ? t('public.medicines.tooShort') : t('public.medicines.source')}
      />
      <div aria-live="polite" aria-busy={state.kind === 'loading'}>
        {state.kind === 'loading' && query.length >= 2 ? <p className="text-sm text-ink-muted">{t('public.medicines.loading')}</p> : null}
        {state.kind === 'error' ? <p className="text-ink">{t('public.medicines.error')}</p> : null}
        {state.kind === 'done' && query.length >= 2 ? (
          state.molecules.length === 0 && state.results.length === 0 ? (
            state.dpm ? (
              <div className="panel flex flex-col gap-1 p-4">
                <p className="font-medium text-ink">{t('public.dpm.searchTitle')}</p>
                <p className="text-ink">{t('public.dpm.notFollowed')}</p>
              </div>
            ) : (
              <div className="panel flex flex-col gap-1 p-4">
                <p className="text-ink">{t('public.medicines.none', { q: state.q })}</p>
                <p className="text-sm text-ink-muted">{t('public.medicines.noneHint')}</p>
              </div>
            )
          ) : (
            <div className="flex flex-col gap-5" role="region" aria-label={t('public.medicines.resultsLabel')}>
              {state.molecules.length > 0 ? (
                <section aria-labelledby={`${headingId}-mol`}>
                  <h2 id={`${headingId}-mol`} className="pb-1.5 text-sm font-medium text-ink-muted">
                    {t('public.medicines.moleculesTitle')}
                  </h2>
                  <ul className="panel hairline-list overflow-hidden">
                    {state.molecules.map((m) => (
                      <ResultRow
                        key={m.id}
                        href={`/medicaments/${m.id}`}
                        title={m.name}
                        lines={[
                          m.medicines === 1
                            ? t('public.medicines.presentationsOne')
                            : t('public.medicines.presentations', {
                                n: m.medicines,
                              }),
                        ]}
                      />
                    ))}
                  </ul>
                </section>
              ) : null}
              {state.results.length > 0 ? (
                <section aria-labelledby={`${headingId}-med`}>
                  <h2 id={`${headingId}-med`} className="pb-1.5 text-sm font-medium text-ink-muted">
                    {t('public.medicines.brandsTitle')}
                  </h2>
                  <ul className="panel hairline-list overflow-hidden">
                    {state.results.map((m) => (
                      <ResultRow key={m.id} href={`/medicaments/${m.molecule_id}`} title={m.brand} lines={[m.label, m.molecule_name]} />
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
