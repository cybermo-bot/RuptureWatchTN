// Page metadata with its Open Graph title and sentence, so a shared link shows the page, not the
// site's default. The card image itself is the route's opengraph-image.tsx.

import type { Metadata } from 'next';
import { t } from '@/lib/i18n';

export const OG_BASE = { type: 'website', siteName: t('core.app.name'), locale: 'fr_FR' } as const;

export function sharedPageMetadata(title: string, og: { title: string; body: string }): Metadata {
  return { title, description: og.body, openGraph: { ...OG_BASE, title: og.title, description: og.body } };
}
