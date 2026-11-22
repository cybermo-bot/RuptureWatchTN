import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Live checks against the real Supabase project. Needs .env.local. Run with `npm run test:live`.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
      'server-only': fileURLToPath(new URL('./tests/stubs/server-only.ts', import.meta.url)),
    },
  },
  test: { include: ['tests/live/**/*.test.ts'], environment: 'node', testTimeout: 60_000, fileParallelism: false },
});
