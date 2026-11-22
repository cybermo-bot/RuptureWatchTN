// Loads data/reference/foreign_notices.csv into foreign_notices, then recomputes the molecules
// it touched.
//
//   npm run notices:import              dry run: lists what would be loaded and every row that does not match
//   npm run notices:import -- --apply   writes, then recomputes the affected molecules
//
// - molecule_dci must equal a molecule name of the catalogue exactly (molecules.name). Rows
//   that do not match are listed and never loaded: fix the file, never the match.
// - Every row loaded has origin official_source: these are real notices from real regulators,
//   each with its link.
// - A row already in the table (same molecule, source, date and link) is skipped, so the script
//   can be run again after the file grows.
// - Recompute goes through lib/signals (evaluate), like every other path. Gate one applies:
//   notices alone never raise a molecule above "sous surveillance".

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { noticeKey, parseNotices, publishedAt } from '../lib/content/notices';
import { recomputeSignal } from '../lib/signals/recompute';
import { supabaseSignalStore } from '../lib/signals/store';
import { ROOT, serviceClient } from './lib/script-env';

const FILE = join(ROOT, 'data', 'reference', 'foreign_notices.csv');
const PAGE = 1000;

async function main() {
  const apply = process.argv.includes('--apply');
  if (!existsSync(FILE)) {
    console.log(`No file at data/reference/foreign_notices.csv. Nothing to import.`);
    return;
  }
  const file = parseNotices(readFileSync(FILE, 'utf8'));
  if (file.missingColumns.length) {
    console.error(`foreign_notices.csv is missing columns: ${file.missingColumns.join(', ')}. Nothing imported.`);
    process.exit(1);
  }
  for (const r of file.rejected) console.log(`  line ${r.line}: rejected, ${r.reason}`);

  const supabase = serviceClient();
  const molecules = new Map<string, string>();
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase.from('molecules').select('id, name').order('name').range(offset, offset + PAGE - 1);
    if (error) throw new Error(`molecules: ${error.message}`);
    for (const m of data ?? []) molecules.set(m.name as string, m.id as string);
    if (!data || data.length < PAGE) break;
  }

  const unmatched = file.rows.filter((r) => !molecules.has(r.moleculeDci));
  const matched = file.rows.filter((r) => molecules.has(r.moleculeDci));

  const existing = new Set<string>();
  const ids = [...new Set(matched.map((r) => molecules.get(r.moleculeDci)!))];
  if (ids.length) {
    const { data, error } = await supabase.from('foreign_notices').select('molecule_id, source, published_at, url').in('molecule_id', ids);
    if (error) throw new Error(`foreign_notices: ${error.message}`);
    for (const n of data ?? []) existing.add(noticeKey(n.molecule_id as string, n.source as string, n.published_at as string, n.url as string));
  }
  const toInsert = matched
    .map((r) => ({
      molecule_id: molecules.get(r.moleculeDci)!,
      source: r.source,
      status: r.status,
      published_at: publishedAt(r.publishedDate),
      url: r.url,
      origin: 'official_source' as const,
    }))
    .filter((n) => !existing.has(noticeKey(n.molecule_id, n.source, n.published_at, n.url)));

  console.log(`foreign_notices.csv: ${file.rows.length + file.rejected.length} rows`);
  console.log(`  valid: ${file.rows.length}, rejected: ${file.rejected.length}`);
  console.log(`  matched to a molecule: ${matched.length}, already loaded: ${matched.length - toInsert.length}, to load: ${toInsert.length}`);
  if (unmatched.length) {
    console.log(`  NOT matched (molecule_dci must equal a catalogue molecule name exactly):`);
    for (const r of unmatched) console.log(`    line ${r.line}: "${r.moleculeDci}" (${r.source}, ${r.publishedDate})`);
  }
  if (!apply) {
    console.log('Dry run. Add --apply to load and recompute.');
    return;
  }

  if (toInsert.length) {
    const { error } = await supabase.from('foreign_notices').insert(toInsert);
    if (error) throw new Error(`insert: ${error.message}`);
  }
  const affected = [...new Set(toInsert.map((n) => n.molecule_id))];
  const store = supabaseSignalStore(supabase);
  const now = new Date();
  for (const id of affected) {
    const result = await recomputeSignal(store, id, now);
    console.log(`  recomputed ${id}: ${result.previous} -> ${result.evaluation.level} (${result.evaluation.rule})`);
  }
  console.log(`Loaded ${toInsert.length} notices, recomputed ${affected.length} molecules.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
