// Screenshots of the product, as a visitor sees it, for session reports and role preview assets.
// Signs in with the one-click demo buttons, like a visitor (no password here).
//
//   npm run screenshots -- [--base http://localhost:3000] [--out docs/reports/session-5] [--only name,name] [--widths 360,1280]
//   npm run previews:build -- [--base https://rupturewatch-tn.vercel.app]
//
// previews:build writes scaled views of the demo roles to public/previews/.

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

const SHOWCASE_ID = '75077225-938d-4278-9e21-51de44d88a9f'; // LEVETIRACETAM
const TAMOXIFEN_ID = 'e7dc2583-9c34-49e6-bc49-65a3ebcd5665';

export const SHOTS: Shot[] = [
  { name: 's7-home', path: '/', fullPage: false },
  { name: 's7-scenario-entry', path: '/scenario', fullPage: false },
  { name: 's7-scenario-confirmed', path: '/scenario', fullPage: false, before: async (page) => {
    await page.getByRole('button', { name: 'Ajouter le 4ᵉ signalement' }).click();
    await page.getByRole('button', { name: 'Sfax', exact: true }).click();
    await page.locator('[data-demo-level="confirmed"]').waitFor();
  } },
  { name: 's7-professional', path: `/grossiste?m=${SHOWCASE_ID}#detail`, role: 'grossiste', fullPage: false, before: async (page) => {
    await page.getByRole('link', { name: 'Comparer la répartition' }).waitFor();
    await page.locator('#detail').evaluate((detail) => detail.scrollIntoView({ block: 'start' }));
  } },
  { name: 's7-request', path: '/medicaments?recherche=1', fullPage: false, before: async (page) => {
    await page.getByRole('searchbox').fill('antiomal');
    await page.getByRole('link', { name: /ANTIOMAL.*500 mg.*boîte de 60/i }).click();
    await page.getByRole('link', { name: 'Demander aux pharmacies proches' }).click();
    await page.getByLabel('Choisissez votre gouvernorat').selectOption({ label: 'Tunis' });
    await page.getByRole('radio', { name: /toute marque/ }).check();
    await page.getByText(/Ne changez pas de marque/).waitFor();
    await page.getByRole('radio', { name: /ANTIOMAL.*500 mg.*boîte de 60/i }).check();
    await page.getByText(/Vous demandez.*ANTIOMAL.*Tunis/).waitFor();
  } },
  { name: 'accueil', path: '/' },
  // The three doors (pilot-1 item 4: the demo first, the form folded).
  { name: 'connexion-pharmacie', path: '/connexion/pharmacie' },
  { name: 'connexion-grossiste', path: '/connexion/grossiste' },
  { name: 'connexion-institution', path: '/connexion/institution' },
  { name: 'pharmacie', path: '/pharmacie', role: 'pharmacie-tunis' },
  { name: 'pharmacie-alertes', path: '/pharmacie/alertes', role: 'pharmacie-tunis' },
  { name: 'pharmacie-plus', path: '/pharmacie/plus', role: 'pharmacie-tunis' },
  { name: 'signaler-1-recherche', path: '/pharmacie/signaler', role: 'pharmacie-tunis' },
  // Pilot-1 item 3: a showcase medicine reached from the search, refused to the one-click pharmacy.
  { name: 'signaler-2-showcase', path: `/pharmacie/signaler/${SHOWCASE_ID}`, role: 'pharmacie-tunis' },
  // Pilot-3 item 1: step 2 of a followed, non-showcase medicine, with « Quelle présentation ? ».
  // Opens the row only; nothing is sent.
  { name: 'signaler-2-presentation', path: '/pharmacie/signaler', role: 'pharmacie-tunis', before: async (page) => {
    await page.locator('section[aria-labelledby="choix-suivis"] a:not([data-showcase])').first().click();
    await page.locator('[data-presentations]').waitFor();
  } },
  // Pilot-4 step 4: the report result, opened by its URL (« Avant » from the query, « Après » the
  // live level); it only reads, nothing is reported.
  { name: 'resultat', path: `/pharmacie/molecule/${SHOWCASE_ID}/resultat?avant=likely`, role: 'pharmacie-tunis' },
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
  // Track B. Catalogue ids: LEVETIRACETAM (the demo's confirmed medicine) and TAMOXIFENE ("probable").
  { name: 'medicament-statut', path: `/medicaments/${SHOWCASE_ID}` },
  { name: 'medicament-statut-ar', path: `/medicaments/${SHOWCASE_ID}`, locale: 'ar' },
  { name: 'demande', path: `/medicaments/${SHOWCASE_ID}/demande` },
  { name: 'pharmacie-demandes', path: '/pharmacie/demandes', role: 'pharmacie-tunis' },
  { name: 'prescripteurs-verification', path: `/prescripteurs?m=${TAMOXIFEN_ID}`, role: 'medecin' },
  // Pilot-1 item 6: « Pourquoi ? » opened, the rule's name where its code was.
  { name: 'prescripteurs-pourquoi', path: `/prescripteurs?m=${TAMOXIFEN_ID}`, role: 'medecin', fullPage: false, before: async (page) => {
    await page.getByText('Pourquoi ?').first().click();
    await page.getByText('Règle appliquée').first().scrollIntoViewIfNeeded();
  } },
  // Part 5: the institutions' spaces, and where their work shows.
  { name: 'coordination-note', path: '/coordination/note', role: 'coordination' },
  { name: 'centrale', path: '/centrale', role: 'centrale' },
  { name: 'centrale-amont', path: '/centrale/amont', role: 'centrale' },
  { name: 'ordre', path: '/ordre', role: 'ordre' },
  { name: 'ordre-message', path: '/ordre/message', role: 'ordre' },
  { name: 'ordre-invitation', path: '/ordre/invitation', role: 'ordre' },
  { name: 'pharmacie-alertes-sfax', path: '/pharmacie/alertes', role: 'pharmacie-sfax' },
  { name: 'pharmacie-medicament', path: `/pharmacie/molecule/${SHOWCASE_ID}`, role: 'pharmacie-tunis' },
  { name: 'vues-showcase', path: `/vues/${SHOWCASE_ID}` },
  // Pilot-2 item 1: with NEXT_PUBLIC_APP_MODE=pilot, the home's two doors and the line on every page.
  { name: 'pilote-accueil', path: '/', fullPage: false },
  { name: 'pilote-prescripteurs', path: '/prescripteurs', fullPage: false },
  // Pilot-2 item 2: the first-visit guide (first screen just after joining, last screen).
  { name: 'guide-1', path: '/pharmacie/bienvenue?rejoint=1', role: 'pharmacie-tunis' },
  { name: 'guide-3', path: '/pharmacie/bienvenue?etape=3', role: 'pharmacie-tunis' },
  // Pilot-2 item 3: « Un problème ? Une idée ? », public (French, Arabic, sent) and pharmacy.
  { name: 'avis', path: '/avis?depuis=%2Fmedicaments' },
  { name: 'avis-ar', path: '/avis?depuis=%2Fmedicaments', locale: 'ar' },
  { name: 'avis-envoye', path: '/avis?depuis=%2Fmedicaments&envoye=1', fullPage: false },
  { name: 'pharmacie-avis', path: '/pharmacie/avis?erreur=limite', role: 'pharmacie-tunis' },
  // Pilot-2 item 4: with NEXT_PUBLIC_APP_MODE=pilot, the request form says few pharmacies take part.
  { name: 'pilote-demande', path: `/medicaments/${SHOWCASE_ID}/demande`, fullPage: false, before: async (page) => {
    await page.locator('select').first().scrollIntoViewIfNeeded();
  } },
  { name: 'pilote-demande-ar', path: `/medicaments/${SHOWCASE_ID}/demande`, locale: 'ar', fullPage: false, before: async (page) => {
    await page.locator('select').first().scrollIntoViewIfNeeded();
  } },
  // Pilot-2 item 5: a product outside the CNAM list, in French and Arabic.
  { name: 'recherche-vide', path: '/medicaments?recherche=1', fullPage: false, before: async (page) => {
    await page.getByRole('searchbox').fill('zzqxw');
    await page.locator('[role="status"] a[href^="/avis?depuis="]').waitFor();
  } },
  { name: 'recherche-vide-ar', path: '/medicaments?recherche=1', locale: 'ar', fullPage: false, before: async (page) => {
    await page.getByRole('searchbox').fill('zzqxw');
    await page.locator('[role="status"] a[href^="/avis?depuis="]').waitFor();
  } },
  // Pilot-4 step 3: the patient screens with results, and in Arabic. Searches only read.
  { name: 'recherche-resultats', path: '/medicaments?recherche=1', before: async (page) => {
    await page.getByRole('searchbox').fill('levetiracetam');
    await page.locator('main [role="region"] a').first().waitFor();
  } },
  { name: 'recherche-resultats-ar', path: '/medicaments?recherche=1', locale: 'ar', before: async (page) => {
    await page.getByRole('searchbox').fill('levetiracetam');
    await page.locator('main [role="region"] a').first().waitFor();
  } },
  { name: 'demande-ar', path: `/medicaments/${SHOWCASE_ID}/demande`, locale: 'ar' },
  { name: 'ruptures-passees-ar', path: '/ruptures-passees', locale: 'ar' },
  { name: 'pharmacies-ar', path: '/pharmacies', locale: 'ar' },
  // Pilot-1 item 7: the pharmacy tab bar (« Demandes »), the coordination tiles, the scenario line.
  { name: 'pharmacie-barre', path: '/pharmacie', role: 'pharmacie-tunis', fullPage: false },
  { name: 'coordination-chiffres', path: '/coordination', role: 'coordination', fullPage: false },
  { name: 'scenario-ligne', path: '/scenario#scenario-complet', fullPage: false, before: async (page) => {
    await page.locator('#scenario-complet-titre').scrollIntoViewIfNeeded();
  } },
];

