// Pilot-2 item 3: « Un problème ? Une idée ? » on the real migrations. Feedback goes in only
// through submit_feedback; nobody but the service role reads it; no visitor identifier is kept;
// the path is a route pattern; 5 messages per hour per organisation, 200 per hour for all
// anonymous visitors together.

import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { as, asCommitted, createTestDatabase } from './harness';

const id = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;
const ORG = { tester: id(0xa1), demo: id(0xa2), other: id(0xa3) };
type Key = keyof typeof ORG;
const USER = Object.fromEntries(Object.entries(ORG).map(([k, v]) => [k, v.replace(/^0{8}/, '11111111')])) as Record<Key, string>;
const user = (k: Key) => ({ kind: 'user' as const, userId: USER[k] });
const anon = { kind: 'anon' as const };
const service = { kind: 'service' as const };

let db: PGlite;

async function errorOf(p: Promise<unknown>): Promise<{ message: string; code?: string } | null> {
  try {
    await p;
    return null;
  } catch (error) {
    return error as { message: string; code?: string };
  }
}

const submit = (caller: typeof anon | ReturnType<typeof user>, path: string, message: string, rating: string | null = null) =>
  asCommitted(db, caller, (tx) =>
    tx.query<{ id: string }>(`select public.submit_feedback($1, $2::public.feedback_rating, $3) as id`, [path, rating, message]),
  );

const rows = () =>
  as(db, service, async (tx) =>
    (
      await tx.query<{ path: string; organisation_id: string | null; rating: string | null; message: string; origin: string }>(
        `select path, organisation_id, rating, message, origin from public.feedback order by created_at, id`,
      )
    ).rows,
  );

beforeAll(async () => {
  db = await createTestDatabase({ defaultGrants: false });
  for (const [k, origin] of [['tester', 'tester'], ['demo', 'simulated'], ['other', 'tester']] as const) {
    await db.query(
      `insert into public.organisations (id, type, display_name, governorate_code, origin) values ($1, 'pharmacy', $2, 'TN-11', $3)`,
      [ORG[k], `Pharmacie ${k}`, origin],
    );
    await db.query(`insert into auth.users (id, last_sign_in_at) values ($1, now())`, [USER[k]]);
    await db.query(`insert into public.profiles (user_id, organisation_id, role) values ($1, $2, 'pharmacist')`, [USER[k], ORG[k]]);
  }
});

afterAll(async () => {
  await db.close();
});

describe('submit_feedback', () => {
  it('saves an anonymous message with no identifier, origin tester', async () => {
    await submit(anon, '/medicaments/[id]', '  La recherche ne trouve pas mon médicament.  ', 'unclear');
    const saved = (await rows()).at(-1);
    expect(saved).toEqual({
      path: '/medicaments/[id]',
      organisation_id: null,
      rating: 'unclear',
      message: 'La recherche ne trouve pas mon médicament.',
      origin: 'tester',
    });
  });

  it('keeps the organisation and its own origin when signed in', async () => {
    await submit(user('tester'), '/pharmacie/plus', 'Facile à utiliser.', 'easy');
    await submit(user('demo'), '/pharmacie', 'Un essai depuis la démo.');
    const [demo, tester] = [(await rows()).at(-1), (await rows()).at(-2)];
    expect(tester).toMatchObject({ organisation_id: ORG.tester, origin: 'tester', rating: 'easy' });
    expect(demo).toMatchObject({ organisation_id: ORG.demo, origin: 'simulated', rating: null });
  });

  it('refuses an empty message, a message over 1000 characters, and a path with an id or a query', async () => {
    for (const [path, message] of [
      ['/medicaments', '   '],
      ['/medicaments', 'x'.repeat(1001)],
      ['/medicaments/75077225-938d-4278-9e21-51de44d88a9f', 'ok'],
      ['/medicaments?q=doliprane', 'ok'],
      ['/rejoindre/abc123', 'ok'],
      ['medicaments', 'ok'],
    ]) {
      expect((await errorOf(submit(anon, path, message)))?.code, `${path} ${message.length}`).toBe('22023');
    }
    expect((await errorOf(submit(anon, '/', 'x'.repeat(1000))))).toBeNull();
  });

  it('allows 5 messages per hour per organisation, then refuses (RW429), without touching the others', async () => {
    for (let i = 0; i < 5; i++) expect(await errorOf(submit(user('other'), '/pharmacie', `Message ${i}`))).toBeNull();
    expect((await errorOf(submit(user('other'), '/pharmacie', 'Un de trop')))?.code).toBe('RW429');
    expect(await errorOf(submit(user('tester'), '/pharmacie', 'Toujours possible'))).toBeNull();
    // An hour later, the organisation may write again.
    await db.query(`update public.feedback set created_at = now() - interval '61 minutes' where organisation_id = $1`, [ORG.other]);
    expect(await errorOf(submit(user('other'), '/pharmacie', 'De nouveau'))).toBeNull();
  });

  it('caps all anonymous visitors together at 200 messages per hour', async () => {
    const anonymous = await as(db, service, async (tx) =>
      Number((await tx.query<{ n: string }>(`select count(*) as n from public.feedback where organisation_id is null`)).rows[0].n),
    );
    await db.query(
      `insert into public.feedback (path, message, origin) select '/', 'Message ' || g, 'tester' from generate_series(1, $1::int) g`,
      [200 - anonymous],
    );
    expect((await errorOf(submit(anon, '/', 'Le 201e')))?.code).toBe('RW429');
    // Signed-in pharmacies are not counted in the anonymous cap.
    expect(await errorOf(submit(user('demo'), '/', 'Pharmacie, pas anonyme'))).toBeNull();
  });
});

describe('the feedback table', () => {
  it('cannot be read, written or changed directly by anon or a signed-in user', async () => {
    for (const caller of [anon, user('tester')]) {
      for (const sql of [
        `select * from public.feedback`,
        `insert into public.feedback (path, message, origin) values ('/', 'direct', 'tester')`,
        `update public.feedback set message = 'changed'`,
        `delete from public.feedback`,
      ]) {
        expect((await errorOf(as(db, caller, (tx) => tx.query(sql))))?.message, sql).toMatch(/permission denied/);
      }
    }
  });

  it('is read by the service role (the lead, in the dashboard)', async () => {
    expect((await rows()).length).toBeGreaterThan(0);
  });
});
