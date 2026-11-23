// Builds the Library's data file from the French public medicines database (BDPM).
//
//   npm run library:import              downloads the three files into data/raw/bdpm/, then builds
//   npm run library:import -- --offline builds from the files already in data/raw/bdpm/
//
// Writes data/reference/library-fr.json: for each CNAM molecule (data/reference/cnam-vei-*.csv),
// the active French products with exactly the same substances, and their French conditions of
// prescription. Prints the check on ten known products and the number of molecules matched:
// copy both into docs/reports/track-c.md, and the download date and hashes into data/SOURCES.md.
// Licence Ouverte (article L. 161-40-1 du code de la sécurité sociale): cite the BDPM and the date.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parseCsv } from '../lib/content/csv';
import type { LibraryFile } from '../lib/library/types';
import { decodeBdpm, matchMolecules, parseCompositions, parseConditions, parseProducts, runChecks } from './lib/library';
import { ROOT } from './lib/script-env';

const BASE = 'https://base-donnees-publique.medicaments.gouv.fr/download/file/';
const PAGE = 'https://base-donnees-publique.medicaments.gouv.fr/telechargement';
const FILES = ['CIS_bdpm.txt', 'CIS_COMPO_bdpm.txt', 'CIS_CPD_bdpm.txt'] as const;
const RAW = join(ROOT, 'data/raw/bdpm');
const OUT = join(ROOT, 'data/reference/library-fr.json');

async function download(file: string): Promise<void> {
  const res = await fetch(BASE + file, { headers: { 'User-Agent': 'RuptureWatchTN student prototype (AOTN TSYP 14)' } });
  if (!res.ok) throw new Error(`${file}: ${res.status} ${res.statusText}`);
  writeFileSync(join(RAW, file), Buffer.from(await res.arrayBuffer()));
}

function cnamMolecules(): string[] {
  const csv = readdirSync(join(ROOT, 'data/reference')).find((f) => /^cnam-vei-.*\.csv$/.test(f));
  if (!csv) throw new Error('No data/reference/cnam-vei-*.csv: run npm run catalogue:import first.');
  const { header, rows } = parseCsv(readFileSync(join(ROOT, 'data/reference', csv), 'utf8'));
  if (!header.includes('molecule')) throw new Error(`${csv} has no "molecule" column.`);
  return [...new Set(rows.map((r) => r.molecule).filter(Boolean))];
}

async function main() {
  mkdirSync(RAW, { recursive: true });
  const offline = process.argv.includes('--offline');
  const downloadedAt = new Date();
  if (!offline) {
    for (const f of FILES) {
      console.log(`Downloading ${BASE}${f} …`);
      await download(f);
    }
  }
  const raw = Object.fromEntries(
    FILES.map((f) => {
      const path = join(RAW, f);
      if (!existsSync(path)) throw new Error(`Missing ${relative(ROOT, path)}. Run without --offline to download it.`);
      return [f, readFileSync(path)];
    }),
  ) as Record<(typeof FILES)[number], Buffer>;

  const products = parseProducts(decodeBdpm(raw['CIS_bdpm.txt']));
  const compositions = parseCompositions(decodeBdpm(raw['CIS_COMPO_bdpm.txt']));
  const conditions = parseConditions(decodeBdpm(raw['CIS_CPD_bdpm.txt']));
  const molecules = cnamMolecules();
  const matched = matchMolecules(molecules, products, compositions, conditions);
  const results = runChecks(products, conditions);

  const file: LibraryFile = {
    source: {
      name: 'Base de données publique des médicaments (France)',
      page: PAGE,
      licence: 'Licence Ouverte (article L. 161-40-1 du code de la sécurité sociale)',
      files: FILES.map((f) => ({
        file: f,
        url: BASE + f,
        bytes: raw[f].length,
        sha256: createHash('sha256').update(raw[f]).digest('hex'),
      })),
      downloadedAt: (offline ? statSync(join(RAW, FILES[0])).mtime : downloadedAt).toISOString(),
    },
    generatedAt: new Date().toISOString(),
    check: { passed: results.every((r) => r.ok), results },
    counts: {
      cnamMolecules: molecules.length,
      matched: Object.keys(matched.molecules).length,
      unmatched: matched.unmatched.length,
      products: Object.values(matched.molecules).reduce((n, m) => n + m.products.length, 0),
    },
    ...matched,
  };
  writeFileSync(OUT, `${JSON.stringify(file)}\n`);

  console.log(`\n${products.size} French products, ${compositions.size} compositions, ${conditions.size} with conditions.`);
  console.log(`CNAM molecules: ${file.counts.cnamMolecules}, matched ${file.counts.matched}, unmatched ${file.counts.unmatched}.`);
  console.log(`French products kept: ${file.counts.products}. Wrote ${relative(ROOT, OUT)}.`);
  console.log('\nCheck on ten known products (expected → read):');
  for (const r of results) {
    console.log(`  ${r.ok ? 'OK ' : 'NO '} ${r.query.padEnd(20)} ${r.expected.padEnd(13)} → ${String(r.status).padEnd(13)} ${r.found ?? '(not found)'}`);
  }
  console.log(
    file.check.passed
      ? '\nAll ten agree: "no condition" is shown as "Sans ordonnance en France".'
      : '\nAt least one disagrees: the Library shows only "Sur ordonnance en France" and "Statut non déterminé".',
  );
  for (const f of file.source.files) console.log(`${f.file}: ${f.bytes} bytes, SHA-256 ${f.sha256}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
