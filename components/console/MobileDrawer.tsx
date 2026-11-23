'use client';

import { Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { t } from '@/lib/i18n';

/**
 * Phones, every role but the pharmacy: the sidebar folds into a drawer that opens from the top.
 * Closes on navigation, on Escape, and returns focus to the menu button.
 */
export function MobileDrawer({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const [lastPath, setLastPath] = useState(pathname);

  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-md px-2 text-sm font-medium text-sidebar-text hover:bg-sidebar-raised focus-visible:outline-sidebar-accent"
      >
        {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        <span>{open ? t('core.nav.closeMenu') : t('core.nav.menu')}</span>
      </button>
      <div
        id={id}
        hidden={!open}
        className="rw-toast absolute inset-x-0 top-full z-40 max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-t border-sidebar-line bg-sidebar px-4 pt-3 pb-5 shadow-[0_12px_24px_rgba(11,26,22,0.25)]"
      >
        {children}
      </div>
    </>
  );
}
