'use client';

import { Search, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { LevelBadge } from '@/components/LevelBadge';
import { localHits, mergeHits, type QuickHit, type SpaceLevel } from '@/lib/console/quick-search';
import { t } from '@/lib/i18n';

// Ctrl+K (or Cmd+K) in the consoles, and a button for touch screens: type a brand or a molecule,
// open its panel. The catalogue search is the public one (/api/medicines/search, pg_trgm); the
// levels are the ones this page already shows. A medicine without a level here is listed, not
// linked: the panel would show another medicine.

type State = 'idle' | 'searching' | 'done' | 'error';

export function QuickSearch({ levels, basePath }: { levels: SpaceLevel[]; basePath: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const inputId = useId();
  const [q, setQ] = useState('');
  const [remote, setRemote] = useState<{ q: string; hits: QuickHit[] } | null>(null);
  const [failedFor, setFailedFor] = useState<string | null>(null);

  const local = localHits(levels, q);
  const query = q.trim();
  const hits = remote && remote.q === query ? remote.hits : local;
  const state: State = query.length < 2 ? 'idle' : failedFor === query ? 'error' : remote?.q === query ? 'done' : 'searching';

  const open = () => {
    dialog.current?.showModal();
    input.current?.focus();
  };
  const href = (id: string) => `${basePath}?m=${id}#detail`;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (dialog.current?.open) dialog.current.close();
        else open();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (query.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/medicines/search?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        if (!res.ok) throw new Error(String(res.status));
        const body = (await res.json()) as {
          molecules?: { id: string; name: string }[];
          results?: { molecule_id: string; molecule_name: string; brand: string }[];
        };
        setRemote({ q: query, hits: mergeHits(localHits(levels, query), body.molecules ?? [], body.results ?? [], levels) });
        setFailedFor(null);
      } catch {
        if (!controller.signal.aborted) setFailedFor(query);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, levels]);

  const status =
    state === 'idle'
      ? t('core.quickSearch.hint')
      : state === 'error'
        ? t('core.quickSearch.error')
        : hits.length === 0
          ? state === 'searching'
            ? t('core.quickSearch.searching')
            : t('core.quickSearch.none')
          : t('core.quickSearch.count', { n: hits.length });

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-line bg-surface px-3 text-sm text-ink hover:bg-surface-subtle"
      >
        <Search size={16} aria-hidden="true" />
        {t('core.quickSearch.open')}
        <kbd className="hidden rounded-sm border border-line px-1.5 font-mono text-xs text-ink-muted sm:inline">{t('core.quickSearch.shortcut')}</kbd>
      </button>

      <dialog
        ref={dialog}
        aria-labelledby={`${inputId}-title`}
        onClose={() => setQ('')}
        className="mx-auto mt-[10vh] w-[min(36rem,calc(100%-2rem))] rounded-md border border-line bg-surface p-0 text-ink backdrop:bg-ink/40"
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 id={`${inputId}-title`} className="text-base font-semibold">
            {t('core.quickSearch.title')}
          </h2>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-sm px-2 text-sm text-ink-muted hover:bg-surface-subtle"
          >
            <X size={16} aria-hidden="true" />
            {t('core.quickSearch.close')}
          </button>
        </div>
        <form
          className="flex flex-col gap-2 px-4 pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            const first = hits.find((h) => h.level !== null);
            if (first) {
              dialog.current?.close();
              router.push(href(first.id));
            }
          }}
        >
          <label htmlFor={inputId} className="text-sm font-medium">
            {t('core.quickSearch.label')}
          </label>
          <input
            ref={input}
            id={inputId}
            type="search"
            autoComplete="off"
            spellCheck={false}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="min-h-12 rounded-sm border border-ink-muted px-3 text-base"
          />
          <p role="status" className="text-sm text-ink-muted">
            {status}
          </p>
        </form>
        {hits.length > 0 ? (
          <ul className="hairline-list mt-2 max-h-[50vh] overflow-y-auto border-t border-line">
            {hits.map((h) =>
              h.level ? (
                <li key={h.id}>
                  <Link
                    href={href(h.id)}
                    onClick={() => dialog.current?.close()}
                    className="flex min-h-12 flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-2.5 no-underline hover:bg-surface-subtle"
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="font-medium break-words text-ink">{h.name}</span>
                      {h.brand ? <span className="text-xs text-ink-muted">{t('core.quickSearch.viaBrand', { brand: h.brand })}</span> : null}
                    </span>
                    <LevelBadge level={h.level} />
                  </Link>
                </li>
              ) : (
                <li key={h.id} className="flex min-h-12 flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-2.5">
                  <span className="flex min-w-0 flex-col">
                    <span className="break-words text-ink">{h.name}</span>
                    {h.brand ? <span className="text-xs text-ink-muted">{t('core.quickSearch.viaBrand', { brand: h.brand })}</span> : null}
                  </span>
                  <span className="text-sm text-ink-muted">{t('core.quickSearch.noLevel')}</span>
                </li>
              ),
            )}
          </ul>
        ) : (
          <div className="h-4" />
        )}
      </dialog>
    </>
  );
}
