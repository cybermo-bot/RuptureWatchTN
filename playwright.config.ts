import { defineConfig, devices } from '@playwright/test';

// End-to-end tests (track D), run against a deployed site, never in CI by default:
//   E2E_BASE_URL=https://<preview>.vercel.app npm run test:e2e
// They act as the demo accounts, whose organisations are simulated, so every row they create is
// marked simulated. What each test leaves behind is listed in tests/e2e/README.md: the team lead
// removes it with `npm run verify:clean -- --since <time> --apply`.

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL,
    locale: 'fr-FR',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
});
