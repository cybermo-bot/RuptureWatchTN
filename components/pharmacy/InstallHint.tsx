'use client';

import { Smartphone, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { t } from '@/lib/i18n';

// "Ajouter à l'écran d'accueil": the pharmacy space is installable (app/manifest.ts). Where the
// browser offers the install prompt, one button opens it; on iPhone, and elsewhere, the hint
// says where to find it. Hidden once installed, or once dismissed (kept on this device only).

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED = 'rw-install-hint-dismissed';

type Mode = 'hidden' | 'prompt' | 'ios' | 'other';

export function InstallHint({ compact = false }: { compact?: boolean }) {
  const [mode, setMode] = useState<Mode>('hidden');
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    if (standalone || (!compact && localStorage.getItem(DISMISSED))) return;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const frame = requestAnimationFrame(() => setMode(ios ? 'ios' : 'other'));
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPromptEvent);
      setMode('prompt');
    };
    const onInstalled = () => setMode('hidden');
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [compact]);

  if (mode === 'hidden') return null;

  return (
    <section aria-labelledby="installer" className="panel flex items-start gap-3 p-4">
      <Smartphone size={22} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0 text-brand" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h2 id="installer" className="font-semibold text-ink">
          {t('core.install.title')}
        </h2>
        <p className="text-sm text-ink-muted">{t('core.install.body')}</p>
        {mode === 'prompt' && prompt ? (
          <button
            type="button"
            onClick={async () => {
              await prompt.prompt();
              const choice = await prompt.userChoice;
              if (choice.outcome === 'accepted') setMode('hidden');
            }}
            className="inline-flex min-h-12 w-fit items-center rounded-md bg-brand px-4 text-sm font-medium text-white hover:bg-brand-strong"
          >
            {t('core.install.action')}
          </button>
        ) : (
          <p className="text-sm text-ink">{mode === 'ios' ? t('core.install.ios') : t('core.install.other')}</p>
        )}
      </div>
      {compact ? null : (
        <button
          type="button"
          onClick={() => {
            localStorage.setItem(DISMISSED, '1');
            setMode('hidden');
          }}
          className="-m-2 inline-flex min-h-12 min-w-12 shrink-0 items-center justify-center rounded-md text-ink-muted hover:text-ink"
        >
          <X size={18} aria-hidden="true" />
          <span className="sr-only">{t('core.install.dismiss')}</span>
        </button>
      )}
    </section>
  );
}
