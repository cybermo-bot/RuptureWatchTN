import type { MetadataRoute } from 'next';
import { t } from '@/lib/i18n';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: t('core.app.name'),
    short_name: t('core.app.wordmark'),
    description: t('core.app.description'),
    lang: 'fr',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
