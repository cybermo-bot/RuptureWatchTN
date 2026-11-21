// Imports the CNAM VEI list into `molecules` and `medicines`.
//
//   npm run catalogue:import            dry run: parse, write data/reference files, print the report
//   npm run catalogue:import -- --apply also upsert into Supabase (service role, from .env.local)
//
// The raw file in data/raw/cnam/ is never edited. Source and licence: data/SOURCES.md.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import ExcelJS from 'exceljs';
import {
  EXPECTED_HEADER,
  parseRow,
  seededSample,
  type CatalogueMedicine,
  type SourceRow,
} from './lib/catalogue';
import { ROOT, serviceClient } from './lib/script-env';

const RAW_FILE = join(
  ROOT,
  'data/raw/cnam/LISTE DES MEDICAMENTS CLASSES EN VEI COUVERTS PAR LE REGIME DE BASE-06-11-2026.xlsx',
);
const SOURCE_ID = 'CNAM, liste VEI du régime de base, mise à jour du 06/11/2026';
const OUT_BASE = join(ROOT, 'data/reference/cnam-vei-2026-11-06');
const SAMPLE_SEED = 20261121;

function cellValue(value: ExcelJS.CellValue): unknown {
  if (value && typeof value === 'object') {
    if ('richText' in value) return value.richText.map((r) => r.text).join('');
    if ('result' in value) return value.result;
    if ('text' in value) return value.text;
  }
  return value;
}

async function readSource(): Promise<SourceRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(RAW_FILE);
  if (workbook.worksheets.length !== 1) {
    throw new Error(`Expected one worksheet, found ${workbook.worksheets.length}`);
  }
  const sheet = workbook.worksheets[0];
  const header = (sheet.getRow(1).values as ExcelJS.CellValue[]).slice(1).map((v) => String(cellValue(v)).trim());
  if (header.join('|') !== EXPECTED_HEADER.join('|')) {
    throw new Error(`Unexpected header: ${header.join(', ')}`);
  }
  const rows: SourceRow[] = [];
  for (let i = 2; i <= sheet.rowCount; i++) {
    const values = (sheet.getRow(i).values as ExcelJS.CellValue[]).slice(1).map(cellValue);
    if (values.every((v) => v === null || v === undefined || String(v).trim() === '')) continue;
    const entry: Record<string, unknown> = { line: i };
    EXPECTED_HEADER.forEach((name, j) => (entry[name] = values[j] ?? null));
    rows.push(entry as unknown as SourceRow);
  }
  return rows;
}

function csvField(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function apply(medicines: CatalogueMedicine[]) {
  const supabase = serviceClient();
  const moleculeNames = [...new Set(medicines.map((m) => m.molecule))].sort();

  for (let i = 0; i < moleculeNames.length; i += 500) {
    const batch = moleculeNames.slice(i, i + 500).map((name) => ({ name }));
    const { error } = await supabase.from('molecules').upsert(batch, { onConflict: 'name', ignoreDuplicates: true });
    if (error) throw new Error(`molecules upsert failed: ${error.message}`);
  }

  const ids = new Map<string, string>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('molecules').select('id, name').range(from, from + 999);
    if (error) throw new Error(`molecules read failed: ${error.message}`);
    for (const m of data) ids.set(m.name, m.id);
    if (data.length < 1000) break;
  }

  for (let i = 0; i < medicines.length; i += 500) {
    const batch = medicines.slice(i, i + 500).map((m) => {
      const moleculeId = ids.get(m.molecule);
      if (!moleculeId) throw new Error(`No molecule id for ${m.molecule}`);
      return {
        code_pct: m.code_pct,
        label: m.label,
        brand: m.brand,
        dci: m.dci,
        dosage: null,
        form: null,
        presentation: null,
        vei_category: m.vei_category,
        price_tnd: m.price_tnd,
        molecule_id: moleculeId,
        source: SOURCE_ID,
      };
    });
    const { error } = await supabase.from('medicines').upsert(batch, { onConflict: 'code_pct' });
    if (error) throw new Error(`medicines upsert failed: ${error.message}`);
  }

  const { count: medicineCount } = await supabase.from('medicines').select('*', { count: 'exact', head: true });
  const { count: moleculeCount } = await supabase.from('molecules').select('*', { count: 'exact', head: true });
  console.log(`\nApplied. Database now holds ${medicineCount} medicines and ${moleculeCount} molecules.`);
}

async function main() {
  const rows = await readSource();
  const accepted: { row: SourceRow; value: CatalogueMedicine }[] = [];
  const rejected: { row: SourceRow; reason: string }[] = [];
  const seenCodes = new Set<string>();

  for (const row of rows) {
    const result = parseRow(row);
    if (!result.ok) {
      rejected.push({ row, reason: result.reason });
    } else if (seenCodes.has(result.value.code_pct)) {
      rejected.push({ row, reason: `CODE_PCT en double (${result.value.code_pct})` });
    } else {
      seenCodes.add(result.value.code_pct);
      accepted.push({ row, value: result.value });
    }
  }

  const medicines = accepted.map((a) => a.value);
  const molecules = new Set(medicines.map((m) => m.molecule));
  const byCategory = medicines.reduce<Record<string, number>>((acc, m) => {
    acc[m.vei_category] = (acc[m.vei_category] ?? 0) + 1;
    return acc;
  }, {});

  mkdirSync(join(ROOT, 'data/reference'), { recursive: true });

  const header = ['code_pct', 'label', 'brand', 'dci', 'molecule', 'vei_category', 'price_tnd'] as const;
  const csv = [header.join(','), ...medicines.map((m) => header.map((h) => csvField(m[h])).join(','))].join('\n');
  writeFileSync(`${OUT_BASE}.csv`, `${csv}\n`, 'utf8');

  const sample = seededSample(accepted, 20, SAMPLE_SEED).sort((a, b) => a.row.line - b.row.line);
  const sampleMd = [
    `# Sample of the CNAM VEI import`,
    '',
    `20 rows drawn with a fixed seed (${SAMPLE_SEED}) by \`scripts/import-catalogue.ts\`. Left: the source row. Right: what is stored.`,
    '',
    '| Line | Source: CODE_PCT · NOM_COMMERCIAL · DCI · CATEGORIE · PRIX_PUBLIC | Stored: brand · molecule · category · price |',
    '| --- | --- | --- |',
    ...sample.map(
      ({ row, value }) =>
        `| ${row.line} | ${row.CODE_PCT} · ${String(row.NOM_COMMERCIAL).replace(/\|/g, '\\|')} · ${row.DCI} · ${row.CATEGORIE} · ${row.PRIX_PUBLIC} | ${value.brand} · ${value.molecule} · ${value.vei_category} · ${value.price_tnd.toFixed(3)} |`,
    ),
    '',
  ].join('\n');
  writeFileSync(`${OUT_BASE}.sample.md`, sampleMd, 'utf8');

  console.log('CNAM VEI import report');
  console.log(`  Source rows:        ${rows.length}`);
  console.log(`  Parsed:             ${medicines.length}`);
  console.log(`  Rejected:           ${rejected.length}`);
  for (const r of rejected) console.log(`    line ${r.row.line}: ${r.reason}`);
  console.log(`  Molecules (DCI):    ${molecules.size}`);
  console.log(`  By VEI category:    ${Object.entries(byCategory).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  console.log(`  Wrote ${OUT_BASE}.csv and .sample.md`);

  if (process.argv.includes('--apply')) await apply(medicines);
  else console.log('\nDry run. Add --apply to write to the database.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
