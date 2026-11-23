import type { Metadata, Viewport } from 'next';
import { FollowBanner } from '@/components/public/FollowBanner';
import { PublicFooter, PublicHeader } from '@/components/public/PublicChrome';
import { fontVariables, plexArabic } from '@/lib/fonts';
import { getTranslator } from '@/lib/i18n-server';
import '../globals.css';

// Root layout of the public pages: no sign-in, French or Arabic from the visitor's choice
// (cookie), lang and dir set on the document. The professional spaces have their own root
// layout in app/(site), always in French; moving between the two reloads the page.

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return {
    title: { default: t('public.shell.title'), template: `%s · ${t('core.app.name')}` },
    description: t('public.shell.description'),
    robots: { index: false, follow: false },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
};

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const { locale, dir, t } = await getTranslator();
  return (
    <html lang={locale} dir={dir} className={`${fontVariables} ${plexArabic.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-surface text-ink">
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-3"
        >
          {t('public.shell.skipToContent')}
        </a>
        <PublicHeader locale={locale} />
        <FollowBanner locale={locale} />
        {children}
        <PublicFooter locale={locale} />
      </body>
    </html>
  );
}
