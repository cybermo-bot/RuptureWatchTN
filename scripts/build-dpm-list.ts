// npm run dpm:build
// Builds data/reference/dpm-dci.csv and dpm-dci.json from the DPM list as copied
// (data/reference/dpm-dci.raw.txt, https://dpm.tn/index.php/medicaments-a-usage-humain/liste-des-dci)
// and the CNAM VEI list (data/reference/cnam-vei-*.csv). Names only: they are never added to
// `molecules`, so they cannot be reported or followed.
//
// in_cnam_vei = yes when the name, salt words removed (lib/dpm/key.ts), is a CNAM molecule or a
// component of a CNAM combination. Excipients, homeopathic stocks and old registrations stay:
// they are part of the source. Prints counts and the names whose flag changed against the
// previous file, for review.

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseCsv } from '../lib/content/csv';
import { moleculeKeys, plain, substanceKey } from '../lib/dpm/key';

const REF = join(__dirname, '..', 'data', 'reference');

function csvField(s: string): string {
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function main() {
  const raw = readFileSync(join(REF, 'dpm-dci.raw.txt'), 'utf8').split(/\r?\n/);
  const names = new Map<string, string>(); // plain form -> name as listed (first spelling kept)
  for (const line of raw) {
    const name = line.replace(/\s+/g, ' ').trim();
    if (name && !names.has(plain(name))) names.set(plain(name), name);
  }

  const cnamFile = readdirSync(REF).filter((f) => /^cnam-vei-\d{4}-\d{2}-\d{2}\.csv$/.test(f)).sort().at(-1);
  if (!cnamFile) throw new Error('No data/reference/cnam-vei-*.csv');
  const cnam = parseCsv(readFileSync(join(REF, cnamFile), 'utf8'));
  const cnamKeys = new Set<string>();
  for (const row of cnam.rows) for (const k of moleculeKeys(row.molecule ?? '')) cnamKeys.add(k);

  const previous = new Map<string, string>();
  try {
    const old = parseCsv(readFileSync(join(REF, 'dpm-dci.csv'), 'utf8'));
    for (const row of old.rows) previous.set(plain(row.dci), row.in_cnam_vei);
  } catch {
    // first build
  }

  const rows = [...names.values()]
    .sort((a, b) => a.localeCompare(b, 'fr'))
    .map((name) => ({ name, inCnam: cnamKeys.has(substanceKey(name)) }));
  writeFileSync(join(REF, 'dpm-dci.csv'), ['dci,in_cnam_vei', ...rows.map((r) => `${csvField(r.name)},${r.inCnam ? 'yes' : 'no'}`)].join('\n') + '\n');
  writeFileSync(join(REF, 'dpm-dci.json'), JSON.stringify(rows.map((r) => [r.name, r.inCnam ? 1 : 0])) + '\n');

  const yes = rows.filter((r) => r.inCnam).length;
  console.log(`${raw.filter((l) => l.trim()).length} lines, ${rows.length} names, ${yes} in the CNAM VEI list (${cnamFile})`);
  const changed = rows.filter((r) => previous.has(plain(r.name)) && previous.get(plain(r.name)) !== (r.inCnam ? 'yes' : 'no'));
  console.log(`${changed.length} flags changed against the previous file:`);
  for (const r of changed) console.log(`  ${r.inCnam ? 'no  -> yes' : 'yes -> no '}  ${r.name}`);
}

main();
