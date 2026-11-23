// Screenshots of the product, as a visitor sees it, for the session reports and the home page's
// role previews. Signs in with the one-click demo buttons, like a visitor (no password here).
//
//   npm run screenshots -- [--base http://localhost:3000] [--out docs/reports/session-5] [--only name,name] [--widths 360,1280]
//   npm run previews:build -- [--base https://rupturewatch-tn.vercel.app]
//
// previews:build writes public/previews/<role>.jpg: a 1280 x 800 view of each space, scaled
// down, used by the home page's role tiles. Regenerate it after a design change.

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium, type Browser, type Page } from '@playwright/test';

interface Shot {
  name: string;
  path: string;
  /** Demo role key to sign in with first; none for public pages. */
  role?: string;
  /** Run before the shot (click, scroll...). */
  before?: (page: Page) => Promise<void>;
  fullPage?: boolean;
  /** Public pages: language cookie. */
  locale?: 'fr' | 'ar';
  /** Previews: a phone screen (pharmacy, public) or a desktop screen (console). */
  device?: 'phone' | 'desktop';
}

const args = process.argv.slice(2);
function arg(name: string, fallback: string): string {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

const BASE = arg('base', 'http://localhost:3000').replace(/\/$/, '');
const PREVIEWS = args.includes('--previews');

const AMLODIPINE_ID = '8d2608a4-3287-4dce-9eb9-bb732fd9bb26';
const TAMOXIFEN_ID = 'e7dc2583-9c34-49e6-bc49-65a3ebcd5665';

export const SHOTS: Shot[] = [
  { name: 'accueil', path: '/' },
  { name: 'pharmacie', path: '/pharmacie', role: 'pharmacie-tunis' },
  { name: 'pharmacie-alertes', path: '/pharmacie/alertes', role: 'pharmacie-tunis' },
  { name: 'pharmacie-plus', path: '/pharmacie/plus', role: 'pharmacie-tunis' },
  { name: 'signaler-1-recherche', path: '/pharmacie/signaler', role: 'pharmacie-tunis' },
  { name: 'pharmacie-whatsapp', path: '/pharmacie/whatsapp', role: 'pharmacie-tunis' },
  { name: 'coordination', path: '/coordination', role: 'coordination' },
  { name: 'coordination-export', path: '/coordination/export', role: 'coordination' },
  { name: 'coordination-invitation', path: '/coordination/invitation', role: 'coordination' },
  { name: 'grossiste', path: '/grossiste', role: 'grossiste' },
  { name: 'hopital', path: '/hopital', role: 'hopital' },
  { name: 'scenario', path: '/scenario' },
  { name: 'vues', path: '/vues' },
  { name: 'methode', path: '/methode' },
  { name: 'retour', path: '/retour' },
  { name: 'status', path: '/status' },
  { name: 'medicaments', path: '/medicaments' },
  { name: 'pharmacies', path: '/pharmacies' },
  { name: 'bibliotheque', path: '/bibliotheque' },
  { name: 'ruptures-passees', path: '/ruptures-passees' },
  { name: 'prescripteurs', path: '/prescripteurs' },
  // Track B. Catalogue ids: AMLODIPINE (the demo's confirmed medicine) and TAMOXIFENE ("probable").
  { name: 'medicament-statut', path: `/medicaments/${AMLODIPINE_ID}` },
  { name: 'medicament-statut-ar', path: `/medicaments/${AMLODIPINE_ID}`, locale: 'ar' },
  { name: 'demande', path: `/medicaments/${AMLODIPINE_ID}/demande` },
  { name: 'pharmacie-demandes', path: '/pharmacie/demandes', role: 'pharmacie-tunis' },
  { name: 'prescripteurs-verification', path: `/prescripteurs?m=${TAMOXIFEN_ID}`, role: 'medecin' },
];

/** One preview per role tile on the home page (role key: path). */
export const PREVIEW_SHOTS: Shot[] = [
  { name: 'pharmacie-tunis', path: '/pharmacie', role: 'pharmacie-tunis', device: 'phone' },
  { name: 'pharmacie-sfax', path: '/pharmacie/alertes', role: 'pharmacie-sfax', device: 'phone' },
  { name: 'hopital', path: '/hopital', role: 'hopital' },
  { name: 'grossiste', path: '/grossiste', role: 'grossiste' },
  { name: 'coordination', path: '/coordination', role: 'coordination' },
  { name: 'medecin', path: `/prescripteurs?m=${TAMOXIFEN_ID}`, role: 'medecin', device: 'phone' },
  { name: 'public', path: '/medicaments', device: 'phone' },
];

async function signIn(page: Page, role: string) {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await Promise.all([
    page.waitForURL((url) => url.pathname !== '/', { timeout: 60_000 }),
    page.click(`button[name="role"][value="${role}"]`),
  ]);
}

async function settle(page: Page) {
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined);
  await page.evaluate(() => document.fonts.ready);
}

async function take(browser: Browser, shot: Shot, width: number, out: string, quality?: number): Promise<boolean> {
  const height = width < 600 ? 780 : 800;
  // Previews are small: a desktop screen at half scale (640 x 400), a phone screen at 1x.
  const scale = quality ? (width < 600 ? 1 : 0.5) : width < 600 ? 2 : 1;
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: scale,
    locale: 'fr-FR',
    reducedMotion: 'reduce',
  });
  if (shot.locale) {
    await context.addCookies([{ name: 'rw-lang', value: shot.locale, url: BASE }]);
  }
  const page = await context.newPage();
  try {
    if (shot.role) await signIn(page, shot.role);
    await page.goto(`${BASE}${shot.path}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await settle(page);
    if (shot.before) await shot.before(page);
    if (quality) {
      await page.screenshot({ path: out, type: 'jpeg', quality, fullPage: false });
    } else {
      await page.screenshot({ path: out, fullPage: shot.fullPage ?? true });
    }
    console.log(`${out}`);
    return true;
  } catch (error) {
    console.error(`FAILED ${shot.name} @${width}: ${error instanceof Error ? error.message : error}`);
    return false;
  } finally {
    await context.close();
  }
}

async function main() {
  const browser = await chromium.launch();
  try {
    if (PREVIEWS) {
      const outDir = 'public/previews';
      await mkdir(outDir, { recursive: true });
      const written: string[] = [];
      for (const shot of PREVIEW_SHOTS) {
        if (await take(browser, shot, shot.device === 'phone' ? 360 : 1280, join(outDir, `${shot.name}.jpg`), 70)) written.push(shot.name);
      }
      // The home page shows a preview only for the files listed here.
      await writeFile(join(outDir, 'manifest.json'), `${JSON.stringify({ previews: written }, null, 2)}
`);
      return;
    }
    const outDir = arg('out', 'docs/reports/session-5');
    const only = arg('only', '')
      .split(',')
      .filter(Boolean);
    const widths = arg('widths', '360,1280').split(',').map(Number);
    await mkdir(outDir, { recursive: true });
    for (const shot of SHOTS.filter((s) => only.length === 0 || only.includes(s.name))) {
      for (const width of widths) {
        await take(browser, shot, width, join(outDir, `${shot.name}-${width}.png`));
      }
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
