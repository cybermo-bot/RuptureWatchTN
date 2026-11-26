'use client';

import { ArrowUpLeft, ChevronRight, Search } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useState } from 'react';
import { Input } from '@/components/Input';
import { FormPicture } from '@/components/medicine/FormPicture';
import { translator, type Locale } from '@/lib/i18n';
import { presentationText } from '@/lib/public/presentation';
import { Ltr } from './Ltr';

// Examples from the CNAM catalogue show what to type.
const EXAMPLES = ['Amlor', 'Efferalgan', 'Levetiracetam'];

interface SearchResults {
  molecules: { id: string; name: string; medicines: number }[];
  results: { id: string; label: string; brand: string; molecule_id: string; molecule_name: string }[];
  dpm?: boolean;
}

type State = { query: string; data: SearchResults | null };

function ResultRow({ href, title, description, medicine, locale }: {
  href: string;
  title: string;
  description: string;
  medicine?: SearchResults['results'][number];
  locale: Locale;
}) {
  return (
    <li>
      <Link href={href} prefetch={false} className="flex min-h-14 items-center gap-3 rounded-sm px-2 py-2.5 no-underline hover:bg-surface-subtle sm:px-3">
        <FormPicture label={medicine?.label} brand={medicine?.brand} locale={locale} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Ltr className="self-start font-semibold break-words text-ink">{title}</Ltr>
          {medicine ? (
            <>
              <Ltr className="self-start text-sm break-words text-ink-muted">{description}</Ltr>
              <Ltr className="self-start text-sm break-words text-ink-muted">{medicine.molecule_name}</Ltr>
            </>
          ) : <span className="text-sm text-ink-muted">{description}</span>}
        </span>
        <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-ink-muted rtl:-scale-x-100" />
      </Link>
    </li>
  );
}

/** linkPrefix is the destination before the molecule id, for public and professional lookup. */
export function MedicineSearch({ locale, linkPrefix = '/medicaments/', label, autoFocus = false, title }: {
  locale: Locale;
  linkPrefix?: string;
  label?: string;
  autoFocus?: boolean;
  title?: string;
}) {
  const t = translator(locale);
  const pathname = usePathname();
  const [q, setQ] = useState('');
  const [state, setState] = useState<State | null>(null);
  const [attempt, setAttempt] = useState(0);
  const id = useId();
  const inputId = id + '-search';
  const query = q.trim();
  const result = query.length >= 2 && state?.query === query ? state : null;
  const loading = query.length >= 2 && result === null;

  useEffect(() => {
    if (query.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/medicines/search?q=' + encodeURIComponent(query), { signal: controller.signal });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as SearchResults;
        if (!controller.signal.aborted) setState({ query, data });
      } catch {
        if (!controller.signal.aborted) setState({ query, data: null });
      }
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, attempt]);

  function changeQuery(value: string) {
    if (value.trim() !== query) setState(null);
    setQ(value);
  }

  const data = result?.data;
  const hasResults = !!data && (data.molecules.length > 0 || data.results.length > 0);

  return (
    <div className="flex flex-col gap-5">
      <div className={title ? 'flex flex-col gap-4 rounded-md bg-surface-subtle p-5 sm:gap-6 sm:p-8' : undefined}>
        {title ? (
          <header className="flex flex-col gap-1.5">
            <h1 className="text-3xl leading-tight font-semibold tracking-tight text-ink sm:text-4xl">{title}</h1>
            <p className="text-ink-muted">{t('public.medicines.intro')}</p>
          </header>
        ) : null}
        <Input
          id={inputId}
          label={label ?? t('public.medicines.searchLabel')}
          large
          icon={<Search size={20} />}
          type="search"
          autoFocus={autoFocus}
          inputMode="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder={t('public.medicines.searchPlaceholder')}
          value={q}
          onChange={(event) => changeQuery(event.target.value)}
          hint={query.length === 1 ? t('public.medicines.tooShort') : t('public.medicines.source')}
        />
      </div>
      {title && query.length === 0 ? (
        <section aria-labelledby={id + '-examples'} className="flex flex-col gap-2">
          <h2 id={id + '-examples'} className="text-sm font-medium text-ink-muted">{t('public.medicines.examples')}</h2>
          <ul className="flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <li key={example}>
                <button type="button" onClick={() => {
                  changeQuery(example);
                  document.getElementById(inputId)?.focus();
                }} className="inline-flex min-h-12 items-center gap-2 rounded-sm border border-line px-3 font-medium text-brand hover:border-brand hover:bg-surface-subtle">
                  <Ltr>{example}</Ltr>
                  <ArrowUpLeft size={15} aria-hidden="true" className="rtl:-scale-x-100" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <p role="status" className={loading ? 'text-sm text-ink-muted' : 'sr-only'}>
        {loading ? t('public.medicines.loading') : hasResults ? t('public.medicines.resultsLabel') : ''}
      </p>
      {result && !data ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <p role="alert" className="text-ink">{t('public.medicines.error')}</p>
          <button type="button" className="min-h-12 font-medium text-brand underline" onClick={() => {
            document.getElementById(inputId)?.focus();
            setState(null);
            setAttempt((previous) => previous + 1);
          }}>{t('public.medicines.retry')}</button>
        </div>
      ) : null}
      {data && !hasResults ? (
        <div className="flex flex-col gap-1" role="status">
          <p className="font-medium text-ink">{data.dpm ? t('public.dpm.searchTitle') : t('public.medicines.none', { q: query })}</p>
          <p className="text-sm text-ink-muted">{data.dpm ? t('public.dpm.notFollowed') : t('public.medicines.noneHint')}</p>
          {/* A product outside the CNAM list (pilot-2 item 5): say so, and let the visitor tell us. */}
          {data.dpm ? null : (
            <>
              <p className="text-sm text-ink-muted">{t('public.medicines.notInList')}</p>
              <Link href={`/avis?depuis=${encodeURIComponent(pathname)}`} className="inline-flex min-h-12 items-center self-start text-sm text-brand underline">
                {t('public.medicines.tellUs')}
              </Link>
            </>
          )}
        </div>
      ) : null}
      {data && hasResults ? (
        <div className="flex flex-col gap-5" role="region" aria-label={t('public.medicines.resultsLabel')}>
          {data.molecules.length > 0 ? (
            <section aria-labelledby={id + '-molecules'}>
              <h2 id={id + '-molecules'} className="pb-2 font-semibold text-ink">{t('public.medicines.moleculesTitle')}</h2>
              <ul className="hairline-list border-t border-line">
                {data.molecules.map((m) => (
                  <ResultRow key={m.id} locale={locale} href={linkPrefix + m.id} title={m.name} description={m.medicines === 1
                    ? t('public.medicines.presentationsOne')
                    : t('public.medicines.presentations', { n: m.medicines })} />
                ))}
              </ul>
            </section>
          ) : null}
          {data.results.length > 0 ? (
            <section aria-labelledby={id + '-brands'}>
              <h2 id={id + '-brands'} className="pb-2 font-semibold text-ink">{t('public.medicines.brandsTitle')}</h2>
              <ul className="hairline-list border-t border-line">
                {data.results.map((m) => {
                  const fullLabel = presentationText(m, t);
                  const description = fullLabel.toUpperCase().startsWith(`${m.brand.toUpperCase()} `)
                    ? fullLabel.slice(m.brand.length).trimStart()
                    : fullLabel;
                  const path = linkPrefix + m.molecule_id;
                  return <ResultRow key={m.id} locale={locale} href={linkPrefix === '/medicaments/' ? `${path}?presentation=${m.id}` : path} title={m.brand} description={description} medicine={m} />;
                })}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
