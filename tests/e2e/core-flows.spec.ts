import { expect, test, type Page } from '@playwright/test';

// The main flows of the product, on a deployed site (E2E_BASE_URL). Every row comes from a demo
// account, whose organisation is simulated. What the tests leave is listed in tests/e2e/README.md.

const BASE = process.env.E2E_BASE_URL;

async function signInAs(page: Page, role: string) {
  await page.goto('/');
  await page.getByRole('button', { name: `Se connecter en tant que ${role}` }).click();
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
    const followed = page.locator('section[aria-labelledby="choix-suivis"] a').first();
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
    await signInAs(page, 'Coordination');
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

test.describe('patient request', () => {
  test('4. a patient request, a pharmacy answer, the pharmacy on the map', () => {
    test.skip(true, 'Waits for track B (the availability request) to be merged.');
  });
});
