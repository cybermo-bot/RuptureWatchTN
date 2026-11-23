import type { Metadata } from 'next';
import { ButtonLink } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { SiteFooter, SiteHeader, SiteMain } from '@/components/SiteChrome';
import { fontVariables } from '@/lib/fonts';
import { t } from '@/lib/i18n';
import './globals.css';

// Addresses that match no page. The app has two root layouts, app/(site) and app/(public),
// so the 404 for unknown addresses is defined once here (experimental.globalNotFound).

export const metadata: Metadata = {
  title: t('core.errors.notFoundTitle'),
  robots: { index: false, follow: false },
};

export default function GlobalNotFound() {
  return (
    <html lang="fr" dir="ltr" className={`${fontVariables} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-surface text-ink">
        <SiteHeader />
        <SiteMain>
          <PageHeader title={t('core.errors.notFoundTitle')} />
          <EmptyState
            title={t('core.errors.notFoundBody')}
            action={<ButtonLink href="/">{t('core.errors.home')}</ButtonLink>}
          />
        </SiteMain>
        <SiteFooter />
      </body>
    </html>
  );
}
