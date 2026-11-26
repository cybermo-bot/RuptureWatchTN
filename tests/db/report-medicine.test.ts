// Pilot-3 item 1 on the real migrations: a pharmacy may name the product it reports, only a
// presentation of the reported molecule, and may still report without one.

import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { as, createTestDatabase } from './harness';

const id = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;

const MOL = id(0x100);
const OTHER_MOL = id(0x101);
const SYRUP = id(0x200); // a presentation of MOL
const TABLET = id(0x201); // a presentation of MOL
const FOREIGN = id(0x202); // a presentation of OTHER_MOL
const ORG = id(0xa1);
const USER = id(0x1a1);
const pharmacist = { kind: 'user' as const, userId: USER };

let db: PGlite;

beforeAll(async () => {
  db = await createTestDatabase();
  await db.query(`insert into public.molecules (id, name) values ($1, 'LEVETIRACETAM'), ($2, 'AMOXICILLINE')`, [MOL, OTHER_MOL]);
  await db.query(
    `insert into public.medicines (id, code_pct, label, brand, dci, molecule_id, source) values
       ($1, '900001', 'EPITAM 100MG/ML SOL BUV FL 300ML', 'EPITAM', 'LEVETIRACETAM', $4, 'test'),
       ($2, '900002', 'EPITAM 500MG COMP. PELL. BT 30', 'EPITAM', 'LEVETIRACETAM', $4, 'test'),
       ($3, '900003', 'AMOXIL 1G COMP. BT 12', 'AMOXIL', 'AMOXICILLINE', $5, 'test')`,
    [SYRUP, TABLET, FOREIGN, MOL, OTHER_MOL],
  );
  await db.query(
    `insert into public.organisations (id, type, display_name, governorate_code, origin) values ($1, 'pharmacy', 'Pharmacie test 1', 'TN-11', 'tester')`,
    [ORG],
  );
  await db.query(`insert into auth.users (id) values ($1)`, [USER]);
  await db.query(`insert into public.profiles (user_id, organisation_id, role) values ($1, $2, 'pharmacist')`, [USER, ORG]);
}, 120_000);

const insert = (medicineId: string | null, moleculeId = MOL) =>
  as(db, pharmacist, (tx) =>
    tx.query<{ medicine_id: string | null }>(
      `insert into public.reports (organisation_id, governorate_code, molecule_id, medicine_id, kind, ordered_at, origin)
       values ($1, 'TN-11', $2, $3, 'not_delivered', now() - interval '4 days', 'tester') returning medicine_id`,
      [ORG, moleculeId, medicineId],
    ),
  );

describe('reports: which product', () => {
  it('stores the presentation a pharmacy chose for the molecule', async () => {
    const result = await insert(SYRUP);
    expect(result.rows[0]?.medicine_id).toBe(SYRUP);
  });

  it('still accepts a report without a product (« Plusieurs ou je ne sais pas », WhatsApp)', async () => {
    const result = await insert(null);
    expect(result.rows[0]?.medicine_id).toBeNull();
  });

  it('refuses a presentation of another molecule', async () => {
    await expect(insert(FOREIGN)).rejects.toThrow(/row-level security/);
    await expect(insert(TABLET, OTHER_MOL)).rejects.toThrow(/row-level security/);
  });

  it('keeps the other insert rules: never for another pharmacy', async () => {
    await expect(
      as(db, pharmacist, (tx) =>
        tx.query(
          `insert into public.reports (organisation_id, governorate_code, molecule_id, medicine_id, kind, ordered_at, origin)
           values ($1, 'TN-11', $2, $3, 'not_delivered', now() - interval '4 days', 'tester')`,
          [id(0xa9), MOL, SYRUP],
        ),
      ),
    ).rejects.toThrow();
  });
});
