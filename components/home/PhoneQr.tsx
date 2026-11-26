import { Smartphone } from 'lucide-react';
import { t } from '@/lib/i18n';
import { absoluteUrl, qrSvg } from '@/lib/qr';

// "Ouvrir sur votre téléphone": on a laptop, a judge scans this to try the public side on their
// phone (the medicine search, then a request to nearby pharmacies). Desktop only: on a phone the
// public tile next to it is the way in. The link is the host that served the page.

export async function PhoneQr() {
  const url = await absoluteUrl('/medicaments');
  const svg = await qrSvg(url);
  return (
    <figure className="panel m-0 flex h-full flex-col gap-3 p-4">
      <p className="flex items-center gap-2 font-semibold text-ink">
        <Smartphone size={20} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-brand" />
        {t('core.home.phoneQr.title')}
      </p>
      <div className="flex items-start gap-4">
        <div
          role="img"
          aria-label={t('core.home.phoneQr.qrLabel')}
          className="w-28 shrink-0 text-ink [&>svg]:h-auto [&>svg]:w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <figcaption className="text-sm text-ink-muted">{t('core.home.phoneQr.body')}</figcaption>
      </div>
      <p className="mt-auto font-mono text-xs break-all text-ink-muted">{url.replace(/^https?:\/\//, '')}</p>
    </figure>
  );
}
