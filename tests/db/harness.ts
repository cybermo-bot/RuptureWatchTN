// Runs the real migrations in PGlite (Postgres compiled to WebAssembly) with a small
// Supabase shim, so access rules are tested on every push without a live project.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite, type Transaction } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { unaccent } from '@electric-sql/pglite/contrib/unaccent';

const ROOT = join(__dirname, '..', '..');
const MIGRATIONS = join(ROOT, 'supabase', 'migrations');

export async function createTestDatabase(): Promise<PGlite> {
  const db = await PGlite.create({ extensions: { pg_trgm, unaccent } });
  await db.exec(readFileSync(join(__dirname, 'supabase-shim.sql'), 'utf8'));
  for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort()) {
    try {
      await db.exec(readFileSync(join(MIGRATIONS, file), 'utf8'));
    } catch (error) {
      throw new Error(`Migration ${file} failed: ${(error as Error).message}`);
    }
  }
  return db;
}

type Caller =
  | { kind: 'user'; userId: string }
  | { kind: 'anon' }
  | { kind: 'service' };

/** Runs fn as a Supabase API caller would: role switched, JWT claims set, rolled back after. */
export async function as<T>(db: PGlite, caller: Caller, fn: (tx: Transaction) => Promise<T>): Promise<T> {
  let result: T;
  const rollback = new Error('rollback');
  try {
    await db.transaction(async (tx) => {
      const role = caller.kind === 'user' ? 'authenticated' : caller.kind === 'anon' ? 'anon' : 'service_role';
      const claims =
        caller.kind === 'user'
          ? { sub: caller.userId, role: 'authenticated' }
          : { role: caller.kind === 'anon' ? 'anon' : 'service_role' };
      await tx.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify(claims)]);
      await tx.query(`set local role ${role}`);
      result = await fn(tx);
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }
  return result!;
}

/** Same as `as`, but keeps the changes. */
export async function asCommitted<T>(db: PGlite, caller: Caller, fn: (tx: Transaction) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    const role = caller.kind === 'user' ? 'authenticated' : caller.kind === 'anon' ? 'anon' : 'service_role';
    const claims =
      caller.kind === 'user' ? { sub: caller.userId, role: 'authenticated' } : { role: caller.kind === 'anon' ? 'anon' : 'service_role' };
    await tx.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify(claims)]);
    await tx.query(`set local role ${role}`);
    return fn(tx);
  });
}