/** One preview per role tile on the home page (role key: path). */
export const PREVIEW_SHOTS: Shot[] = [
  { name: 'pharmacie-tunis', path: '/pharmacie', role: 'pharmacie-tunis', device: 'phone' },
  { name: 'pharmacie-sfax', path: '/pharmacie/alertes', role: 'pharmacie-sfax', device: 'phone' },
  { name: 'hopital', path: '/hopital', role: 'hopital' },
  { name: 'grossiste', path: '/grossiste', role: 'grossiste' },
  { name: 'coordination', path: '/coordination', role: 'coordination' },
  { name: 'centrale', path: '/centrale', role: 'centrale' },
  { name: 'ordre', path: '/ordre', role: 'ordre' },
  { name: 'medecin', path: `/prescripteurs?m=${TAMOXIFEN_ID}`, role: 'medecin', device: 'phone' },
  { name: 'public', path: '/medicaments', device: 'phone' },
];

async function signIn(page: Page, role: string) {
  await page.goto(`${BASE}/scenario#espaces-demo`, { waitUntil: 'domcontentloaded' });
  await page.locator('#espaces-demo > summary').click();
  const button = page.locator(`#espaces-demo button[name="role"][value="${role}"]`);
  await Promise.all([
    page.waitForURL((url) => url.pathname !== '/' && url.pathname !== '/scenario', { timeout: 60_000 }),
    button.click(),
  ]);
}

