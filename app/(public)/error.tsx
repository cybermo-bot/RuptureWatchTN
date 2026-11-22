'use client';

import { useEffect } from 'react';
import { Button, ButtonLink } from '@/components/Button';
import { translator } from '@/lib/i18n';

// The document's lang is set by the public layout, so the message follows the visitor's language.
function documentLocale() {
  return typeof document !== 'undefined' && document.documentElement.lang === 'ar' ? 'ar' : 'fr';
}

export default function PublicError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const t = translator(documentLocale());

  return (
    <main id="contenu" className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-5 py-12 sm:px-8">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">{t('public.shell.errorTitle')}</h1>
      <p className="max-w-prose text-ink-muted">{t('public.shell.errorBody')}</p>
      <div className="flex flex-wrap gap-3">
        <Button onClick={reset}>{t('public.shell.retry')}</Button>
        <ButtonLink href="/medicaments" variant="secondary">
          {t('public.shell.back')}
        </ButtonLink>
      </div>
    </main>
  );
}
