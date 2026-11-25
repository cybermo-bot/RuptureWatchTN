// Fonts of the home page only, kept out of lib/fonts.ts so no other page downloads them:
// an editorial serif for headings, a grotesque for text and a monospace for days and figures.
import { DM_Mono, Hanken_Grotesk, Instrument_Serif } from 'next/font/google';

const display = Instrument_Serif({
  variable: '--font-landing-display',
  subsets: ['latin', 'latin-ext'],
  weight: '400',
  style: ['normal', 'italic'],
  display: 'swap',
});

const sans = Hanken_Grotesk({
  variable: '--font-landing-sans',
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const mono = DM_Mono({
  variable: '--font-landing-mono',
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500'],
  display: 'swap',
});

export const landingFontVariables = `${display.variable} ${sans.variable} ${mono.variable}`;
