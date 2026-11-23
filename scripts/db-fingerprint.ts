// npm run db:fingerprint -- [--out file.json] [--compare file.json]
// A fingerprint of every public table on the live project: row count and a SHA-256 of all
// rows, sorted. Used to check that demo:clear leaves the database exactly as it found it:
// fingerprint, demo:shortage, demo:clear, fingerprint again and compare. Prints counts and
// hashes only, never row contents.

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { serviceClient } from './lib/script-env';

/** Every table created in supabase/migrations. A new table must be added here. */
const TABLES = [
  'alerts',
  'availability_answers',
  'availability_requests',
  'followed_molecules',
  'foreign_notices',
  'governorates',
  'medicines',
  'molecules',
  'organisations',
  'profiles',
  'reports',
  'signal_events',
  'signals',
  'system_meta',
  'wa_inbound',
];

type Fingerprint = Record<string, { rows: number; sha256: string }>;

async function fingerprint(): Promise<Fingerprint> {
  const client = serviceClient();
  const out: Fingerprint = {};
  for (const table of TABLES) {
    const rows: string[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await client.from(table).select('*').range(from, from + 999);
      if (error) throw new Error(`${table}: ${error.message}`);
      rows.push(...(data ?? []).map((r) => JSON.stringify(r, Object.keys(r).sort())));
      if (!data || data.length < 1000) break;
    }
    rows.sort();
    out[table] = { rows: rows.length, sha256: createHash('sha256').update(rows.join('\n')).digest('hex') };
  }
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const outFile = args.includes('--out') ? args[args.indexOf('--out') + 1] : null;
  const compareFile = args.includes('--compare') ? args[args.indexOf('--compare') + 1] : null;
  const now = await fingerprint();
  for (const [t, f] of Object.entries(now)) console.log(`${t.padEnd(22)} ${String(f.rows).padStart(6)}  ${f.sha256.slice(0, 16)}`);
  if (outFile) writeFileSync(outFile, JSON.stringify(now, null, 2));
  if (compareFile) {
    const before = JSON.parse(readFileSync(compareFile, 'utf8')) as Fingerprint;
    const diff = TABLES.filter((t) => before[t]?.sha256 !== now[t].sha256);
    if (diff.length) {
      console.error(`Different from ${compareFile}: ${diff.map((t) => `${t} (${before[t]?.rows ?? '?'} -> ${now[t].rows})`).join(', ')}`);
      process.exit(1);
    }
    console.log(`Identical to ${compareFile}: every table, every row.`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