async function settle(page: Page) {
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined);
  await page.evaluate(() => document.fonts.ready);
}

async function take(browser: Browser, shot: Shot, width: number, out: string, quality?: number): Promise<boolean> {
  const height = shot.name.startsWith('s7-') ? 800 : width < 600 ? 780 : 800;
  // Previews are small: a desktop screen at half scale (640 x 400), a phone screen at 1x.
  const scale = shot.name.startsWith('s7-') ? 1 : quality ? (width < 600 ? 1 : 0.5) : width < 600 ? 2 : 1;
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
    // Every shot: say when the page scrolls sideways (the ux-audit viewport check).
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 0) console.warn(`OVERFLOW ${shot.name} @${width}: ${overflow}px`);
    if (shot.name.startsWith('s7-')) {
      const reflows = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
      if (!reflows) throw new Error('Horizontal overflow');
      if (shot.name === 's7-home') {
        const colour = await page.locator('main').evaluate((main) => getComputedStyle(main).backgroundColor);
        if (colour !== 'rgb(246, 242, 236)') throw new Error('The homepage stylesheet did not load');
        const demo = await page.getByRole('link', { name: 'Essayer la démo', exact: true }).boundingBox();
        if (!demo || demo.y + demo.height > height) throw new Error('The demo CTA falls below the first viewport');
      }
    }
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
      // Keep track of the preview assets produced by this run.
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
    for (const shot of SHOTS.filter((s) => only.length === 0 ? !s.name.startsWith('s7-') : only.includes(s.name))) {
      for (const width of widths) {
        if (!(await take(browser, shot, width, join(outDir, `${shot.name}-${width}.png`)))) process.exitCode = 1;
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
