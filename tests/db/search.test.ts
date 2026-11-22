// search_medicines on the full CNAM catalogue (data/reference), in PGlite.
// "Type it the way you say it": brand, DCI, accents or not, half words, small misspellings.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { as, createTestDatabase } from './harness';

const CSV = join(__dirname, '..', '..', 'data', 'reference', 'cnam-vei-2026-11-06.csv');

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (c !== '\r') field += c;
  }
  const [header, ...body] = rows;
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i]])));
}

let db: PGlite;

beforeAll(async () => {
  db = await createTestDatabase();
  const medicines = parseCsv(readFileSync(CSV, 'utf8'));
  const molecules = [...new Set(medicines.map((m) => m.molecule))];
  await db.query(
    `insert into public.molecules (name) select unnest($1::text[])`,
    [molecules],
  );
  await db.query(
    `insert into public.medicines (code_pct, label, brand, dci, vei_category, price_tnd, molecule_id, source)
     select m.code_pct, m.label, m.brand, m.dci, m.vei_category, m.price_tnd::numeric, mol.id, 'test'
     from jsonb_to_recordset($1::jsonb) as m(code_pct text, label text, brand text, dci text, molecule text, vei_category text, price_tnd text)
     join public.molecules mol on mol.name = m.molecule`,
    [JSON.stringify(medicines)],
  );
}, 120_000);

type Hit = { brand: string; dci: string; molecule_name: string; label: string; score: number };

async function search(q: string): Promise<Hit[]> {
  const res = await as(db, { kind: 'anon' }, (tx) =>
    tx.query<Hit>('select brand, dci, molecule_name, label, score from public.search_medicines($1)', [q]),
  );
  return res.rows;
}

describe('search_medicines on the CNAM catalogue', () => {
  it('loaded the whole catalogue', async () => {
    const res = await db.query<{ n: number }>('select count(*)::int as n from public.medicines');
    expect(res.rows[0].n).toBe(3358);
  });

  it.each([
    ['brand', 'epitam'],
    ['brand in capitals', 'EPITAM'],
    ['DCI', 'levetiracetam'],
    ['DCI with French accents', 'lévétiracétam'],
    ['one-letter misspelling', 'levetiracetan'],
    ['half a word', 'levetir'],
  ])('finds EPITAM (levetiracetam) from its %s: "%s"', async (_kind, q) => {
    const hits = await search(q);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.length).toBeLessThanOrEqual(10);
    expect(hits.some((h) => h.brand === 'EPITAM' || h.molecule_name === 'LEVETIRACETAM')).toBe(true);
    if (q.toLowerCase().startsWith('epitam')) expect(hits[0].brand).toBe('EPITAM');
    else expect(hits[0].molecule_name).toBe('LEVETIRACETAM');
  });

  it.each([
    ['augmentin', 'AUGMENTIN'],
    ['augmantin', 'AUGMENTIN'],
    ['amoxicilline', 'AMOXICILLINE'],
    ['isotrétinoïne', 'ISOTRETINOINE'],
    ['metformine', 'METFORMINE'],
  ])('puts a sensible first result for "%s"', async (q, expected) => {
    const hits = await search(q);
    expect(hits.length).toBeGreaterThan(0);
    expect(`${hits[0].brand} ${hits[0].molecule_name}`).toContain(expected);
  });

  it('returns nothing for one letter or an empty query', async () => {
    expect(await search('a')).toEqual([]);
    expect(await search('')).toEqual([]);
    expect(await search('   ')).toEqual([]);
  });

  it('treats % and _ as plain characters', async () => {
    const hits = await search('%%');
    expect(hits).toEqual([]);
  });
});

describe('search_molecules on the full catalogue: a DCI leads to its molecule first', () => {
  const molecules = (q: string) =>
    as(db, { kind: 'anon' }, (tx) =>
      tx.query<{ name: string; medicines: number }>('select name, medicines from public.search_molecules($1)', [q]),
    ).then((r) => r.rows);

  it.each(['levetiracetam', 'LEVETIRACETAM', 'lévétiracétam', 'levetiracetan', 'levetir'])(
    '"%s" gives LEVETIRACETAM first, with its 15 presentations',
    async (q) => {
      const rows = await molecules(q);
      expect(rows[0]).toEqual({ name: 'LEVETIRACETAM', medicines: 15 });
    },
  );

  it.each(['carbamazepine', 'lamotrigine', 'levothyroxine'])('"%s" gives its molecule first', async (q) => {
    expect((await molecules(q))[0]?.name).toBe(q.toUpperCase());
  });

  it('"amoxicilline" gives the molecule and its combinations', async () => {
    const names = (await molecules('amoxicilline')).map((r) => r.name);
    expect(names[0]).toBe('AMOXICILLINE');
    expect(names).toContain('AMOXICILLINE + ACIDE CLAVULANIQUE');
  });

  it.each(['epitam', 'augmentin'])('a brand name ("%s") gives no molecule, so its brands lead', async (q) => {
    expect(await molecules(q)).toEqual([]);
  });
});
