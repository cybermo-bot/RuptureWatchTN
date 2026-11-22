// Fonts, loaded once with next/font and shared by every root layout.
import { IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Sans_Arabic } from 'next/font/google';

export const plexSans = IBM_Plex_Sans({
  variable: '--font-plex-sans',
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600'],
  display: 'swap',
});

export const plexMono = IBM_Plex_Mono({
  variable: '--font-plex-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
});

// Arabic glyphs only: Latin text inside Arabic pages (medicine names, codes) keeps IBM Plex Sans.
// Not preloaded, so French pages never download it.
export const plexArabic = IBM_Plex_Sans_Arabic({
  variable: '--font-plex-arabic',
  subsets: ['arabic'],
  weight: ['400', '500', '600'],
  display: 'swap',
  preload: false,
});

export const fontVariables = `${plexSans.variable} ${plexMono.variable}`;
