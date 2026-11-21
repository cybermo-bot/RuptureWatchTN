'use client';

import { useEffect } from 'react';
import { Button, ButtonLink } from '@/components/Button';
import { t } from '@/lib/i18n';

// Shown when a page fails unexpectedly. Plain words, a way out, and a reference to quote.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="contenu" className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-5 py-12 sm:px-8">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">{t('errors.errorTitle')}</h1>
      <p className="max-w-prose text-ink-muted">{t('errors.errorBody')}</p>
      <div className="flex flex-wrap gap-3">
        <Button onClick={reset}>{t('errors.retry')}</Button>
        <ButtonLink href="/" variant="secondary">
          {t('errors.home')}
        </ButtonLink>
      </div>
      {error.digest ? (
        <p className="font-mono text-xs text-ink-muted">{t('errors.reference', { digest: error.digest })}</p>
      ) : null}
    </main>
  );
}
