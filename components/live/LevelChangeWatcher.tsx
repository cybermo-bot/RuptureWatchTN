'use client';

import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { LevelShape } from '@/components/LevelBadge';
import { t } from '@/lib/i18n';
import type { Level } from '@/lib/signal';

// The live feel of the dashboards. The page re-renders when a signal changes (LiveRefresh);
// this compares the new levels with the previous ones and, for each change, makes the row
// ([data-pulse="<molecule id>"]) and the governorates on the map ([data-code]) pulse once,
// and shows a small toast saying what changed. With reduced motion there is no pulse, the
// toast still appears. Nothing is shown on the first render: only changes seen live.

export interface WatchedLevel {
  key: string;
  name: string;
  level: Level;
}

interface Toast {
  id: number;
  name: string;
  from: Level;
  to: Level;
}

function pulse(selector: string) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll<HTMLElement | SVGElement>(selector).forEach((el) => {
    el.classList.remove('rw-pulse');
    // Restart the animation if it is already running.
    void (el as HTMLElement).offsetWidth;
    el.classList.add('rw-pulse');
    el.addEventListener('animationend', () => el.classList.remove('rw-pulse'), { once: true });
  });
}

export function LevelChangeWatcher({ items, governorates = [] }: { items: WatchedLevel[]; governorates?: { code: string; text: string }[] }) {
  const previous = useRef<Map<string, Level> | null>(null);
  const previousGov = useRef<Map<string, string> | null>(null);
  const nextId = useRef(1);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const before = previous.current;
    const now = new Map(items.map((i) => [i.key, i.level]));
    previous.current = now;
    if (!before) return;
    const changed: Toast[] = [];
    for (const item of items) {
      const was = before.get(item.key) ?? 'none';
      if (was !== item.level) changed.push({ id: nextId.current++, name: item.name, from: was, to: item.level });
    }
    if (changed.length === 0) return;
    for (const item of items) if ((before.get(item.key) ?? 'none') !== item.level) pulse(`[data-pulse="${item.key}"]`);
    // Toasts are added after the commit, as the browser paints the new levels.
    const frame = requestAnimationFrame(() => setToasts((list) => [...list, ...changed].slice(-3)));
    return () => cancelAnimationFrame(frame);
  }, [items]);

  useEffect(() => {
    const before = previousGov.current;
    const now = new Map(governorates.map((g) => [g.code, g.text]));
    previousGov.current = now;
    if (!before) return;
    for (const [code, text] of now) if (before.get(code) !== text) pulse(`path[data-code="${code}"]`);
  }, [governorates]);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => setToasts((list) => list.slice(1)), 7000);
    return () => clearTimeout(timer);
  }, [toasts]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={t('core.toast.region')}
      className="pointer-events-none fixed end-4 bottom-24 z-50 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2 lg:bottom-6"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="rw-toast pointer-events-auto flex items-start gap-3 rounded-lg border border-sidebar-line bg-sidebar px-4 py-3 text-sm text-sidebar-text shadow-[0_8px_24px_rgba(11,26,22,0.18)]"
        >
          <span className="mt-1 rounded-full bg-white p-0.5">
            <LevelShape level={toast.to} size={12} />
          </span>
          <p className="flex-1">
            {t('core.toast.changed', {
              molecule: toast.name,
              from: t(`core.levels.${toast.from}`),
              to: t(`core.levels.${toast.to}`),
            })}
          </p>
          <button
            type="button"
            onClick={() => setToasts((list) => list.filter((x) => x.id !== toast.id))}
            className="-m-2 inline-flex min-h-10 min-w-10 items-center justify-center rounded-md text-sidebar-muted hover:text-white focus-visible:outline-sidebar-accent"
          >
            <X size={16} aria-hidden="true" />
            <span className="sr-only">{t('core.toast.close')}</span>
          </button>
        </div>
      ))}
    </div>
  );
}
