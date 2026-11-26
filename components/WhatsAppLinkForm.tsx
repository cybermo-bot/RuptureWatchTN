'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { confirmLinkCode, requestLinkCode, type LinkState } from '@/app/actions/whatsapp';
import { buttonClass } from '@/components/Button';
import { t } from '@/lib/i18n';

// Linking a WhatsApp number: the number, then the 6-digit code received on WhatsApp.

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={buttonClass('primary', 'w-full disabled:cursor-wait sm:w-auto')}
    >
      {pending ? t('core.common.sending') : label}
    </button>
  );
}

function StateLine({ state }: { state: LinkState }) {
  if (state.status === 'idle') return null;
  const ok = state.status === 'sent' || state.status === 'linked';
  const text = t(`core.whatsappLink.states.${state.status}`, 'masked' in state && state.masked ? { masked: state.masked } : {});
  return (
    <p role={ok ? 'status' : 'alert'} className={`max-w-prose ${ok ? 'text-ink' : 'font-medium text-ink'}`}>
      {text}
    </p>
  );
}

export function WhatsAppLinkForm() {
  const [requestState, request] = useActionState(requestLinkCode, { status: 'idle' } as LinkState);
  const [confirmState, confirm] = useActionState(confirmLinkCode, { status: 'idle' } as LinkState);
  // "Un autre numéro" dismisses the code step of this request; a new request shows it again.
  const [dismissed, setDismissed] = useState<LinkState | null>(null);
  const current = requestState !== dismissed;
  const codeStep = requestState.status === 'sent' && current;

  if (confirmState.status === 'linked') return <StateLine state={confirmState} />;

  if (!codeStep) {
    return (
      <form action={request} className="flex max-w-md flex-col gap-3">
        <label htmlFor="wa-phone" className="font-medium text-ink">
          {t('core.whatsappLink.phoneLabel')}
        </label>
        <input
          id="wa-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          aria-describedby="wa-phone-hint"
          className="min-h-12 rounded-sm border border-line bg-surface px-4 text-lg text-ink"
        />
        <p id="wa-phone-hint" className="text-sm text-ink-muted">
          {t('core.whatsappLink.phoneHint')}
        </p>
        <Submit label={t('core.whatsappLink.send')} />
        {current ? <StateLine state={requestState} /> : null}
      </form>
    );
  }

  return (
    <div className="flex max-w-md flex-col gap-3">
      <StateLine state={requestState} />
      <form action={confirm} className="flex flex-col gap-3">
        <label htmlFor="wa-code" className="font-medium text-ink">
          {t('core.whatsappLink.codeLabel')}
        </label>
        <input
          id="wa-code"
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]{6,7}"
          maxLength={7}
          required
          aria-describedby="wa-code-hint"
          className="min-h-12 rounded-sm border border-line bg-surface px-4 font-mono text-lg tracking-widest text-ink"
        />
        <p id="wa-code-hint" className="text-sm text-ink-muted">
          {t('core.whatsappLink.codeHint')}
        </p>
        <Submit label={t('core.whatsappLink.confirm')} />
        <StateLine state={confirmState} />
      </form>
      <button type="button" onClick={() => setDismissed(requestState)} className={buttonClass('quiet', 'w-fit px-0 underline-offset-2')}>
        {t('core.whatsappLink.otherNumber')}
      </button>
    </div>
  );
}
