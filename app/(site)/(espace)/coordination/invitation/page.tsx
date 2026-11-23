import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import QRCode from 'qrcode';
import { getCurrentSession } from '@/lib/auth/session';
import { t } from '@/lib/i18n';

export const metadata = { robots: { index: false, follow: false } };

// The tester invite link as a QR code, to show on a phone during a test. Coordinators only.
export default async function InvitationPage() {
  const session = await getCurrentSession();
  if (!session) redirect('/#roles');
  if (session.organisation.type !== 'coordinator') redirect('/');

  const code = process.env.TESTER_INVITE_CODE;
  if (!code) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{t('core.invitation.title')}</h1>
        <p className="text-ink">{t('core.invitation.missing')}</p>
      </div>
    );
  }

  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  const url = `${proto}://${host}/rejoindre/${encodeURIComponent(code)}`;
  // Generated on the server from a trusted library; the SVG holds only the QR modules.
  const svg = await QRCode.toString(url, { type: 'svg', errorCorrectionLevel: 'M', margin: 2, color: { dark: '#10201b', light: '#ffffff' } });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link href="/coordination" className="text-sm text-ink-muted">
          {t('core.invitation.back')}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{t('core.invitation.title')}</h1>
        <p className="max-w-prose text-ink-muted">{t('core.invitation.intro')}</p>
      </header>
      <figure className="panel m-0 flex max-w-md flex-col items-start gap-4 p-5">
        <div
          role="img"
          aria-label={t('core.invitation.qrLabel')}
          className="w-full max-w-72 [&>svg]:h-auto [&>svg]:w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <figcaption className="flex w-full flex-col gap-1">
          <span className="text-sm font-medium text-ink">{t('core.invitation.linkLabel')}</span>
          <code className="font-mono text-sm break-all text-ink-muted">{url}</code>
        </figcaption>
      </figure>
    </div>
  );
}
