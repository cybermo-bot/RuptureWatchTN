import { expect, test, type Page } from '@playwright/test';

// The main flows of the product, on a deployed site (E2E_BASE_URL). Every row comes from a demo
// account, whose organisation is simulated. What the tests leave is listed in tests/e2e/README.md.

const BASE = process.env.E2E_BASE_URL;

async function signInAs(page: Page, role: string) {
  await page.goto('/');
  await page.getByRole('button', { name: `Se connecter en tant que ${role}` }).click();
  // The sign-in is a form post that redirects to the role's space: wait for it before moving on.
  await page.waitForURL((url) => url.pathname !== '/', { timeout: 30_000 });
}

test.describe('pharmacy report, then coordination', () => {
  test.skip(!BASE, 'Set E2E_BASE_URL to the preview or production URL.');
  // Serial: test 2 looks for the medicine reported in test 1.
  test.describe.configure({ mode: 'serial' });
  let reported: string | null = null;

  test('1. a pharmacy reports a followed medicine in two taps and sees the result', async ({ page }) => {
    await signInAs(page, 'Pharmacie (Tunis)');
    await expect(page).toHaveURL(/\/pharmacie$/);

    await page.goto('/pharmacie/signaler');
    // Never the showcase medicine (followed too): its simulated history stays untouched.
    const followed = page.locator('section[aria-labelledby="choix-suivis"] a').filter({ hasNotText: SHOWCASE_NAME }).first();
    await expect(followed).toBeVisible();
    reported = (await followed.locator('span.text-lg').first().innerText()).trim();

    // Tap one: the medicine. Tap two: when it was ordered.
    await followed.click();
    await page.getByRole('button', { name: 'Il y a 3 jours' }).click();

    await expect(page).toHaveURL(/\/pharmacie\/molecule\/[0-9a-f-]+\/resultat/);
    await expect(page.getByRole('heading', { name: 'Signalement enregistré' })).toBeVisible();
    await expect(page.getByText('Ce que votre signalement change')).toBeVisible();
  });

  test('2. coordination sees that medicine in its list', async ({ page }) => {
    expect(reported, 'set by test 1').not.toBeNull();
    await signInAs(page, 'Ministère de la Santé');
    await expect(page).toHaveURL(/\/coordination/);
    const list = page.locator('section[aria-labelledby="signaux"]');
    await expect(list.getByText(reported!, { exact: true })).toBeVisible();
    // No pharmacy is ever named to the coordination unit.
    await expect(page.getByText(/Pharmacie démo/)).toHaveCount(0);
  });
});

test.describe('scenario', () => {
  test.skip(!BASE, 'Set E2E_BASE_URL to the preview or production URL.');

  test('3. the scenario plays to "Levée"', async ({ page }) => {
    await page.goto('/scenario');
    await page.getByRole('button', { name: 'Lancer le scénario' }).click();
    await expect(page.locator('[data-done="true"]')).toBeVisible({ timeout: 60_000 });
    await expect(page.locator('[data-level="cleared"]')).toBeVisible();
    await expect(page.getByText('Fin du scénario', { exact: false })).toBeVisible();
  });
});

// LEVETIRACETAM: the demo shortage, "confirmée" on the live site (lib/demo/shortage.ts).
const SHOWCASE = '75077225-938d-4278-9e21-51de44d88a9f';
const SHOWCASE_NAME = 'LEVETIRACETAM';
const ARRIVAL_LINE = 'Arrivage annoncé par la centrale d’achat pour le';

/** A Tunis date `days` ahead, as YYYY-MM-DD. */
function tunisDay(days: number): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Tunis' }).format(new Date(Date.now() + days * 86_400_000));
}

