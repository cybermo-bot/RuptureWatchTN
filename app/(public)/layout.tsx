import type { Metadata, Viewport } from 'next';
import { PilotLine } from '@/components/PilotLine';
import { FollowBanner } from '@/components/public/FollowBanner';
import { PublicFooter, PublicHeader } from '@/components/public/PublicChrome';
import { isPilot } from '@/lib/env';
import { fontVariables, plexArabic } from '@/lib/fonts';
import { getTranslator } from '@/lib/i18n-server';
import '../globals.css';
import { PageEnter } from '@/components/ui/PageEnter';

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
      <body className="flex min-h-full flex-col bg-page text-ink">
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-surface focus:px-4 focus:py-3"
        >
          {t('public.shell.skipToContent')}
        </a>
        {isPilot() ? <PilotLine text={t('public.pilot.line')} /> : null}
        <PublicHeader locale={locale} />
        <FollowBanner locale={locale} />
        <PageEnter className="flex flex-1 flex-col">{children}</PageEnter>
        <PublicFooter locale={locale} />
      </body>
    </html>
  );
}
