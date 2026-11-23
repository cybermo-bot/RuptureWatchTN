// The numbers the report and the video can cite, each computed from the repository's files.
// Prints Markdown; docs/reports/figures.md is its output. Run: npm run -s figures > docs/reports/figures.md
// Reads files only (no database, no network), and runs the test suite once to count its results.

import { execSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { parseCsv } from '../lib/content/csv';
import { episodeStats, readEpisodes } from '../lib/content/episodes';
import { DEMO_ROLES } from '../lib/demo/roles';
import { DEFAULT_PARAMS } from '../lib/signal/params';

const ROOT = process.cwd();
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');
const TICK = '`';

function walk(dir: string, match: (f: string) => boolean): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p, match));
    else if (match(e)) out.push(p);
  }
  return out;
}

const lines: string[] = [];
const section = (title: string, command: string, note?: string) =>
  lines.push('', `## ${title}`, '', `Command: ${TICK}${command}${TICK}${note ? ` (${note})` : ''}`, '');
const row = (label: string, value: string | number) => lines.push(`- ${label}: **${value}**`);

// Catalogue
const cnamFile = readdirSync(join(ROOT, 'data/reference'))
  .filter((f) => /^cnam-vei-.*\.csv$/.test(f))
  .sort()
  .at(-1)!;
const cnam = parseCsv(read(`data/reference/${cnamFile}`)).rows;
section('National catalogue (CNAM list of reimbursed medicines, classified VEI)', 'npm run figures', `reads data/reference/${cnamFile}`);
row('Medicines (rows, one per CNAM code)', cnam.length);
row('Molecules (distinct)', new Set(cnam.map((r) => r.molecule)).size);
const byCategory = cnam.reduce<Record<string, number>>((acc, r) => {
  acc[r.vei_category] = (acc[r.vei_category] ?? 0) + 1;
  return acc;
}, {});
for (const [cat, n] of Object.entries(byCategory).sort()) row(`Medicines in category ${cat}`, n);

// DPM list
const dpm = JSON.parse(read('data/reference/dpm-dci.json')) as [string, number][];
section('DPM list of substances registered in Tunisia (names only)', 'npm run figures', 'reads data/reference/dpm-dci.json, built by npm run dpm:build');
row('Names in the list (deduplicated)', dpm.length);
row('Names matching a CNAM VEI molecule (followed by RuptureWatch)', dpm.filter(([, f]) => f === 1).length);
row('Names outside the CNAM VEI list (answered "registered, not followed")', dpm.filter(([, f]) => f === 0).length);

// Past episodes
const episodes = readEpisodes(ROOT);
const stats = episodeStats(episodes.episodes);
section('Past shortages in Tunisia (data/reference/episodes.csv)', 'npm run figures', 'same computation as the /retour page');
row('Episodes documented', stats.episodes);
row('Episodes with a foreign notice before the first Tunisian report', stats.earlier);
row('Episodes missed (no foreign notice before)', stats.missed);
row('Distinct foreign notices behind the earlier episodes', stats.earlierNotices);
row('Median lead of the foreign notice, for those episodes (days)', stats.medianLeadDays ?? 'none');
row('Rows set aside by the parser', episodes.rejected.length);

// Foreign notices
const notices = parseCsv(read('data/reference/foreign_notices.csv')).rows;
section('Foreign notices (data/reference/foreign_notices.csv)', 'npm run figures');
row('Notices', notices.length);
row('Regulators', [...new Set(notices.map((n) => n.source))].sort().join(', '));

// Warning logic
section('Warning thresholds (lib/signal/params.ts, design parameters)', 'npm run figures');
for (const [k, v] of Object.entries(DEFAULT_PARAMS)) row(`${TICK}${k}${TICK}`, v);

// Tests
const report = join(tmpdir(), `rw-figures-${process.pid}.json`);
execSync(`npx vitest run --reporter=json --outputFile=${report}`, { cwd: ROOT, stdio: 'ignore' });
const run = JSON.parse(readFileSync(report, 'utf8')) as {
  numTotalTests: number;
  numPassedTests: number;
  testResults: { name: string; assertionResults: unknown[] }[];
};
const inFiles = (test: (name: string) => boolean) =>
  run.testResults.filter((r) => test(r.name.split('\\').join('/'))).reduce((n, r) => n + r.assertionResults.length, 0);
section('Automated tests (unit and database, Vitest)', 'npm test', 'counted by npm run figures, which runs the suite once');
row('Tests', run.numTotalTests);
row('Passing', run.numPassedTests);
row('Test files', run.testResults.length);
row('Tests of the warning logic (tests/signal.test.ts)', inFiles((n) => n.endsWith('tests/signal.test.ts')));
row('Database tests on the real migrations (tests/db/)', inFiles((n) => n.includes('/tests/db/')));

// Pages and roles
const pages = walk(join(ROOT, 'app'), (f) => f === 'page.tsx')
  .map((p) => relative(join(ROOT, 'app'), p).split('\\').join('/'))
  .filter((p) => !p.includes('/dev/'));
section('Pages and roles', 'npm run figures', 'page.tsx files under app/, development pages excluded');
row('Pages (routes)', pages.length);
row('Public pages (no sign-in)', pages.filter((p) => !p.includes('(espace)')).length);
row('Signed-in pages (professional spaces)', pages.filter((p) => p.includes('(espace)')).length);
row('Demo roles, one click, no password', DEMO_ROLES.length);
row('Database migrations', readdirSync(join(ROOT, 'supabase/migrations')).filter((f) => f.endsWith('.sql')).length);
const versions = walk(join(ROOT, 'supabase/migrations'), (f) => f.endsWith('.sql')).flatMap((f) =>
  [...readFileSync(f, 'utf8').matchAll(/schema_version\s*=\s*(\d+)/g)].map((m) => Number(m[1])),
);
row('Schema version', Math.max(...versions));

console.log(
  [
    '# Figures',
    '',
    `Numbers the report and the video can cite. Each one is computed from the repository by ${TICK}npm run figures${TICK} (${TICK}scripts/figures.ts${TICK}), which prints this file; nothing here is typed by hand. Regenerate it after any data change: ${TICK}npm run -s figures > docs/reports/figures.md${TICK}.`,
    ...lines,
    '',
  ].join('\n'),
);
