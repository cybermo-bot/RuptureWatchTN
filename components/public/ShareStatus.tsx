'use client';

import { Copy, MessageCircle, Share2 } from 'lucide-react';
import { useState, useSyncExternalStore } from 'react';

// "Partager ce statut": the phone's share sheet (Web Share API) where the browser has one;
// otherwise a WhatsApp link and "Copier le lien". The text is built on the server
// (lib/public/share.ts): the status sentence, "Simulé" when it applies, the disclaimer.
// Nothing about the visitor is shared or stored.

const noop = () => () => {};

interface Labels {
  share: string;
  whatsapp: string;
  copy: string;
  copied: string;
  copyFailed: string;
}

export function ShareStatus({ title, text, url, labels }: { title: string; text: string; url: string; labels: Labels }) {
  // Server and first paint: the fallback links (they work without JavaScript). Then the browser's answer.
  const canShare = useSyncExternalStore(
    noop,
    () => typeof navigator.share === 'function',
    () => false,
  );
  const [copy, setCopy] = useState<'idle' | 'done' | 'failed'>('idle');

  const BUTTON =
    'inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-line bg-surface px-4 font-medium text-ink no-underline hover:border-ink-muted hover:bg-surface-subtle';

  if (canShare) {
    return (
      <button
        type="button"
        className={`${BUTTON} w-full sm:w-auto sm:self-start`}
        onClick={() => {
          navigator.share({ title, text, url }).catch(() => undefined);
        }}
      >
        <Share2 size={18} aria-hidden="true" className="text-brand" />
        {labels.share}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2" role="group" aria-label={labels.share}>
      <div className="flex flex-col gap-2 sm:flex-row">
        <a href={`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`} target="_blank" rel="noopener noreferrer" className={BUTTON}>
          <MessageCircle size={18} aria-hidden="true" className="text-brand" />
          {labels.whatsapp}
        </a>
        <button
          type="button"
          className={BUTTON}
          onClick={() => {
            navigator.clipboard
              .writeText(url)
              .then(() => setCopy('done'))
              .catch(() => setCopy('failed'));
          }}
        >
          <Copy size={18} aria-hidden="true" className="text-brand" />
          {labels.copy}
        </button>
      </div>
      <p aria-live="polite" className="text-sm text-ink-muted">
        {copy === 'done' ? labels.copied : copy === 'failed' ? labels.copyFailed : ''}
      </p>
    </div>
  );
}