test.describe('patient request', () => {
  test.skip(!BASE, 'Set E2E_BASE_URL to the preview or production URL.');

  test('4. a patient request, a pharmacy answer, the pharmacy on the map', async ({ browser }) => {
    // The patient: no account, a fresh browser (a new random device id).
    const patient = await (await browser.newContext()).newPage();
    await patient.goto(`/medicaments/${SHOWCASE}/demande`);
    await patient.getByLabel('Ou choisissez votre gouvernorat').selectOption({ label: 'Tunis' });
    await patient.getByRole('button', { name: 'Envoyer la demande' }).click();
    await expect(patient).toHaveURL(/\/demandes\/[0-9a-f-]+$/, { timeout: 30_000 });
    await expect(patient.getByText('Pharmacie démo A, Tunis')).toHaveCount(0);

    // The pharmacy answers the newest request for the showcase medicine, showing its name.
    const pharmacy = await (await browser.newContext()).newPage();
    await signInAs(pharmacy, 'Pharmacie (Tunis)');
    await pharmacy.goto('/pharmacie/demandes');
    const row = pharmacy.locator('li').filter({ hasText: SHOWCASE_NAME }).last();
    await row.getByRole('button', { name: 'Disponible, me montrer au patient' }).click();
    await expect(pharmacy.getByText('Réponse envoyée : le patient voit votre pharmacie sur sa carte.')).toBeVisible();

    // The patient's page refreshes on its own and shows the pharmacy.
    await expect(patient.getByText('Pharmacie démo A, Tunis').first()).toBeVisible({ timeout: 30_000 });
    await expect(patient.getByText('Appelez avant de vous déplacer.', { exact: false })).toBeVisible();
  });
});

test.describe('institutions', () => {
  test.skip(!BASE, 'Set E2E_BASE_URL to the preview or production URL.');

  test('5. the centrale announces an arrival: pharmacies and the public see it, the level does not move', async ({ browser }) => {
    const central = await (await browser.newContext()).newPage();
    await signInAs(central, 'Pharmacie centrale');
    await expect(central).toHaveURL(/\/centrale/);
    const item = central.locator(`#m-${SHOWCASE}`);
    await expect(item.getByText('Confirmée', { exact: true })).toBeVisible();
    await item.getByText('Annoncer un arrivage').click();
    await item.getByLabel('Date d’arrivée prévue').fill(tunisDay(10));
    await item.getByLabel('un à trois mois de besoins').check();
    await item.getByRole('button', { name: 'Annoncer l’arrivage' }).click();
    await expect(central).toHaveURL(/annonce=ok/);
    await expect(central.getByText(`Arrivage annoncé pour ${SHOWCASE_NAME}.`)).toBeVisible();
    await expect(central.locator(`#m-${SHOWCASE}`).getByText('Confirmée', { exact: true })).toBeVisible();

    const pharmacy = await (await browser.newContext()).newPage();
    await signInAs(pharmacy, 'Pharmacie (Tunis)');
    await pharmacy.goto(`/pharmacie/molecule/${SHOWCASE}`);
    await expect(pharmacy.getByText(ARRIVAL_LINE, { exact: false })).toBeVisible();

    const visitor = await (await browser.newContext()).newPage();
    await visitor.goto(`/medicaments/${SHOWCASE}`);
    await expect(visitor.getByText(ARRIVAL_LINE, { exact: false })).toBeVisible();
    await expect(visitor.getByText('Rupture confirmée', { exact: false }).first()).toBeVisible();
  });

  test('6. an Ordre message reaches the chosen governorate only', async ({ browser }) => {
    const body = `Message de test de bout en bout, ${new Date().toISOString()}.`;
    const order = await (await browser.newContext()).newPage();
    await signInAs(order, 'Ordre des pharmaciens');
    await order.goto('/ordre/message');
    await order.getByLabel('Message', { exact: true }).fill(body);
    await order.getByRole('checkbox', { name: 'Sfax' }).check();
    await order.getByRole('button', { name: 'Envoyer le message' }).click();
    await expect(order).toHaveURL(/envoye=1/);

    const sfax = await (await browser.newContext()).newPage();
    await signInAs(sfax, 'Pharmacie (Sfax)');
    await sfax.goto('/pharmacie/alertes');
    await expect(sfax.getByText(body)).toBeVisible();

    const tunis = await (await browser.newContext()).newPage();
    await signInAs(tunis, 'Pharmacie (Tunis)');
    await tunis.goto('/pharmacie/alertes');
    await expect(tunis.getByRole('heading').first()).toBeVisible();
    await expect(tunis.getByText(body)).toHaveCount(0);
  });

  test('7. the note de situation prints on one A4 page', async ({ page }) => {
    await signInAs(page, 'Ministère de la Santé');
    await page.goto('/coordination/note');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.emulateMedia({ media: 'print' });
    const pdf = (await page.pdf({ preferCSSPageSize: true, printBackground: true })).toString('latin1');
    const pages = pdf.match(/\/Type\s*\/Page(?!s)/g)?.length ?? 0;
    expect(pages).toBe(1);
  });
});
