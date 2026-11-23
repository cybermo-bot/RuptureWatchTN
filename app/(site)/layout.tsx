import type { Metadata, Viewport } from 'next';
import { fontVariables } from '@/lib/fonts';
import { dir, locale, t } from '@/lib/i18n';
import { OG_BASE } from '@/lib/og/meta';
import { siteUrl } from '@/lib/site';
import '../globals.css';

export const metadata: Metadata = {
  title: { default: t('core.app.title'), template: `%s · ${t('core.app.name')}` },
  description: t('core.app.description'),
  metadataBase: new URL(siteUrl()),
  openGraph: { ...OG_BASE, title: t('core.og.home.title'), description: t('core.og.home.body') },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={locale} dir={dir} className={`${fontVariables} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-surface text-ink">
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-3"
        >
          {t('core.app.skipToContent')}
        </a>
        {children}
      </body>
    </html>
  );
}
