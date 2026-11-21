// Applies supabase/migrations to the project database with the Supabase CLI.
//
//   npm run db:push
//
// Reads SUPABASE_DB_URL from .env.local and hands it to the CLI without a shell
// and without printing it.

import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { loadLocalEnv, need, ROOT } from './lib/script-env';

loadLocalEnv();
const dbUrl = need('SUPABASE_DB_URL');
const cli = join(ROOT, 'node_modules', 'supabase', 'dist', 'supabase.js');

const result = spawnSync(process.execPath, [cli, 'db', 'push', `--remote=${dbUrl}`, ...process.argv.slice(2)], {
  cwd: ROOT,
  stdio: 'inherit',
});
process.exit(result.status ?? 1);
